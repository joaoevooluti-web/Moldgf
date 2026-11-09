(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfJoystickDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const finite = (v, d) => Number.isFinite(v) ? v : d;
  function createState() {
    return { result: { x: 0, y: 0, gateX: 0, gateY: 0, mode: 0, peak: 0 } };
  }
  function process(params, inputs, state) {
    const p = params || {}, x = inputs || {};
    const mode = Math.round(clamp(finite(p.mode, 0), 0, 1));
    const range = clamp(finite(p.range, 1), 0, 1);
    const offsetX = clamp(finite(p.offsetX, 0), -1, 1);
    const offsetY = clamp(finite(p.offsetY, 0), -1, 1);
    const attenX = clamp(finite(p.attenX, 1), -1, 1);
    const attenY = clamp(finite(p.attenY, 1), -1, 1);
    const manualX = clamp(finite(p.x, 0), -1, 1);
    const manualY = clamp(finite(p.y, 0), -1, 1);
    const sourceX = mode ? finite(x.xIn, 0) / 5 : manualX;
    const sourceY = mode ? finite(x.yIn, 0) / 5 : manualY;
    const gainX = mode ? attenX : range;
    const gainY = mode ? attenY : range;
    const outX = clamp(sourceX * gainX + offsetX, -1, 1) * 5;
    const outY = clamp(sourceY * gainY + offsetY, -1, 1) * 5;
    const gateX = p.gateX ? 10 : 0;
    const gateY = p.gateY ? 10 : 0;
    const r = state.result;
    r.x = outX; r.y = outY; r.gateX = gateX; r.gateY = gateY;
    r.mode = mode; r.peak = Math.max(Math.abs(outX), Math.abs(outY));
    return r;
  }
  return Object.freeze({ createState, process });
});
