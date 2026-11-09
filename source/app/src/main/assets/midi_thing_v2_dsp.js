(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMidiThingV2DSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PORTS = 12;
  const MODES = Object.freeze([
    "OFF", "NOTE CV", "GATE", "VELOCITY", "CC", "PITCH BEND",
    "CHANNEL PRESSURE", "PROGRAM CHANGE", "CLOCK", "START/STOP",
    "ADSR", "OSCILLATOR", "LFO", "RPN", "NRPN", "DRUM TRIGGER"
  ]);
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const finite = (v, d) => Number.isFinite(v) ? v : d;
  // Preserve the existing persisted range indices: 0=0/+5, 1=-5/+5, 2=0/+10.
  // Range 3 adds the hardware's 0/+8 option without remapping existing patches.
  const maxForRange = (range) => range === 0 ? 5 : range === 3 ? 8 : 10;
  const scaleRange = (normalized, range) => {
    const value = clamp(finite(normalized, 0), 0, 1);
    return range === 1 ? value * 10 - 5 : value * maxForRange(range);
  };
  const gateVoltage = (range) => range === 0 || range === 1 ? 5 : range === 3 ? 8 : 10;
  const noteVoltage = (note, range) => {
    const volts = clamp(finite(note, 0), 0, 127) / 12;
    if (range === 1) return clamp(volts - 5, -5, 5);
    return clamp(volts, 0, maxForRange(range));
  };

  function createState(sampleRate) {
    const voices = Array.from({ length: PORTS }, () => ({
      active: 0, gate: 0, note: 60, frequency: 440, channel: 0, velocity: 0, age: 0,
      pendingRelease: 0, envelope: 0, stage: 0, releaseStart: 0,
      currentCV: new Float32Array(PORTS), phase: 0
    }));
    return {
      sampleRate: finite(sampleRate, 48000),
      voices,
      cc: new Float32Array(16 * 128),
      pitchBend: new Float32Array(16),
      pressure: new Float32Array(16),
      program: new Uint8Array(16),
      sustain: new Uint8Array(16),
      rpnMsb: new Uint8Array(16).fill(127),
      rpnLsb: new Uint8Array(16).fill(127),
      nrpnMsb: new Uint8Array(16).fill(127),
      nrpnLsb: new Uint8Array(16).fill(127),
      rpnValue: new Float32Array(16),
      nrpnValue: new Float32Array(16),
      outputs: new Float32Array(PORTS),
      activeChannel: 0,
      activeVoices: 0,
      age: 0,
      running: 0,
      clockPulseSamples: 0,
      clockCount: 0,
      lfoPhase: 0,
      lastNote: -1,
      lastVelocity: 0,
      lastMessage: "NO MIDI",
      glideTimeCache: -1, glideModeCache: -1, glideSampleRateCache: -1, glideCoefCache: 1,
      peak: 0,
      droppedNotes: 0
    };
  }

  function releaseVoice(voice) {
    if (!voice.active || !voice.gate) return;
    voice.gate = 0;
    voice.pendingRelease = 0;
    voice.releaseStart = voice.envelope;
    voice.stage = 4;
  }

  function chooseVoice(state, params, channel, note) {
    const count = clamp(Math.round(finite(params.voiceCount, 8)), 1, PORTS);
    for (let i = 0; i < count; i++) {
      const v = state.voices[i];
      if (v.active && v.channel === channel && v.note === note) return i;
    }
    for (let i = 0; i < count; i++) if (!state.voices[i].active) return i;
    const priority = Math.round(finite(params.priority, 0));
    if (priority === 3) return -1;
    let candidate = -1;
    for (let i = 0; i < count; i++) {
      const v = state.voices[i];
      if (candidate < 0) { candidate = i; continue; }
      const c = state.voices[candidate];
      if (priority === 1 && v.note > c.note) candidate = i;
      else if (priority === 2 && v.note < c.note) candidate = i;
      else if (priority === 0 && v.age < c.age) candidate = i;
    }
    if (candidate < 0) return -1;
    const existing = state.voices[candidate];
    if (priority === 1 && note >= existing.note) return -1;
    if (priority === 2 && note <= existing.note) return -1;
    return candidate;
  }

  function noteOn(state, params, channel, note, velocity) {
    const index = chooseVoice(state, params, channel, note);
    if (index < 0) { state.droppedNotes++; return; }
    const v = state.voices[index];
    v.active = 1;
    v.gate = 1;
    v.note = note;
    v.frequency = 440 * Math.pow(2, (note - 69) / 12);
    v.channel = channel;
    v.velocity = velocity / 127;
    v.age = ++state.age;
    v.pendingRelease = 0;
    v.envelope = 0;
    v.releaseStart = 0;
    v.stage = 1;
    v.phase = 0;
    state.lastNote = note;
    state.lastVelocity = velocity;
    state.activeChannel = channel;
  }

  function noteOff(state, channel, note) {
    for (let i = 0; i < PORTS; i++) {
      const v = state.voices[i];
      if (!v.active || v.channel !== channel || v.note !== note || !v.gate) continue;
      if (state.sustain[channel]) v.pendingRelease = 1;
      else releaseVoice(v);
    }
  }

  function allNotesOff(state) {
    for (let i = 0; i < PORTS; i++) releaseVoice(state.voices[i]);
  }

  function handleMidi(state, status, data1, data2, params) {
    if (!state) return false;
    const s = status & 255, a = data1 & 127, b = data2 & 127;
    if (s >= 0xF8) {
      if (s === 0xF8) {
        state.clockPulseSamples = Math.max(state.clockPulseSamples, Math.round(state.sampleRate * 0.01));
        state.clockCount++;
        state.lastMessage = "CLOCK " + state.clockCount;
      } else if (s === 0xFA || s === 0xFB) {
        state.running = 1;
        state.lastMessage = s === 0xFA ? "START" : "CONTINUE";
      } else if (s === 0xFC) {
        state.running = 0;
        state.lastMessage = "STOP";
      } else if (s === 0xFF) {
        allNotesOff(state);
        state.running = 0;
        state.lastMessage = "SYSTEM RESET";
      }
      return true;
    }
    if (s >= 0xF0) return false;
    const channel = s & 15, kind = s & 0xF0;
    const filter = Math.round(finite(params && params.midiChannel, 0));
    if (filter > 0 && filter !== channel + 1) return false;
    state.activeChannel = channel;
    if (kind === 0x90 && b > 0) {
      noteOn(state, params || {}, channel, a, b);
      state.lastMessage = "NOTE ON " + a;
      return true;
    }
    if (kind === 0x80 || (kind === 0x90 && b === 0)) {
      noteOff(state, channel, a);
      state.lastMessage = "NOTE OFF " + a;
      return true;
    }
    if (kind === 0xB0) {
      const offset = channel * 128;
      state.cc[offset + a] = b;
      if (a === 64) {
        const down = b >= 64;
        if (state.sustain[channel] && !down) {
          for (let i = 0; i < PORTS; i++) {
            const v = state.voices[i];
            if (v.active && v.channel === channel && v.pendingRelease) releaseVoice(v);
          }
        }
        state.sustain[channel] = down ? 1 : 0;
      } else if (a === 101) {
        state.rpnMsb[channel] = b; state.nrpnMsb[channel] = 127; state.nrpnLsb[channel] = 127;
      } else if (a === 100) {
        state.rpnLsb[channel] = b; state.nrpnMsb[channel] = 127; state.nrpnLsb[channel] = 127;
      } else if (a === 99) {
        state.nrpnMsb[channel] = b; state.rpnMsb[channel] = 127; state.rpnLsb[channel] = 127;
      } else if (a === 98) {
        state.nrpnLsb[channel] = b; state.rpnMsb[channel] = 127; state.rpnLsb[channel] = 127;
      } else if (a === 6 || a === 38) {
        const msb = state.cc[offset + 6], lsb = state.cc[offset + 38];
        if (state.rpnMsb[channel] !== 127 || state.rpnLsb[channel] !== 127) state.rpnValue[channel] = (msb * 128 + lsb) / 16383;
        if (state.nrpnMsb[channel] !== 127 || state.nrpnLsb[channel] !== 127) state.nrpnValue[channel] = (msb * 128 + lsb) / 16383;
      }
      state.lastMessage = "CC " + a + " · " + b;
      return true;
    }
    if (kind === 0xE0) {
      state.pitchBend[channel] = ((a + b * 128) - 8192) / 8192;
      state.lastMessage = "PITCH BEND";
      return true;
    }
    if (kind === 0xD0) {
      state.pressure[channel] = a / 127;
      state.lastMessage = "PRESSURE";
      return true;
    }
    if (kind === 0xC0) {
      state.program[channel] = a;
      state.lastMessage = "PROGRAM " + (a + 1);
      return true;
    }
    return false;
  }

  function portChannel(state, port) {
    const selected = Math.round(finite(port.channel, 0));
    return selected > 0 ? selected - 1 : state.activeChannel;
  }

  function voiceForPort(state, port, channel) {
    const selected = Math.round(finite(port.voice, 1));
    const omni = Math.round(finite(port.channel, 0)) === 0;
    if (selected > 0) {
      const v = state.voices[clamp(selected - 1, 0, PORTS - 1)];
      return v.active && (omni || v.channel === channel) ? v : null;
    }
    for (let i = 0; i < PORTS; i++) {
      const v = state.voices[i];
      if (v.active && (omni || v.channel === channel)) return v;
    }
    return null;
  }

  function envelopeStep(voice, params, sr) {
    if (voice.stage === 1) {
      const attack = Math.max(0, finite(params.attack, 0.005));
      if (attack <= 0) { voice.envelope = 1; voice.stage = 2; }
      else {
        voice.envelope += 1 / (attack * sr);
        if (voice.envelope >= 1) { voice.envelope = 1; voice.stage = 2; }
      }
    } else if (voice.stage === 2) {
      const decay = Math.max(0, finite(params.decay, 0.15));
      const sustain = clamp(finite(params.sustain, 0.75), 0, 1);
      if (decay <= 0) { voice.envelope = sustain; voice.stage = 3; }
      else {
        voice.envelope += (sustain - voice.envelope) / Math.max(1, decay * sr);
        if (Math.abs(voice.envelope - sustain) < 0.0005) { voice.envelope = sustain; voice.stage = 3; }
      }
    } else if (voice.stage === 3) {
      voice.envelope = clamp(finite(params.sustain, 0.75), 0, 1);
    } else if (voice.stage === 4) {
      const release = Math.max(0, finite(params.release, 0.25));
      if (release <= 0 || voice.envelope <= 0.0001) {
        voice.envelope = 0; voice.stage = 0; voice.active = 0;
      } else {
        voice.envelope -= voice.releaseStart / Math.max(1, release * sr);
        if (voice.envelope <= 0) { voice.envelope = 0; voice.stage = 0; voice.active = 0; }
      }
    }
  }

  function lfoValue(phase, shape) {
    const p = phase - Math.floor(phase);
    if (shape === 1) return 1 - 4 * Math.abs(p - 0.5);
    if (shape === 2) return p < 0.5 ? 1 : -1;
    if (shape === 3) return 2 * p - 1;
    return Math.sin(p * Math.PI * 2);
  }

  function process(params, state, sampleRate) {
    const sr = Math.max(8000, finite(sampleRate, state.sampleRate || 48000));
    if (state.sampleRate !== sr) state.sampleRate = sr;
    const ports = Array.isArray(params.ports) ? params.ports : [];
    const glideTime = Math.max(0, finite(params.glideTime, 0.03)) / 1000;
    if (state.glideTimeCache !== glideTime || state.glideModeCache !== params.glideMode || state.glideSampleRateCache !== sr) {
      state.glideTimeCache = glideTime; state.glideModeCache = params.glideMode; state.glideSampleRateCache = sr;
      state.glideCoefCache = glideTime <= 0 ? 1 : (params.glideMode === 1 ? 1 - Math.exp(-1 / (glideTime * sr)) : 1 / Math.max(1, glideTime * sr));
    }
    const glideCoef = state.glideCoefCache;
    const lfoRate = clamp(finite(params.lfoRate, 1), 0.01, 40);
    state.lfoPhase += lfoRate / sr;
    if (state.lfoPhase >= 1) state.lfoPhase -= Math.floor(state.lfoPhase);
    const lfo = lfoValue(state.lfoPhase, Math.round(finite(params.lfoWave, 0)));
    const voices = state.voices;
    let active = 0;
    for (let i = 0; i < PORTS; i++) {
      const voice = voices[i];
      if (voice.active) {
        envelopeStep(voice, params, sr);
        if (voice.active) {
          active++;
          voice.phase += voice.frequency / sr;
          if (voice.phase >= 1) voice.phase -= Math.floor(voice.phase);
        }
      }
    }
    state.activeVoices = active;
    if (state.clockPulseSamples > 0) state.clockPulseSamples--;
    let peak = 0;
    for (let i = 0; i < PORTS; i++) {
      const port = ports[i] || {};
      const mode = typeof port.mode === "number" ? (MODES[clamp(Math.round(port.mode), 0, MODES.length - 1)] || "OFF") : (port.mode || "OFF");
      const channel = portChannel(state, port);
      const voice = voiceForPort(state, port, channel);
      const range = clamp(Math.round(finite(port.range, finite(params.voltageRange, 2))), 0, 3);
      let value = 0;
      if (mode === "NOTE CV" && voice) {
        const target = noteVoltage(voice.note, range);
        const current = voice.currentCV[i];
        voice.currentCV[i] = current + (target - current) * glideCoef;
        value = voice.currentCV[i];
      } else if (mode === "GATE" && voice) value = voice.gate ? gateVoltage(range) : 0;
      else if (mode === "DRUM TRIGGER" && voice) {
        const selectedNote = clamp(Math.round(finite(port.note, 60)), 0, 127);
        value = voice.gate && voice.note === selectedNote ? gateVoltage(range) : 0;
      } else if (mode === "VELOCITY" && voice) value = scaleRange(voice.velocity, range);
      else if (mode === "CC") {
        const cc = clamp(Math.round(finite(port.cc, 1)), 0, 127);
        value = scaleRange(state.cc[channel * 128 + cc] / 127, range);
      } else if (mode === "PITCH BEND") {
        const bend = state.pitchBend[channel];
        value = scaleRange((bend + 1) * 0.5, range);
      } else if (mode === "CHANNEL PRESSURE") value = scaleRange(state.pressure[channel], range);
      else if (mode === "PROGRAM CHANGE") value = scaleRange(state.program[channel] / 127, range);
      else if (mode === "CLOCK") value = state.clockPulseSamples > 0 ? gateVoltage(range) : 0;
      else if (mode === "START/STOP") value = state.running ? gateVoltage(range) : 0;
      else if (mode === "ADSR" && voice) value = scaleRange(voice.envelope, range);
      else if (mode === "OSCILLATOR" && voice) {
        value = Math.sin(voice.phase * Math.PI * 2) * 5 * voice.envelope;
      } else if (mode === "LFO") value = scaleRange((lfo + 1) * 0.5, range);
      else if (mode === "RPN") value = scaleRange(state.rpnValue[channel], range);
      else if (mode === "NRPN") value = scaleRange(state.nrpnValue[channel], range);
      value = finite(value, 0);
      state.outputs[i] = clamp(value, -10, 10);
      peak = Math.max(peak, Math.abs(state.outputs[i]));
    }
    state.peak = peak;
    return state.outputs;
  }

  return Object.freeze({
    PORTS,
    MODES,
    createState,
    handleMidi,
    allNotesOff,
    process,
    noteVoltage
  });
});
