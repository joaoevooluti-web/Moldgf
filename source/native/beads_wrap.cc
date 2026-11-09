// Beads (Mutable Instruments, MIT, (c) Emilie Gillet) -> WebAssembly.
// Wrapper em C ABI em volta do beads::Processor / beads::Synth ORIGINAIS do firmware.
//  - até kN instâncias independentes (cada uma com seus buffers de delay/reverb);
//  - o JS entrega blocos de 32 amostras; a conversão de taxa (mídias de 24 kHz e 32 kHz) é feita aqui;
//  - as leis dos knobs e as escalas de CV replicam cv_reader.* e settings.cc do firmware.
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <algorithm>

#include "beads/dsp/processor.h"
#include "beads/dsp/synth.h"
#include "stmlib/utils/gate_flags.h"

using namespace beads;
using namespace stmlib;

namespace {

const int kN = 2;
const int kHostMax = 128;
const int kChunk = 32;
const int kQ = 4096;
const int kQM = kQ - 1;

// ---------------------------------------------------------------------------
// Filas e resampler fracionário em fluxo (sinc janelado)
struct Frames {
  float l[kQ], r[kQ];
  uint8_t g[kQ], f[kQ];
  int64_t rd, wr;
  void Clear() { rd = wr = 0; }
  int Size() const { return int(wr - rd); }
  void Push(float a, float b, uint8_t gg, uint8_t ff) {
    if (Size() >= kQ - 1) ++rd;  // estouro: descarta o mais antigo
    int k = int(wr & kQM);
    l[k] = a; r[k] = b; g[k] = gg; f[k] = ff;
    ++wr;
  }
};

struct Resampler {
  static const int kHalf = 12;
  static const int kRes = 64;
  float kern[2 * kHalf * kRes + 2];
  double step, pos;
  float l[kQ], r[kQ];
  uint8_t gf[kQ], ff[kQ];
  int64_t wn;
  bool bypass;

  void Init(double in_rate, double out_rate) {
    bypass = fabs(in_rate - out_rate) < 0.5;
    step = in_rate / out_rate;
    pos = 0.0;
    wn = 0;
    memset(l, 0, sizeof(l)); memset(r, 0, sizeof(r));
    memset(gf, 0, sizeof(gf)); memset(ff, 0, sizeof(ff));
    const double c = 0.5 * std::min(1.0, 1.0 / step) * 0.97;
    for (int j = 0; j < 2 * kHalf * kRes + 2; ++j) {
      double d = double(j) / kRes - kHalf;
      double x = 2.0 * c * d;
      double sinc = fabs(x) < 1e-9 ? 1.0 : sin(M_PI * x) / (M_PI * x);
      double win = fabs(d) >= kHalf ? 0.0 : 0.5 * (1.0 + cos(M_PI * d / kHalf));
      kern[j] = float(2.0 * c * sinc * win);
    }
  }
  void Push(float a, float b, uint8_t g, uint8_t f) {
    int k = int(wn & kQM);
    l[k] = a; r[k] = b; gf[k] = g; ff[k] = f;
    ++wn;
  }
  bool Ready() const { return int64_t(floor(pos)) + kHalf < wn; }
  void Pull(float* a, float* b, uint8_t* g, uint8_t* f) {
    int64_t i0 = int64_t(floor(pos));
    double fr = pos - double(i0);
    float sl = 0.0f, sr = 0.0f, ws = 0.0f;
    for (int t = -kHalf + 1; t <= kHalf; ++t) {
      double x = (double(t) - fr + kHalf) * kRes;
      int j = int(x);
      float w0 = float(x - j);
      float w = kern[j] * (1.0f - w0) + kern[j + 1] * w0;
      int k = int((i0 + t) & kQM);
      sl += w * l[k]; sr += w * r[k]; ws += w;
    }
    if (fabsf(ws) < 1e-6f) ws = 1.0f;
    *a = sl / ws; *b = sr / ws;
    int k = int(i0 & kQM);
    *g = gf[k]; *f = ff[k];
    pos += step;
  }
};

// ---------------------------------------------------------------------------
// Leis dos knobs (cv_reader.h) e escalas de CV (settings.cc)
inline float Attenuverter(float raw) {
  float v = raw - 0.5f;
  return (2.0f / 0.47f) * v * std::max(fabsf(v) - 0.03f, 0.0f);
}

inline float Detune(float raw) {
  static const float intervals[8] = { 0.0f, 1.0f, 3.0f, 4.0f, 7.0f, 12.0f, 24.0f, 24.0f };
  float d = 2.0f * raw - 1.0f;
  float sign = d < 0.0f ? -1.0f : 1.0f;
  d = d * sign * 6.0f;
  if (d > 6.0f) d = 6.0f;
  int di = int(d);
  float df = d - float(di);
  df = std::max((df - 0.33333333f) * 1.5f, 0.0f);
  float a = intervals[di], b = intervals[di + 1];
  float s = df * df * (3.0f - 2.0f * df);
  return (a + (b - a) * s) * sign;
}

inline float Clamp01(float x) { return x < 0.0f ? 0.0f : (x > 1.0f ? 1.0f : x); }

struct Inst {
  Processor processor;
  Synth synth;
  uint8_t delay1[512 * 1024];
  uint8_t delay2[256 * 1024];
  uint16_t reverb[32768];
  float params[48];
  float in[2 * kHostMax];
  float out[2 * kHostMax];
  float gate[kHostMax];
  float frz[kHostMax];
  Resampler up, down;
  Frames mq, oq, hq;
  int media, mono;
  bool synth_mode, ready;
  GateFlags prev_seed;
  float host_sr;
};

Inst g_inst[kN];

void Reconfigure(Inst& s, int media, int mono, bool synth) {
  if (media < 0) media = 0;
  if (media > 3) media = 3;
  bool changed = (media != s.media) || (mono != s.mono) || (synth != s.synth_mode);
  if (!changed) return;
  if (synth && !s.synth_mode) {
    s.synth.Init(s.reverb);
  } else if (!synth) {
    s.processor.Configure(Processor::Media(media), mono != 0);
  }
  s.media = media;
  s.mono = mono;
  s.synth_mode = synth;
  const double media_sr = synth ? 48000.0 : double(s.processor.sample_rate());
  s.up.Init(s.host_sr, media_sr);
  s.down.Init(media_sr, s.host_sr);
  s.mq.Clear(); s.oq.Clear(); s.hq.Clear();
  // reserva de latência: evita falta de amostras logo após a (re)configuração
  const int prime = (s.up.bypass ? 0 : 96);
  for (int k = 0; k < prime; ++k) s.hq.Push(0.0f, 0.0f, 0, 0);
}

}  // namespace

// ---------------------------------------------------------------------------
extern "C" {

int bd_init(int i, float host_sr) {
  if (i < 0 || i >= kN) return 0;
  Inst& s = g_inst[i];
  memset(s.delay1, 0, sizeof(s.delay1));
  memset(s.delay2, 0, sizeof(s.delay2));
  memset(s.reverb, 0, sizeof(s.reverb));
  uint8_t* buffers[3];
  buffers[0] = s.delay1;
  buffers[1] = s.delay1 + 256 * 1024;
  buffers[2] = s.delay2;
  s.processor.Init(buffers, s.reverb);
  s.synth.Init(s.reverb);
  s.host_sr = host_sr;
  s.media = -1;
  s.mono = -1;
  s.synth_mode = false;
  s.prev_seed = GATE_FLAG_LOW;
  memset(s.params, 0, sizeof(s.params));
  memset(s.in, 0, sizeof(s.in));
  memset(s.out, 0, sizeof(s.out));
  s.up.Init(host_sr, host_sr);
  s.down.Init(host_sr, host_sr);
  s.mq.Clear(); s.oq.Clear(); s.hq.Clear();
  s.ready = true;
  return 1;
}

float* bd_params(int i) { return g_inst[i].params; }
float* bd_in(int i) { return g_inst[i].in; }
float* bd_out(int i) { return g_inst[i].out; }
float* bd_gate(int i) { return g_inst[i].gate; }
float* bd_frz(int i) { return g_inst[i].frz; }
int bd_hostmax() { return kHostMax; }

// Layout de params[] (todos float):
//  0 TIME knob      1 TIME atenuverter   2 TIME CV (V)     3 TIME CV ligado
//  4 SIZE knob      5 SIZE atenuverter   6 SIZE CV (V)     7 SIZE CV ligado
//  8 SHAPE knob     9 SHAPE atenuverter 10 SHAPE CV (V)    11 SHAPE CV ligado
// 12 PITCH knob    13 PITCH atenuverter 14 PITCH CV (V)    15 PITCH CV ligado
// 16 DENSITY knob  17 DENSITY CV (V)    18 DENSITY CV ligado
// 19 FEEDBACK knob 20 DRY/WET knob      21 REVERB knob
// 22 CV assignável (V)  23 ligado  24 destino (0 feedback, 1 dry/wet, 2 reverb)  25 quantidade
// 26 SEED (0 off, 1 pressionado, 2 latched)  27 SEED gate ligado  28 saída R = gate
// 29 modo synth (wavetable)  30 mídia (0..3)  31 mono
int bd_process(int i, int n) {
  if (i < 0 || i >= kN) return 0;
  Inst& s = g_inst[i];
  if (!s.ready || n <= 0 || n > kHostMax) return 0;
  const float* P = s.params;

  Reconfigure(s, int(P[30] + 0.5f), P[31] > 0.5f ? 1 : 0, P[29] > 0.5f);

  Parameters pr;
  memset(&pr, 0, sizeof(pr));
  pr.time.base = Clamp01(P[0]);       pr.time.attenuverter = Attenuverter(P[1]);
  pr.time.cv = P[2] * 0.32f;          pr.time.has_cv = P[3] > 0.5f;
  pr.size.base = Clamp01(P[4]);       pr.size.attenuverter = Attenuverter(P[5]);
  pr.size.cv = P[6] * 0.32f;          pr.size.has_cv = P[7] > 0.5f;
  pr.shape.base = Clamp01(P[8]);      pr.shape.attenuverter = Attenuverter(P[9]);
  pr.shape.cv = P[10] * 0.32f;        pr.shape.has_cv = P[11] > 0.5f;
  pr.pitch.base = Detune(Clamp01(P[12]));
  pr.pitch.attenuverter = Attenuverter(P[13]);
  pr.pitch.cv = P[14] * 12.0f;        pr.pitch.has_cv = P[15] > 0.5f;
  pr.monophonic_mode = false;

  ModulatedParameter dens;
  dens.base = Clamp01(P[16]);
  dens.cv = P[18] > 0.5f ? P[17] * 0.2f : 0.0f;

  float mixp[3] = { Clamp01(P[19]) * 1.005f, Clamp01(P[20]) * 1.005f, Clamp01(P[21]) * 1.005f };
  if (P[23] > 0.5f) {
    int d = int(P[24] + 0.5f);
    if (d >= 0 && d < 3) mixp[d] += (P[22] * 0.2f - 0.002f) * P[25];
  }
  Processor::MixParameters mix;
  mix.feedback = Clamp01(mixp[0]);
  mix.dry_wet = Clamp01(mixp[1]);
  mix.reverb_amount = Clamp01(mixp[2]);
  mix.output_gate = P[28] > 0.5f;

  SeedButtonState seed_state = SEED_BUTTON_STATE_OFF;
  const int sv = int(P[26] + 0.5f);
  if (sv == 1) seed_state = SEED_BUTTON_STATE_ON;
  else if (sv == 2) seed_state = SEED_BUTTON_STATE_LOCKED;
  const bool seed_patched = P[27] > 0.5f;

  // host -> taxa da mídia
  for (int k = 0; k < n; ++k) {
    const float a = s.in[k], b = s.in[kHostMax + k];
    const uint8_t gf = s.gate[k] > 1.5f ? 1 : 0;
    const uint8_t ff = s.frz[k] > 0.5f ? 1 : 0;
    if (s.up.bypass) {
      s.mq.Push(a, b, gf, ff);
    } else {
      s.up.Push(a, b, gf, ff);
      while (s.up.Ready()) {
        float x, y; uint8_t g1, f1;
        s.up.Pull(&x, &y, &g1, &f1);
        s.mq.Push(x, y, g1, f1);
      }
    }
  }

  // processa em blocos de kChunk
  while (s.mq.Size() >= kChunk) {
    FloatFrame fin[kChunk];
    FloatFrame fout[kChunk];
    bool freeze[kChunk];
    GateFlags seed[kChunk];
    for (int j = 0; j < kChunk; ++j) {
      const int k = int((s.mq.rd + j) & kQM);
      fin[j].l = s.mq.l[k];
      fin[j].r = s.mq.r[k];
      freeze[j] = s.mq.f[k] != 0;
      s.prev_seed = ExtractGateFlags(s.prev_seed, s.mq.g[k] != 0);
      seed[j] = s.prev_seed;
      fout[j].l = 0.0f; fout[j].r = 0.0f;
    }
    s.mq.rd += kChunk;
    const GateFlags* seed_in = seed_patched ? seed : NULL;
    if (s.synth_mode) {
      s.synth.Render(seed_state, seed_in, freeze,
                     Synth::Resolution(s.media < 0 ? 3 : s.media),
                     dens, pr, mix, fout, kChunk);
    } else {
      s.processor.Process(seed_state, seed_in, freeze, dens, pr, mix, fin, fout, kChunk);
    }
    for (int j = 0; j < kChunk; ++j) s.oq.Push(fout[j].l, fout[j].r, 0, 0);
  }

  // taxa da mídia -> host
  while (s.oq.Size() > 0) {
    const int k = int(s.oq.rd & kQM);
    const float a = s.oq.l[k], b = s.oq.r[k];
    ++s.oq.rd;
    if (s.down.bypass) {
      s.hq.Push(a, b, 0, 0);
    } else {
      s.down.Push(a, b, 0, 0);
      while (s.down.Ready()) {
        float x, y; uint8_t g1, f1;
        s.down.Pull(&x, &y, &g1, &f1);
        s.hq.Push(x, y, 0, 0);
      }
    }
  }

  for (int k = 0; k < n; ++k) {
    if (s.hq.Size() > 0) {
      const int q = int(s.hq.rd & kQM);
      s.out[k] = s.hq.l[q];
      s.out[kHostMax + k] = s.hq.r[q];
      ++s.hq.rd;
    } else {
      s.out[k] = 0.0f;
      s.out[kHostMax + k] = 0.0f;
    }
  }
  return n;
}

}  // extern "C"

// ---------------------------------------------------------------------------
// Autoteste nativo (rodado pelo CI antes de gerar o WebAssembly): g++ -DBD_SELFTEST
#ifdef BD_SELFTEST
int main() {
  const float sr = 48000.0f;
  int fails = 0;
  for (int media = 0; media < 4; ++media) {
    for (int mode = 0; mode < 2; ++mode) {  // 0 = granular, 1 = delay (SIZE no máximo)
      bd_init(0, sr);
      float* P = bd_params(0);
      float* in = bd_in(0);
      float* out = bd_out(0);
      float* gt = bd_gate(0);
      float* fz = bd_frz(0);
      memset(P, 0, 48 * sizeof(float));
      P[1] = P[5] = P[9] = P[13] = 0.5f;           // atenuverters no centro
      P[0] = 0.3f; P[4] = mode ? 1.0f : 0.55f; P[8] = 0.5f; P[12] = 0.5f;
      P[16] = mode ? 0.5f : 0.25f;                  // DENSITY
      P[19] = 0.2f; P[20] = 0.8f; P[21] = 0.3f;     // feedback, dry/wet, reverb
      P[26] = 2; P[30] = float(media); P[31] = 0;
      double peak = 0, energy = 0; int bad = 0;
      for (int blk = 0; blk < 48000 * 4 / 32; ++blk) {
        for (int k = 0; k < 32; ++k) {
          double t = double(blk * 32 + k) / sr;
          float x = 0.4f * sinf(2.0f * 3.14159265f * 220.0f * float(t)) * (t < 1.0 ? 1.0f : 0.0f);
          in[k] = x; in[kHostMax + k] = x; gt[k] = 0; fz[k] = 0;
        }
        bd_process(0, 32);
        for (int k = 0; k < 64; ++k) {
          float v = k < 32 ? out[k] : out[kHostMax + k - 32];
          if (!(v == v) || fabsf(v) > 10.0f) ++bad;
          peak = std::max(peak, double(fabsf(v)));
          energy += double(v) * v;
        }
      }
      const bool ok = bad == 0 && energy > 1e-3;
      printf("media %d modo %d: pico %.3f energia %.3f %s\n", media, mode, peak, energy, ok ? "OK" : "FALHA");
      if (!ok) ++fails;
    }
  }
  // modo synth (wavetable)
  bd_init(1, sr);
  float* P = bd_params(1);
  memset(P, 0, 48 * sizeof(float));
  P[1] = P[5] = P[9] = P[13] = 0.5f; P[4] = 0.55f; P[16] = 0.25f; P[20] = 0.8f; P[26] = 2; P[29] = 1; P[30] = 3;
  double e = 0;
  for (int blk = 0; blk < 48000 * 2 / 32; ++blk) {
    bd_process(1, 32);
    for (int k = 0; k < 32; ++k) e += double(bd_out(1)[k]) * bd_out(1)[k];
  }
  printf("synth: energia %.3f %s\n", e, e > 1e-3 ? "OK" : "FALHA");
  if (!(e > 1e-3)) ++fails;
  // host 44,1 kHz com mídia de 24 kHz (resampler fracionário)
  bd_init(0, 44100.0f);
  P = bd_params(0);
  memset(P, 0, 48 * sizeof(float));
  P[1] = P[5] = P[9] = P[13] = 0.5f; P[0] = 0.3f; P[4] = 0.55f; P[8] = 0.5f; P[12] = 0.5f; P[16] = 0.25f; P[20] = 0.8f; P[26] = 2; P[30] = 0;
  double e2 = 0;
  for (int blk = 0; blk < 44100 * 3 / 32; ++blk) {
    for (int k = 0; k < 32; ++k) {
      float x = 0.4f * sinf(2.0f * 3.14159265f * 220.0f * float((blk * 32 + k) / 44100.0));
      bd_in(0)[k] = x; bd_in(0)[kHostMax + k] = x; bd_gate(0)[k] = 0; bd_frz(0)[k] = 0;
    }
    bd_process(0, 32);
    for (int k = 0; k < 32; ++k) e2 += double(bd_out(0)[k]) * bd_out(0)[k];
  }
  printf("host 44.1k + media 24k: energia %.3f %s\n", e2, e2 > 1e-3 ? "OK" : "FALHA");
  if (!(e2 > 1e-3)) ++fails;
  printf(fails ? "SELFTEST FALHOU (%d)\n" : "SELFTEST OK\n", fails);
  return fails ? 1 : 0;
}
#endif
