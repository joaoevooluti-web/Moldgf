(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfBypassDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }
  function clamp(value, min, max, fallback) {
    return Math.max(min, Math.min(max, finite(value, fallback)));
  }
  function returnGain(control) {
    const amount = clamp(control, -1, 1, 0);
    const decibels = amount < 0 ? amount * 30 : amount * 12;
    return Math.pow(10, decibels / 20);
  }
  function createState(active = false) {
    return { initialized: false, active: !!active, gateHigh: false, buttonHigh: false, sendActive: 0 };
  }
  function saturate(value) {
    return Math.tanh(finite(value) / 10) * 10;
  }
  function processInto(params, inL, inR, fxL, fxR, launch, state, sampleTime, out) {
    const s = state || createState(params.active);
    const result = out || s;
    if (!s.initialized) {
      s.active = !!params.active;
      s.gateHigh = false;
      s.buttonHigh = false;
      s.sendActive = 0;
      s.initialized = true;
    }
    const gate = finite(launch);
    const wasGateHigh = s.gateHigh;
    if (gate >= 1) s.gateHigh = true;
    else if (gate <= 0.1) s.gateHigh = false;
    const gateRising = !wasGateHigh && s.gateHigh;
    const button = !!params.button;
    const buttonRising = button && !s.buttonHigh;
    s.buttonHigh = button;

    if (params.launchMode === 1) s.active = s.gateHigh || button;
    else if (gateRising || buttonRising) s.active = !s.active;

    const slew = clamp(params.slew, 0.005, 0.05, 0.01);
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    const alpha = 1 - Math.exp(-dt / slew);
    s.sendActive += ((s.active ? 1 : 0) - s.sendActive) * alpha;
    s.sendActive = clamp(s.sendActive, 0, 1, 0);

    const left = finite(inL);
    const right = inR === null || inR === undefined ? left : finite(inR);
    const fxLeft = finite(fxL) * returnGain(params.fxGain);
    const fxRight = finite(fxR) * returnGain(params.fxGain);
    const sendLeft = left * s.sendActive;
    const sendRight = right * s.sendActive;
    let outLeft, outRight;
    if (params.returnMode === 1) {
      outLeft = left * (1 - s.sendActive) + fxLeft;
      outRight = right * (1 - s.sendActive) + fxRight;
    } else {
      outLeft = left * (1 - s.sendActive) + fxLeft * s.sendActive;
      outRight = right * (1 - s.sendActive) + fxRight * s.sendActive;
    }
    if (params.saturation !== false && params.saturation !== 0) {
      outLeft = saturate(outLeft);
      outRight = saturate(outRight);
    }
    result.sendLeft = sendLeft;
    result.sendRight = sendRight;
    result.outLeft = outLeft;
    result.outRight = outRight;
    result.active = s.active;
    result.sendActive = s.sendActive;
    return result;
  }
  function process(params, inputs, state, sampleTime) {
    const s = state || createState(params.active);
    const result = {};
    processInto(params, inputs.inL, inputs.inR, inputs.fxL, inputs.fxR,
      inputs.launch, s, sampleTime, result);
    result.state = s;
    return result;
  }
  return Object.freeze({ finite, clamp, returnGain, createState, saturate, processInto, process });
});
