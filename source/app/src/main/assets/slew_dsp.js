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
    const index = clamp(range, 0, 2, 1) | 0;
    const scale = index === 0 ? 1 : index === 1 ? 10 : 100;
    return { min: 2.5 / scale, max: 2500 / scale };
  }
  function createState() {
    return { out: 0, rising: 0, falling: 0, rate: 0 };
  }
  function reset(state, value = 0) {
    const s = state && typeof state === "object" ? state : createState();
    s.out = finite(value);
    s.rising = 0;
    s.falling = 0;
    s.rate = 0;
    return s;
  }

  // Real-time path: caller-owned state, primitive return, no per-sample objects.
  // rising/falling are 0–10 V gates held while the output slope has that direction.
  function processInto(input, cv, params, state, sampleTime) {
    const s = state && typeof state === "object" ? state : createState();
    const target = finite(input);
    const current = finite(s.out);
    s.out = current;
    const delta = target - current;
    const rising = delta > 0;
    const falling = delta < 0;
    if (!rising && !falling) {
      s.rising = 0;
      s.falling = 0;
      s.rate = 0;
      return current;
    }

    const p = params;
    const connected = cv !== null && cv !== undefined;
    const mode = clamp(p && p.cvMode, 0, 2, 1) | 0;
    const useCv = connected && (mode === 1 || (mode === 2 && rising) || (mode === 0 && falling));
    const control = rising ? clamp(p && p.rise, 0, 1, 0) : clamp(p && p.fall, 0, 1, 0);
    const cvAmount = useCv ? clamp(cv, 0, 10, 0) * control : control * 10;
    const rateCV = clamp(cvAmount * 0.1, 0, 1, 0);
    const range = clamp(p && p.range, 0, 2, 1) | 0;
    const scale = range === 0 ? 1 : range === 1 ? 10 : 100;
    const minRate = 2.5 / scale;
    const maxRate = 2500 / scale;
    const rate = maxRate * Math.pow(minRate / maxRate, rateCV);
    const shape = clamp(p && p.shape, 0, 1, 0);
    const shapedDelta = (rising ? 1 : -1) * (1 - shape) + (delta / 10) * shape;
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    let out = current + rate * shapedDelta * dt;
    if (rising && out > target) out = target;
    if (falling && out < target) out = target;
    s.out = finite(out);
    s.rising = rising ? 10 : 0;
    s.falling = falling ? 10 : 0;
    s.rate = rate;
    return s.out;
  }

  // Compatibility API for callers that need a result record outside the audio loop.
  function process(input, cv, params, state, sampleTime) {
    const s = state || createState();
    const output = processInto(input, cv, params, s, sampleTime);
    return { output, rising: s.rising, falling: s.falling, state: s, rate: s.rate };
  }

  return Object.freeze({ finite, clamp, rateBounds, createState, reset, processInto, process });
});
