(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfHexmixVCADSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function gainCurve(cv, shape) {
    const x = clamp(cv, 0, 1, 0);
    const s = clamp(shape, -1, 1, 0);
    const linear = x;
    if (s > 0) {
      const logarithmic = 11 * x / (10 * x + 1);
      return linear + (logarithmic - linear) * s;
    }
    const exponential = x * x * x * x;
    return linear + (exponential - linear) * -s;
  }
  function process(inputs, controls, outputsPatched, finalRowIsMix) {
    const channels = new Array(6);
    for (let i = 0; i < 6; i++) {
      const cv = inputs.cv[i] === null || inputs.cv[i] === undefined ? 10 : inputs.cv[i];
      const normalized = clamp(finite(cv) / 10, 0, 1, 0);
      const gain = gainCurve(normalized, controls.shape[i]) * clamp(controls.level[i], 0, 1, 1);
      channels[i] = finite(inputs.signal[i]) * gain;
    }
    let mix = channels[5];
    if (finalRowIsMix) {
      for (let i = 0; i < 5; i++) if (!outputsPatched[i]) mix += channels[i];
    }
    const outputs = channels.slice();
    outputs[5] = finalRowIsMix ? mix : channels[5];
    return outputs;
  }
  return Object.freeze({ finite, clamp, gainCurve, process });
});
