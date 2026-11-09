(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfAxBCDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const GAIN_FACTORS = Object.freeze([1, 2, -1]);
  function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }
  function clipVoltage(value) {
    return clamp(value, -10, 10, 0);
  }
  function resolveInput(input, normalledInput) {
    return input === null || input === undefined ? normalledInput : input;
  }
  function gainFactor(mode) {
    return GAIN_FACTORS[mode] === undefined ? 1 : GAIN_FACTORS[mode];
  }
  function processChannel(inputA, inputB, inputC, controls) {
    const a = clipVoltage(inputA);
    const b = clipVoltage(inputB === null || inputB === undefined ? 5 : inputB);
    const c = clipVoltage(inputC === null || inputC === undefined ? 5 : inputC);
    const bLevel = clamp(controls.bLevel, 0, 1, 0);
    const cLevel = clamp(controls.cLevel, 0, 1, 0);
    const scaledB = clipVoltage(b * gainFactor(controls.bMode) * bLevel);
    const scaledC = clipVoltage(c * gainFactor(controls.cMode) * cLevel);
    return clipVoltage((a * scaledB) / 5 + scaledC);
  }
  function ledPolarity(output, threshold = 0.01) {
    if (!Number.isFinite(output) || Math.abs(output) < Math.max(0, threshold)) return "off";
    return output > 0 ? "positive" : "negative";
  }
  function processPair(inputs, controls, mode, out1Patched) {
    const a1 = clipVoltage(inputs.a1);
    const a2 = mode === 0 ? clipVoltage(resolveInput(inputs.a2, a1)) : clipVoltage(inputs.a2);
    const out1 = processChannel(a1, inputs.b1, inputs.c1, controls[0]);
    const out2 = processChannel(a2, inputs.b2, inputs.c2, controls[1]);
    return [out1, mode === 1 && !out1Patched ? clipVoltage(out1 + out2) : out2];
  }
  return Object.freeze({ clamp, clipVoltage, resolveInput, gainFactor, processChannel, processPair, ledPolarity });
});
