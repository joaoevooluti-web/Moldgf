(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfCrushDelayV3DSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const finite = (v, d) => Number.isFinite(v) ? v : d;
  function makeBuffer(sr) { return new Float32Array(Math.ceil(sr * 2.05) + 8); }
  function createState(sampleRate) {
    const sr = Math.max(8000, finite(sampleRate, 48000));
    return {
      sampleRate: sr, buffer: makeBuffer(sr), writeIndex: 0,
      held: 0, holdCounter: 0, holdPeriod: 1,
      quantBits: 16, quantLevels: 65536,
      delaySamples: Math.round(sr * 0.005), delayMs: 5,
      crushIntensity: 0, activeModifiers: 0,
      lastWet: 0, lastOutput: 0, peakWet: 0, peakOutput: 0,
      result: { output: 0, send: 0, delayMs: 5, feedback: 0, dryWet: 0.5, inputGain: 1, returnGain: 1, crushIntensity: 0, activeModifiers: 0, peakWet: 0, peakOutput: 0 }
    };
  }
  function delayTime(control) {
    const t = clamp(control, 0, 1);
    if (t <= 0.5) return 5 + (400 - 5) * (t / 0.5);
    return 400 + (2000 - 400) * ((t - 0.5) / 0.5);
  }
  function cvVca(pot, cv) {
    const normal = cv == null ? 1 : clamp(finite(cv, 0) / 10, 0, 1.5);
    return clamp(finite(pot, 1), 0, 1) * normal;
  }
  function crushSample(sample, state, intensity, modifiers) {
    let y = sample;
    if (modifiers & 1) {
      const bits = clamp(Math.round(16 - intensity * 10), 5, 16);
      if (bits !== state.quantBits) {
        state.quantBits = bits;
        state.quantLevels = Math.pow(2, bits);
      }
      y = Math.round(y * state.quantLevels) / state.quantLevels;
    }
    if (modifiers & 2) {
      const period = 1 + Math.floor(intensity * 31);
      if (period !== state.holdPeriod) {
        state.holdPeriod = period;
        state.holdCounter = 0;
      }
      if (state.holdCounter <= 0) {
        state.held = y;
        state.holdCounter = period;
      }
      state.holdCounter--;
      y = state.held;
    } else {
      state.held = y;
      state.holdCounter = 0;
      state.holdPeriod = 1;
    }
    if (modifiers & 4) {
      const drive = 1 + intensity * 5;
      y = Math.tanh(y * drive) / Math.tanh(drive);
    }
    return y;
  }
  function process(params, inputs, state, sampleRate) {
    const sr = Math.max(8000, finite(sampleRate, state.sampleRate || 48000));
    if (sr !== state.sampleRate) {
      state.sampleRate = sr;
      state.buffer = makeBuffer(sr);
      state.writeIndex = 0;
      state.held = 0; state.holdCounter = 0;
      state.lastWet = 0; state.lastOutput = 0;
      state.peakWet = 0; state.peakOutput = 0;
    }
    const p = params || {}, x = inputs || {};
    const timeControl = clamp(finite(p.time, 0.25) + finite(x.timeCV, 0) / 20, 0, 1);
    const delayMs = delayTime(timeControl);
    const delaySamples = clamp(delayMs * sr / 1000, 1, state.buffer.length - 2);
    const timeCrush = clamp((timeControl - 0.5) * 2, 0, 1);
    const gateCrush = finite(x.crushGate, 0) >= 3;
    const c1 = !!p.crush1 || timeCrush > 0.001 || gateCrush;
    const c2 = !!p.crush2 || gateCrush;
    const c3 = !!p.crush3 || gateCrush;
    const modifiers = (c1 ? 1 : 0) | (c2 ? 2 : 0) | (c3 ? 4 : 0);
    const intensity = Math.max(timeCrush, gateCrush ? 1 : 0, (p.crush1 || p.crush2 || p.crush3) ? 0.35 : 0);
    const feedback = clamp(finite(p.feedback, 0.25) + finite(x.feedbackCV, 0) / 20, 0, 0.98);
    const dryWet = clamp(finite(p.dryWet, 0.5) + finite(x.dryWetCV, 0) / 20, 0, 1);
    const inputGain = cvVca(p.inVol, x.inVolCV);
    const returnGain = cvVca(p.returnVol, x.returnVolCV);
    const main = finite(x.input, 0) * inputGain;
    const returned = finite(x.return, 0) * returnGain;
    const delayInput = clamp(main + returned, -12, 12);
    let readPosition = state.writeIndex - delaySamples;
    if (readPosition < 0) readPosition += state.buffer.length;
    if (readPosition >= state.buffer.length) readPosition %= state.buffer.length;
    const i0 = Math.floor(readPosition), frac = readPosition - i0;
    const i1 = i0 + 1 < state.buffer.length ? i0 + 1 : 0;
    let wet = state.buffer[i0] * (1 - frac) + state.buffer[i1] * frac;
    wet = crushSample(wet, state, intensity, modifiers);
    const output = clamp(main * (1 - dryWet) + wet * dryWet, -12, 12);
    state.buffer[state.writeIndex] = clamp(delayInput + wet * feedback, -12, 12);
    state.writeIndex++;
    if (state.writeIndex >= state.buffer.length) state.writeIndex = 0;
    state.delaySamples = delaySamples;
    state.delayMs = delayMs;
    state.crushIntensity = intensity;
    state.activeModifiers = modifiers;
    state.lastWet = wet;
    state.lastOutput = output;
    const aw = Math.abs(wet), ao = Math.abs(output);
    state.peakWet = aw > state.peakWet ? aw : state.peakWet * 0.9995;
    state.peakOutput = ao > state.peakOutput ? ao : state.peakOutput * 0.9995;
    const r = state.result;
    r.output = output; r.send = wet; r.delayMs = delayMs; r.feedback = feedback;
    r.dryWet = dryWet; r.inputGain = inputGain; r.returnGain = returnGain;
    r.crushIntensity = intensity; r.activeModifiers = modifiers;
    r.peakWet = state.peakWet; r.peakOutput = state.peakOutput;
    return r;
  }
  return Object.freeze({ createState, process, delayTime });
});
