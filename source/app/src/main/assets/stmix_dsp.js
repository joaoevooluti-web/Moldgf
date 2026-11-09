(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfSTMixDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function channelGain(control) {
    const x = clamp(control, 0, 1, 0);
    return x * x;
  }
  function process(inputs, gains) {
    let left = 0, right = 0;
    for (let i = 0; i < 4; i++) {
      const l = finite(inputs[i * 2]);
      const r = inputs[i * 2 + 1] === null || inputs[i * 2 + 1] === undefined
        ? l : finite(inputs[i * 2 + 1]);
      const gain = channelGain(gains[i]);
      left += l * gain;
      right += r * gain;
    }
    const auxLeft = finite(inputs[8]);
    const auxRight = inputs[9] === null || inputs[9] === undefined ? auxLeft : finite(inputs[9]);
    return [left + auxLeft, right + auxRight];
  }
  function meter(value) {
    const v = finite(value);
    return { positive: v > 0.01, negative: v < -0.01, magnitude: Math.min(1, Math.abs(v) / 5) };
  }
  return Object.freeze({ finite, clamp, channelGain, process, meter });
});
