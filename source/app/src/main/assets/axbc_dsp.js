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
  function processChannelValues(inputA, inputB, inputC, bLevelValue, bMode, cLevelValue, cMode) {
    const a = clipVoltage(inputA);
    const b = clipVoltage(inputB === null || inputB === undefined ? 5 : inputB);
    const c = clipVoltage(inputC === null || inputC === undefined ? 5 : inputC);
    const bLevel = clamp(bLevelValue, 0, 1, 0);
    const cLevel = clamp(cLevelValue, 0, 1, 0);
    const scaledB = clipVoltage(b * gainFactor(bMode) * bLevel);
    const scaledC = clipVoltage(c * gainFactor(cMode) * cLevel);
    return clipVoltage((a * scaledB) / 5 + scaledC);
  }
  function processChannel(inputA, inputB, inputC, controls) {
    return processChannelValues(inputA, inputB, inputC,
      controls.bLevel, controls.bMode, controls.cLevel, controls.cMode);
  }
  function ledPolarity(output, threshold = 0.01) {
    if (!Number.isFinite(output) || Math.abs(output) < Math.max(0, threshold)) return "off";
    return output > 0 ? "positive" : "negative";
  }
  function processPairInto(a1, b1, c1, a2, b2, c2,
    b1Level, b1Mode, c1Level, c1Mode, b2Level, b2Mode, c2Level, c2Mode,
    mode, out1Patched, out) {
    const normalizedA1 = clipVoltage(a1);
    const normalizedA2 = mode === 0 ? clipVoltage(resolveInput(a2, normalizedA1)) : clipVoltage(a2);
    const out1 = processChannelValues(normalizedA1, b1, c1, b1Level, b1Mode, c1Level, c1Mode);
    const out2 = processChannelValues(normalizedA2, b2, c2, b2Level, b2Mode, c2Level, c2Mode);
    out[0] = out1;
    out[1] = mode === 1 && !out1Patched ? clipVoltage(out1 + out2) : out2;
    return out;
  }
  function processPair(inputs, controls, mode, out1Patched) {
    return processPairInto(
      inputs.a1, inputs.b1, inputs.c1, inputs.a2, inputs.b2, inputs.c2,
      controls[0].bLevel, controls[0].bMode, controls[0].cLevel, controls[0].cMode,
      controls[1].bLevel, controls[1].bMode, controls[1].cLevel, controls[1].cMode,
      mode, out1Patched, [0, 0]
    );
  }
  return Object.freeze({ clamp, clipVoltage, resolveInput, gainFactor, processChannel, processPairInto, processPair, ledPolarity });
});
