(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMotionMTRDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function process(inputs, controls, modes, outputsPatched, break10VNormalForAudioMode) {
    const channels = new Array(3);
    for (let i = 0; i < 3; i++) {
      const mode = modes[i] | 0;
      const unpatchedDefault = mode === 2 && break10VNormalForAudioMode ? 0 : 10;
      const input = inputs[i] === null || inputs[i] === undefined ? unpatchedDefault : finite(inputs[i]);
      const gain = clamp(controls[i], 0, 1, 0);
      channels[i] = input * gain * (mode === 0 ? -1 : 1);
    }
    const mix = channels[2] + (outputsPatched[0] ? 0 : channels[0]) + (outputsPatched[1] ? 0 : channels[1]);
    return [channels[0], channels[1], mix];
  }
  return Object.freeze({ finite, clamp, process });
});
