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
    return input * level * (positiveMode ? 1 : -1);
  }
  return Object.freeze({ normalledVoltage, resolveInput, applyGain });
});
