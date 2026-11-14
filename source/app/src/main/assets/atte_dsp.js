(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfAtteDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function normalledVoltage() { return 10; }
  function resolveInput(input, previousChannelInput) {
    return input === null || input === undefined ? previousChannelInput : input;
  }
  function applyGain(input, gain, positiveMode) {
    const level = Number.isFinite(gain) ? Math.max(0, Math.min(1, gain)) : 0;
    if (level === 0 || input === 0) return 0;
    const output = input * level * (positiveMode ? 1 : -1);
    return Object.is(output, -0) ? 0 : output;
  }
  function processInto(inputA, inputB, inputC, inputD, gains, modes, out) {
    if (!gains || !modes || !out || typeof out.length !== "number" || out.length < 4) return null;
    let previous = normalledVoltage();
    let input = resolveInput(inputA, previous);
    out[0] = applyGain(input, gains[0], modes[0] === 1);
    previous = input;
    input = resolveInput(inputB, previous);
    out[1] = applyGain(input, gains[1], modes[1] === 1);
    previous = input;
    input = resolveInput(inputC, previous);
    out[2] = applyGain(input, gains[2], modes[2] === 1);
    previous = input;
    input = resolveInput(inputD, previous);
    out[3] = applyGain(input, gains[3], modes[3] === 1);
    return out;
  }
  return Object.freeze({ normalledVoltage, resolveInput, applyGain, processInto });
});
