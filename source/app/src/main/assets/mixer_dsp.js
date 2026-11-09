(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMixerDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function process(inputs, gains) {
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += finite(inputs[i]) * clamp(gains[i], 0, 1, 0);
    return [sum, -sum];
  }
  function meter(value) {
    const v = finite(value);
    return { positive: v > 0.01, negative: v < -0.01, magnitude: Math.min(1, Math.abs(v) / 5) };
  }
  return Object.freeze({ finite, clamp, process, meter });
});
