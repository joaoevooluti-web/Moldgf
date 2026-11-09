(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfDualAtenuverterDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  function resolveInput(input, normalledInput) {
    return input === null || input === undefined ? normalledInput : input;
  }

  function processChannel(input, attenuverter, offset) {
    const signal = Number.isFinite(input) ? input : 0;
    const gain = clamp(attenuverter, -1, 1, 0);
    const dc = clamp(offset, -10, 10, 0);
    return signal * gain + dc;
  }

  function ledPolarity(output, threshold = 0.01) {
    if (!Number.isFinite(output) || Math.abs(output) < Math.max(0, threshold)) return "off";
    return output > 0 ? "positive" : "negative";
  }

  return Object.freeze({ clamp, resolveInput, processChannel, ledPolarity });
});
