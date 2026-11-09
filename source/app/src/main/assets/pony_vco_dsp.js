(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfPonyVCODSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const C4 = 261.6255653006;
  const RANGES = [8, 1, 1 / 12, 10];
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function wrapPhase(phase) { return phase - Math.floor(phase); }
  function polyBlep(t, dt) {
    if (dt <= 0) return 0;
    if (t < dt) { const x = t / dt; return x + x - x * x - 1; }
    if (t > 1 - dt) { const x = (t - 1) / dt; return x * x + x + x + 1; }
    return 0;
  }
  function saw(phase, dt) { return 2 * phase - 1 - polyBlep(phase, dt); }
  function square(phase, pulseWidth, dt) {
    return (phase < pulseWidth ? 1 : -1) + polyBlep(phase, dt) - polyBlep(wrapPhase(phase - pulseWidth), dt);
  }
  function waveFold(value, timbre) {
    const threshold = 1 - 0.85 * clamp(timbre, 0, 1, 0);
    let x = value;
    if (x > threshold) x = 5 * threshold - 4 * x;
    else if (x < -threshold) x = -5 * threshold - 4 * x;
    const p = wrapPhase((x + 1) / 4) * 4;
    return clamp((p <= 2 ? p : 4 - p) - 1, -1, 1, 0);
  }
  function frequency(params, voct) {
    const range = RANGES[clamp(params.range, 0, 3, 0) | 0];
    const lfo = (params.range | 0) === 3;
    const base = lfo ? 1 : C4 * Math.pow(2, (clamp(params.octave, 0, 6, 4) | 0) - 3);
    const pitch = finite(voct) + clamp(params.freq, -0.5, 0.5, 0) * range;
    return base * Math.pow(2, pitch);
  }
  function createState() { return { initialized: false, phase: 0, triangle: 0, syncHigh: false }; }
  function process(params, inputs, state, sampleRate) {
    const s = state || createState();
    if (!s.initialized) { s.phase = 0; s.triangle = 0; s.syncHigh = false; s.initialized = true; }
    const sr = clamp(sampleRate, 8000, 384000, 48000);
    const f = frequency(params, inputs.voct);
    const fmRatio = 1 + finite(inputs.tzfm);
    const delta = clamp(f * fmRatio / sr, -0.5, 0.5, 0);
    const sync = finite(inputs.sync);
    const syncHigh = s.syncHigh ? sync > 0.1 : sync >= 1;
    const syncRising = !s.syncHigh && syncHigh;
    s.syncHigh = syncHigh;
    const waveform = clamp(params.waveform, 0, 3, 0) | 0;
    if (syncRising) { s.phase = waveform === 0 ? 0.25 : 0; s.triangle = 0; }
    s.phase = wrapPhase(s.phase + delta);
    const dt = Math.max(Math.abs(delta), 1 / sr);
    const timbre = clamp(params.timbre + finite(inputs.timbre) / 10, 0, 1, 0);
    const pulseWidth = clamp(timbre, 0.05, 0.95, 0.5);
    let wave;
    if (waveform === 0) wave = Math.sin(2 * Math.PI * s.phase);
    else if (waveform === 1) {
      s.triangle = clamp(s.triangle + square(s.phase, 0.5, dt) * 4 * delta, -1, 1, 0);
      wave = s.triangle;
    } else if (waveform === 2) wave = saw(s.phase, dt);
    else wave = square(s.phase, pulseWidth, dt);
    if (waveform !== 3) wave = waveFold(wave, timbre);
    const vcaVoltage = inputs.vca === null || inputs.vca === undefined ? 10 : finite(inputs.vca);
    const gain = clamp(vcaVoltage / 10, 0, 1, 0);
    return { output: 5 * wave * gain, frequency: f, phase: s.phase, waveform: wave, gain, state: s };
  }
  return Object.freeze({ C4, RANGES, finite, clamp, wrapPhase, polyBlep, saw, square, waveFold, frequency, createState, process });
});
