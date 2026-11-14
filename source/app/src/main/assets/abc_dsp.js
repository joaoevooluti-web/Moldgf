(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfABCDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }
  function clipVoltage(value) {
    return clamp(value, -10, 10, 0);
  }
  function bipolarCurve(value) {
    const x = clamp(value, -1, 1, 0);
    if (x === 0) return 0;
    const magnitude = Math.expm1(3 * Math.abs(x)) / Math.expm1(3);
    return x < 0 ? -magnitude : magnitude;
  }
  function processChannel(inputA, inputB, inputC, bLevel, cLevel) {
    const a = clipVoltage(inputA);
    const b = clipVoltage(inputB === null || inputB === undefined ? 5 : inputB);
    const c = clipVoltage(inputC === null || inputC === undefined ? 10 : inputC);
    const gainB = 2 * bipolarCurve(bLevel);
    const gainC = bipolarCurve(cLevel);
    return clipVoltage(a * (b / 5) * gainB + c * gainC);
  }
  function processPairInto(a1, b1, c1, a2, b2, c2, bLevel1, cLevel1, bLevel2, cLevel2, out1Patched, out) {
    const out1 = processChannel(a1, b1, c1, bLevel1, cLevel1);
    const out2 = processChannel(a2, b2, c2, bLevel2, cLevel2);
    out[0] = out1;
    out[1] = out1Patched ? out2 : clipVoltage(out1 + out2);
    return out;
  }
  function processPair(inputs, controls, out1Patched) {
    return processPairInto(
      inputs.a1, inputs.b1, inputs.c1, inputs.a2, inputs.b2, inputs.c2,
      controls[0].bLevel, controls[0].cLevel, controls[1].bLevel, controls[1].cLevel,
      out1Patched, [0, 0]
    );
  }
  function ledPolarity(output, threshold = 0.01) {
    if (!Number.isFinite(output) || Math.abs(output) < Math.max(0, threshold)) return "off";
    return output > 0 ? "positive" : "negative";
  }
  return Object.freeze({ clamp, clipVoltage, bipolarCurve, processChannel, processPairInto, processPair, ledPolarity });
});
