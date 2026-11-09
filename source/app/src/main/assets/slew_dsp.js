(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfSlewDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function rateBounds(range) {
    const scale = Math.pow(10, clamp(range, 0, 2, 1) | 0);
    return { min: 10 / (4 * scale), max: 10 / (0.004 * scale) };
  }
  function process(input, cv, params, state, sampleTime) {
    const s = state || { out: 0 };
    const target = finite(input);
    const delta = target - finite(s.out);
    const rising = delta > 0;
    const falling = delta < 0;
    if (!rising && !falling) return { output: s.out, rising: 0, falling: 0, state: s };
    const connected = cv !== null && cv !== undefined;
    const mode = clamp(params.cvMode, 0, 2, 1) | 0;
    const useCv = connected && (mode === 1 || (mode === 2 && rising) || (mode === 0 && falling));
    const control = rising ? clamp(params.rise, 0, 1, 0) : clamp(params.fall, 0, 1, 0);
    const cvAmount = useCv ? clamp(cv, 0, 10, 0) * control : control * 10;
    const rateCV = clamp(cvAmount * 0.1, 0, 1, 0);
    const bounds = rateBounds(params.range);
    const rate = bounds.max * Math.pow(bounds.min / bounds.max, rateCV);
    const shape = clamp(params.shape, 0, 1, 0);
    const shapedDelta = (rising ? 1 : -1) * (1 - shape) + (delta / 10) * shape;
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    let out = s.out + rate * shapedDelta * dt;
    if (rising && out > target) out = target;
    if (falling && out < target) out = target;
    s.out = finite(out);
    return { output: s.out, rising: rising ? 10 : 0, falling: falling ? 10 : 0, state: s, rate };
  }
  return Object.freeze({ finite, clamp, rateBounds, process });
});
