(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMixer2DSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function clipVoltage(value) { return clamp(value, -10, 10, 0); }
  function processInto(input1, input2, input3, input4, gains, mix12Patched, clipEnabled, out) {
    const g0 = clamp(gains[0], 0, 1, 1);
    const g1 = clamp(gains[1], 0, 1, 1);
    const g2 = clamp(gains[2], 0, 1, 1);
    const g3 = clamp(gains[3], 0, 1, 1);
    const group12 = finite(input1) * g0 + finite(input2) * g1;
    const group34 = finite(input3) * g2 + finite(input4) * g3;
    const out1 = mix12Patched ? group12 : 0;
    const out2 = mix12Patched ? group34 : group12 + group34;
    out[0] = clipEnabled ? clipVoltage(out1) : out1;
    out[1] = clipEnabled ? clipVoltage(out2) : out2;
    return out;
  }
  function process(inputs, gains, mix12Patched, clipEnabled) {
    return processInto(inputs[0], inputs[1], inputs[2], inputs[3], gains, mix12Patched, clipEnabled, [0, 0]);
  }
  function meterInto(value, out) {
    const magnitude = Math.abs(finite(value));
    out.positive = value > 0.01;
    out.negative = value < -0.01;
    out.level = Math.min(1, magnitude / 10);
    return out;
  }
  function meter(value) {
    return meterInto(value, { positive: false, negative: false, level: 0 });
  }
  return Object.freeze({ finite, clamp, clipVoltage, processInto, process, meterInto, meter });
});
