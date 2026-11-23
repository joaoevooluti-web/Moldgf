(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfHexmixVCADSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function gainCurve(cv, shape) {
    const x = clamp(cv, 0, 1, 0);
    const s = clamp(shape, -1, 1, 0);
    const linear = x;
    if (s > 0) {
      const logarithmic = 11 * x / (10 * x + 1);
      return linear + (logarithmic - linear) * s;
    }
    const exponential = x * x * x * x;
    return linear + (exponential - linear) * -s;
  }
  function createState() {
    return {
      inputs: { signal: Array(6).fill(null), cv: Array(6).fill(null) },
      outputPatched: new Uint8Array(5),
      out: new Float64Array(6)
    };
  }
  function reset(state) {
    if (!state || !state.inputs || !state.outputPatched || !state.out) return false;
    state.inputs.signal.fill(null);
    state.inputs.cv.fill(null);
    state.outputPatched.fill(0);
    state.out.fill(0);
    return state;
  }
  function processInto(controls, state, finalRowIsMix) {
    if (!state || !state.inputs || !state.inputs.signal || state.inputs.signal.length < 6 ||
        !state.inputs.cv || state.inputs.cv.length < 6 ||
        !state.outputPatched || state.outputPatched.length < 5 ||
        !state.out || state.out.length < 6) return null;
    const p = controls || {}, signals = state.inputs.signal, cvs = state.inputs.cv, out = state.out;
    for (let i = 0; i < 6; i++) {
      const cv = cvs[i] === null || cvs[i] === undefined ? 10 : finite(cvs[i]);
      const normalized = clamp(cv / 10, 0, 1, 0);
      const shape = p.shape && p.shape[i] !== undefined ? p.shape[i] : 0;
      const level = p.level && p.level[i] !== undefined ? p.level[i] : 1;
      const gain = gainCurve(normalized, shape) * clamp(level, 0, 1, 1);
      out[i] = finite(signals[i]) * gain;
    }
    if (finalRowIsMix) {
      let mix = out[5];
      for (let i = 0; i < 5; i++) if (!state.outputPatched[i]) mix += out[i];
      out[5] = mix;
    }
    return out;
  }
  function process(inputs, controls, outputsPatched, finalRowIsMix) {
    const state = createState();
    for (let i = 0; i < 6; i++) {
      state.inputs.signal[i] = inputs && inputs.signal ? inputs.signal[i] : null;
      state.inputs.cv[i] = inputs && inputs.cv ? inputs.cv[i] : null;
    }
    if (outputsPatched) for (let i = 0; i < 5; i++) state.outputPatched[i] = outputsPatched[i] ? 1 : 0;
    const out = processInto(controls, state, finalRowIsMix);
    return out ? Array.from(out) : Array(6).fill(0);
  }
  return Object.freeze({ finite, clamp, gainCurve, createState, reset, processInto, process });
});