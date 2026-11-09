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
  function process(inputs, gains, mix12Patched, clipEnabled) {
    const level = gains.map(g => clamp(g, 0, 1, 1));
    const group12 = finite(inputs[0]) * level[0] + finite(inputs[1]) * level[1];
    const group34 = finite(inputs[2]) * level[2] + finite(inputs[3]) * level[3];
    const out1 = mix12Patched ? group12 : 0;
    const out2 = mix12Patched ? group34 : group12 + group34;
    return clipEnabled ? [clipVoltage(out1), clipVoltage(out2)] : [out1, out2];
  }
  function meter(value) {
    const magnitude = Math.abs(finite(value));
    return { positive: value > 0.01, negative: value < -0.01, level: Math.min(1, magnitude / 10) };
  }
  return Object.freeze({ finite, clamp, clipVoltage, process, meter });
});
