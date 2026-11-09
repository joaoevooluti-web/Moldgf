(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfBF22DSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const finite = (v, d) => Number.isFinite(v) ? v : d;
  const makeFilter = () => ({
    lp: 0, ic1: 0, ic2: 0, g: 0, k: 2, alpha: 0,
    cachedCutoff: -1, cachedResonance: -1, cachedMode: -1, cachedSlope: -1,
    cutoff: 1000, resonance: 0, peak: 0, lastOutput: 0
  });
  function createState(sampleRate) {
    return {
      sampleRate: finite(sampleRate, 48000),
      a: makeFilter(), b: makeFilter(),
      result: { outA: 0, outB: 0, cutoffA: 1000, cutoffB: 1000, resonanceA: 0, resonanceB: 0, peakA: 0, peakB: 0 }
    };
  }
  function coefficients(state, cutoff, resonance, mode, slope, sr) {
    if (Math.abs(cutoff - state.cachedCutoff) > 0.05 ||
        Math.abs(resonance - state.cachedResonance) > 0.0001 ||
        mode !== state.cachedMode || slope !== state.cachedSlope) {
      state.g = Math.tan(Math.PI * cutoff / sr);
      state.k = 2 - 1.95 * resonance;
      state.alpha = 1 - Math.exp(-2 * Math.PI * cutoff / sr);
      state.cachedCutoff = cutoff;
      state.cachedResonance = resonance;
      state.cachedMode = mode;
      state.cachedSlope = slope;
    }
  }
  function channel(state, input, params, cv1, cv2, resCV, suffix, sr) {
    const knob = clamp(finite(params["cutoff" + suffix], 0.5), 0, 1);
    const base = 20 * Math.pow(1000, knob);
    const cv1Att = clamp(finite(params["cv1Att" + suffix], 0), -1, 1);
    const octaves1 = clamp(finite(cv1, 0) * cv1Att * 0.3, -3, 3);
    const octaves2 = clamp(finite(cv2, 0), -2, 2);
    const cutoff = clamp(base * Math.pow(2, octaves1 + octaves2), 10, sr * 0.45);
    const resonance = clamp(finite(params["resonance" + suffix], 0.15) + finite(resCV, 0) * 0.1, 0, 1);
    const mode = Math.round(finite(params["filterMode" + suffix], 0)) ? 1 : 0;
    const slope = Math.round(finite(params["slope" + suffix], 1)) ? 1 : 0;
    coefficients(state, cutoff, resonance, mode, slope, sr);
    const x = clamp(finite(input, 0), -24, 24);
    let y;
    if (slope === 0) {
      state.lp += state.alpha * (x - state.lp);
      y = mode === 0 ? state.lp : x - state.lp;
    } else {
      const g = state.g, k = state.k;
      const denominator = 1 + g * (g + k);
      const v1 = (state.ic1 + g * (x - state.ic2)) / denominator;
      const v2 = state.ic2 + g * v1;
      state.ic1 = 2 * v1 - state.ic1;
      state.ic2 = 2 * v2 - state.ic2;
      y = mode === 0 ? v2 : x - k * v1 - v2;
      state.lp = v2;
    }
    if (Math.abs(state.lp) < 1e-24) state.lp = 0;
    if (Math.abs(state.ic1) < 1e-24) state.ic1 = 0;
    if (Math.abs(state.ic2) < 1e-24) state.ic2 = 0;
    y = clamp(finite(y, 0), -12, 12);
    const magnitude = Math.abs(y);
    state.peak = magnitude > state.peak ? magnitude : state.peak * 0.9995;
    state.cutoff = cutoff;
    state.resonance = resonance;
    state.lastOutput = y;
    return y;
  }
  function process(params, inputs, state, sampleRate) {
    const sr = clamp(finite(sampleRate, state.sampleRate || 48000), 8000, 192000);
    if (sr !== state.sampleRate) {
      state.sampleRate = sr;
      state.a = makeFilter();
      state.b = makeFilter();
    }
    const p = params || {}, x = inputs || {};
    const levelA = clamp(finite(p.inputLevelA, 1), 0, 2);
    const levelB = clamp(finite(p.inputLevelB, 1), 0, 2);
    const inA = finite(x.inA, 0) * levelA;
    const outA = channel(state.a, inA, p, x.cv1A, x.cv2A, x.resCVA, "A", sr);
    const linked = p.link === 1 || p.link === true;
    const inB = linked ? outA : finite(x.inB, 0) * levelB;
    const outB = channel(state.b, inB, p, x.cv1B, x.cv2B, x.resCVB, "B", sr);
    const r = state.result;
    r.outA = outA; r.outB = outB;
    r.cutoffA = state.a.cutoff; r.cutoffB = state.b.cutoff;
    r.resonanceA = state.a.resonance; r.resonanceB = state.b.resonance;
    r.peakA = state.a.peak; r.peakB = state.b.peak;
    return r;
  }
  return Object.freeze({ createState, process });
});
