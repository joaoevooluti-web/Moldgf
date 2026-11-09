(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfDivKidMutesMK2DSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function createState() {
    return { envelope: [0, 0, 0, 0], outputs: [0, 0, 0, 0], levels: [0, 0, 0, 0], active: [false, false, false, false] };
  }
  function process(params, inputs, state, sampleRate) {
    const p = params || {}, x = inputs || {}, s = state || createState();
    const sr = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 48000;
    const tau = clamp(Number.isFinite(p.response) ? p.response : 0.012, 0.001, 0.25);
    const coefficient = 1 - Math.exp(-1 / (tau * sr));
    const ins = Array.isArray(x.input) ? x.input : [];
    const switches = Array.isArray(p.switches) ? p.switches : [];
    const held = Array.isArray(p.held) ? p.held : [];
    let previousInput = 0;
    for (let i = 0; i < 4; i++) {
      const raw = Number.isFinite(ins[i]) ? ins[i] : previousInput;
      previousInput = raw;
      const position = clamp(Number.isFinite(switches[i]) ? Math.round(switches[i]) : 0, -1, 1);
      const pass = position === 1 || (position === -1 && !!held[i]);
      const target = pass ? 1 : 0;
      s.envelope[i] += (target - s.envelope[i]) * coefficient;
      if (Math.abs(s.envelope[i]) < 1e-12) s.envelope[i] = 0;
      if (Math.abs(1 - s.envelope[i]) < 1e-12) s.envelope[i] = 1;
      s.levels[i] = raw;
      s.active[i] = pass;
      s.outputs[i] = raw * s.envelope[i];
    }
    return s;
  }
  return Object.freeze({ createState, process });
});
