(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfAtteDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const NORMALLED_VOLTAGES = Object.freeze([1, 5, 10]);
  function normalledVoltage(index) {
    return NORMALLED_VOLTAGES[index] === undefined ? 10 : NORMALLED_VOLTAGES[index];
  }
  function resolveInput(input, previousChannelInput) {
    return input === null || input === undefined ? previousChannelInput : input;
  }
  function applyGain(input, gain, positiveMode) {
    const level = Number.isFinite(gain) ? Math.max(0, Math.min(1, gain)) : 0;
    if (level === 0 || input === 0) return 0;
    const output = input * level * (positiveMode ? 1 : -1);
    return Object.is(output, -0) ? 0 : output;
  }
  return Object.freeze({ normalledVoltage, resolveInput, applyGain });
});
