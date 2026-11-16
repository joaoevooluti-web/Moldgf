(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfSlewLimiterDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DEFAULT_PARAMS = Object.freeze({ rise: 0, fall: 0, shape: 0 });
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function rateFromCV(cv) {
    const rate = clamp(cv, 0, 10, 0) * 0.1;
    return 10000 * Math.pow(0.1 / 10000, rate);
  }
  function createState(initialOutput = 0) {
    return { out: finite(initialOutput) };
  }
  function reset(state, initialOutput = 0) {
    if (!state || typeof state !== "object") return createState(initialOutput);
    state.out = finite(initialOutput);
    return state;
  }
  // Real-time API: mutates caller-owned state and returns a primitive number.
  // sampleTime is supplied by the host on every sample, so sample-rate changes
  // take effect immediately without rebuilding or reallocating the state.
  function processInto(input, riseCV, fallCV, params, state, sampleTime) {
    if (!state || typeof state !== "object") return finite(input);
    const p = params && typeof params === "object" ? params : DEFAULT_PARAMS;
    const current = finite(state.out);
    const target = finite(input);
    const delta = target - current;
    if (delta === 0) {
      state.out = current;
      return current;
    }
    const rise = clamp(p.rise, 0, 1, 0) * 10 + clamp(riseCV, 0, 10, 0);
    const fall = clamp(p.fall, 0, 1, 0) * 10 + clamp(fallCV, 0, 10, 0);
    const rate = rateFromCV(delta > 0 ? rise : fall);
    const shape = clamp(p.shape, 0, 1, 0);
    const direction = delta > 0 ? 1 : -1;
    const shaped = direction * (1 - shape) + (delta / 10) * shape;
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    let output = current + rate * shaped * dt;
    if (delta > 0 && output > target) output = target;
    if (delta < 0 && output < target) output = target;
    state.out = finite(output);
    return state.out;
  }
  // Compatibility API retained for callers/tests that expect a result record.
  function process(input, riseCV, fallCV, params, state, sampleTime) {
    const s = state && typeof state === "object" ? state : createState();
    return {
      output: processInto(input, riseCV, fallCV, params, s, sampleTime),
      state: s
    };
  }
  return Object.freeze({ finite, clamp, rateFromCV, createState, reset, processInto, process });
});
