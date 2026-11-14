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
  function processInto(input1, input2, input3, input4, gains, out) {
    let sum = 0;
    sum += finite(input1) * clamp(gains[0], 0, 1, 0);
    sum += finite(input2) * clamp(gains[1], 0, 1, 0);
    sum += finite(input3) * clamp(gains[2], 0, 1, 0);
    sum += finite(input4) * clamp(gains[3], 0, 1, 0);
    out[0] = sum;
    out[1] = -sum;
    return out;
  }
  function process(inputs, gains) {
    return processInto(inputs[0], inputs[1], inputs[2], inputs[3], gains, [0, 0]);
  }
  function meterInto(value, out) {
    const v = finite(value);
    out.positive = v > 0.01;
    out.negative = v < -0.01;
    out.magnitude = Math.min(1, Math.abs(v) / 5);
    return out;
  }
  function meter(value) {
    return meterInto(value, { positive: false, negative: false, magnitude: 0 });
  }
  return Object.freeze({ finite, clamp, processInto, process, meterInto, meter });
});
