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
  function processInto(params, xIn, yIn, result) {
    const p = params || {};
    if (!result || typeof result !== "object") return null;
    const mode = Math.round(clamp(finite(p.mode, 0), 0, 1));
    const range = clamp(finite(p.range, 1), 0, 1);
    const offsetX = clamp(finite(p.offsetX, 0), -1, 1);
    const offsetY = clamp(finite(p.offsetY, 0), -1, 1);
    const attenX = clamp(finite(p.attenX, 1), -1, 1);
    const attenY = clamp(finite(p.attenY, 1), -1, 1);
    const manualX = clamp(finite(p.x, 0), -1, 1);
    const manualY = clamp(finite(p.y, 0), -1, 1);
    const sourceX = mode ? finite(xIn, 0) / 5 : manualX;
    const sourceY = mode ? finite(yIn, 0) / 5 : manualY;
    const gainX = mode ? attenX : range;
    const gainY = mode ? attenY : range;
    const outX = clamp(sourceX * gainX + offsetX, -1, 1) * 5;
    const outY = clamp(sourceY * gainY + offsetY, -1, 1) * 5;
    result.x = outX;
    result.y = outY;
    result.gateX = p.gateX ? 10 : 0;
    result.gateY = p.gateY ? 10 : 0;
    result.mode = mode;
    result.peak = Math.max(Math.abs(outX), Math.abs(outY));
    return result;
  }
  function process(params, inputs, state) {
    const x = inputs || {};
    return processInto(params, x.xIn, x.yIn, state && state.result);
  }
  return Object.freeze({ createState, process, processInto });
});
