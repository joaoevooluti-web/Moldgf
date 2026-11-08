// Ponte C -> WebAssembly para o DSP ORIGINAL do Plaits (Mutable Instruments, MIT, (c) Emilie Gillet).
// Compilado no GitHub Actions a partir de https://github.com/pichenettes/eurorack
#include <stdint.h>
#include <string.h>
#include "plaits/dsp/voice.h"
#ifndef PX_ENGINES
#define PX_ENGINES 16
#endif
#ifndef PX_NEWFIRST
#define PX_NEWFIRST 0
#endif
namespace {
const int kN = 4;
alignas(16) char g_shared[kN][65536];
plaits::Voice g_voice[kN];
plaits::Voice::Frame g_frames[kN][12];
float g_params[kN][32];
}
extern "C" {
int px_init(int i) {
  if (i < 0 || i >= kN) return 0;
  stmlib::BufferAllocator allocator(g_shared[i], sizeof(g_shared[i]));
  g_voice[i].Init(&allocator);
  return 1;
}
float* px_params(int i) { return g_params[i]; }
int16_t* px_buf(int i) { return reinterpret_cast<int16_t*>(g_frames[i]); }
int px_info(int k) {
  if (k == 0) return (PX_ENGINES == 24 && PX_NEWFIRST) ? 8 : 0;
  if (k == 1) return PX_NEWFIRST ? 0 : 16;
  return PX_ENGINES;
}
void px_render(int i) {
  const float* p = g_params[i];
  plaits::Patch patch;
  plaits::Modulations mod;
  memset(&patch, 0, sizeof(patch));
  memset(&mod, 0, sizeof(mod));
  patch.note = p[0]; patch.harmonics = p[1]; patch.timbre = p[2]; patch.morph = p[3];
  patch.frequency_modulation_amount = p[4]; patch.timbre_modulation_amount = p[5]; patch.morph_modulation_amount = p[6];
  patch.engine = static_cast<int>(p[7]); patch.decay = p[8]; patch.lpg_colour = p[9];
  mod.engine = p[10]; mod.note = p[11]; mod.frequency = p[12]; mod.harmonics = p[13];
  mod.timbre = p[14]; mod.morph = p[15]; mod.trigger = p[16]; mod.level = p[17];
  mod.frequency_patched = p[18] > 0.5f; mod.timbre_patched = p[19] > 0.5f; mod.morph_patched = p[20] > 0.5f;
  mod.trigger_patched = p[21] > 0.5f; mod.level_patched = p[22] > 0.5f;
  g_voice[i].Render(patch, mod, g_frames[i], 12);
}
}
