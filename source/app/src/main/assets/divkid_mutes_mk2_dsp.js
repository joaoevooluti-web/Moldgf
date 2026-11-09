(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfDivKidMutesMK2DSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function createState() {
    return { gates: [0, 0, 0, 0], levels: [0, 0, 0, 0], muted: [false, false, false, false], outputs: [0, 0, 0, 0], sum: 0 };
  }
  function process(params, inputs, state) {
    const p = params || {}, x = inputs || {}, s = state || createState();
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const enabled = !(Array.isArray(p.mute) && p.mute[i]);
      const gate = Array.isArray(x.gate) ? x.gate[i] : 0;
      const level = Array.isArray(x.level) ? x.level[i] : 0;
      const signal = Number.isFinite(level) ? level : 0;
      const gateHigh = Number.isFinite(gate) && gate >= (Number.isFinite(p.threshold) ? p.threshold : 1);
      const manual = Array.isArray(p.manual) && !!p.manual[i];
      const muted = !enabled || manual;
      const output = muted ? 0 : signal;
      s.gates[i] = gateHigh ? 10 : 0;
      s.levels[i] = signal;
      s.muted[i] = muted;
      s.outputs[i] = output;
      sum += output;
    }
    const master = Number.isFinite(p.master) ? clamp(p.master, 0, 2) : 1;
    s.sum = sum * master;
    return s;
  }
  return Object.freeze({ createState, process });
});
