(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfSlewLimiterDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function rateFromCV(cv) {
    const rate = clamp(cv, 0, 10, 0) * 0.1;
    return 10000 * Math.pow(0.1 / 10000, rate);
  }
  function process(input, riseCV, fallCV, params, state, sampleTime) {
    const s = state || { out: 0 };
    const target = finite(input);
    const delta = target - finite(s.out);
    if (delta === 0) return { output: s.out, state: s };
    const rise = clamp(params.rise, 0, 1, 0) * 10 + clamp(riseCV, 0, 10, 0);
    const fall = clamp(params.fall, 0, 1, 0) * 10 + clamp(fallCV, 0, 10, 0);
    const rate = rateFromCV(delta > 0 ? rise : fall);
    const shape = clamp(params.shape, 0, 1, 0);
    const direction = delta > 0 ? 1 : -1;
    const shaped = direction * (1 - shape) + (delta / 10) * shape;
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    let output = s.out + rate * shaped * dt;
    if (delta > 0 && output > target) output = target;
    if (delta < 0 && output < target) output = target;
    s.out = finite(output);
    return { output: s.out, state: s };
  }
  return Object.freeze({ finite, clamp, rateFromCV, process });
});
