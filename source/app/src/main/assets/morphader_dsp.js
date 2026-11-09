(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMorphaderDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PI = Math.PI;
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function crossfade(a, b, position, mode) {
    const p = clamp(position, -1, 1, 0);
    if (mode === 1) {
      const t = (p + 1) * 0.5;
      return finite(a) * (1 - t) + finite(b) * t;
    }
    const angle = (p + 1) * PI * 0.25;
    return finite(a) * Math.cos(angle) + finite(b) * Math.sin(angle);
  }
  function createState() { return { initialized: false, fader: 0 }; }
  function process(inputs, params, state, sampleTime) {
    const s = state || createState();
    if (!s.initialized) { s.fader = clamp(params.fader, -1, 1, 0); s.initialized = true; }
    const lag = clamp(params.lag, 0.01, 15, 0.01);
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    const lambda = 2 / lag;
    s.fader += lambda * (clamp(params.fader, -1, 1, 0) - s.fader) * dt;
    s.fader = clamp(s.fader, -1, 1, 0);
    const cv1Connected = inputs.cv[0] !== null && inputs.cv[0] !== undefined;
    const cv1 = clamp(inputs.cv[0], 0, 10, 0);
    const outputs = [0, 0, 0, 0], channelMix = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const ownCvConnected = inputs.cv[i] !== null && inputs.cv[i] !== undefined;
      let position = s.fader;
      if (i === 0 && ownCvConnected) {
        position = s.fader + clamp(params.cvAtt, 0, 1, 1) * cv1 * 0.2;
      } else if (i > 0 && ownCvConnected) {
        position = clamp(inputs.cv[i], 0, 10, 0) * 0.2 - 1;
      } else if (i > 0 && cv1Connected) {
        position = s.fader + clamp(params.cvAtt, 0, 1, 1) * cv1 * 0.2;
      }
      position = clamp(position, -1, 1, 0);
      const a = finite(inputs.a[i] === null || inputs.a[i] === undefined ? 10 : inputs.a[i]) * clamp(params.aLevel[i], 0, 1, 0);
      const b = finite(inputs.b[i] === null || inputs.b[i] === undefined ? 10 : inputs.b[i]) * clamp(params.bLevel[i], 0, 1, 0);
      outputs[i] = crossfade(a, b, position, params.mode[i] | 0);
      channelMix[i] = outputs[i];
    }
    let master = channelMix[3];
    for (let i = 0; i < 3; i++) if (!inputs.outputPatched[i]) master += channelMix[i];
    outputs[3] = master;
    return { outputs, fader: s.fader, state: s };
  }
  return Object.freeze({ finite, clamp, crossfade, createState, process });
});
