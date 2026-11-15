(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMotionMTRDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, finite(value, fallback)));
  }
  function createState() {
    return {
      inputs: [null, null, null],
      outputsPatched: new Uint8Array(2),
      out: new Float64Array(3)
    };
  }
  // Caller-owned state keeps all buffers outside the sample callback.
  // Modes: 0 = CV invert, 1 = CV attenuate, 2 = audio gain.
  function processInto(controls, modes, break10VNormalForAudioMode, state) {
    if (!state || !Array.isArray(state.inputs) || state.inputs.length < 3 ||
        !state.outputsPatched || state.outputsPatched.length < 2 ||
        !state.out || state.out.length < 3 ||
        !controls || controls.length < 3 || !modes || modes.length < 3) return null;
    let channel1 = 0, channel2 = 0, channel3 = 0;
    for (let i = 0; i < 3; i++) {
      const mode = Math.round(clamp(modes[i], 0, 2, 1));
      const normalled = mode === 2 && break10VNormalForAudioMode ? 0 : 10;
      const input = state.inputs[i] === null || state.inputs[i] === undefined
        ? normalled : finite(state.inputs[i], 0);
      const gain = clamp(controls[i], 0, 1, 0);
      const output = input * gain * (mode === 0 ? -1 : 1);
      state.out[i] = output;
      if (i === 0) channel1 = output;
      else if (i === 1) channel2 = output;
      else channel3 = output;
    }
    // OUT1/OUT2 leave the internal OUT3 sum when their jacks are patched.
    state.out[2] = channel3 +
      (state.outputsPatched[0] ? 0 : channel1) +
      (state.outputsPatched[1] ? 0 : channel2);
    return state.out;
  }
  function process(inputs, controls, modes, outputsPatched, break10VNormalForAudioMode) {
    const state = createState();
    if (inputs) {
      state.inputs[0] = inputs[0];
      state.inputs[1] = inputs[1];
      state.inputs[2] = inputs[2];
    }
    if (outputsPatched) {
      state.outputsPatched[0] = outputsPatched[0] ? 1 : 0;
      state.outputsPatched[1] = outputsPatched[1] ? 1 : 0;
    }
    const output = processInto(controls, modes, !!break10VNormalForAudioMode, state);
    return output ? [output[0], output[1], output[2]] : [0, 0, 0];
  }
  function reset(state) {
    if (!state || !Array.isArray(state.inputs) || !state.outputsPatched || !state.out) return false;
    for (let i = 0; i < 3; i++) {
      state.inputs[i] = null;
      state.out[i] = 0;
    }
    state.outputsPatched[0] = 0;
    state.outputsPatched[1] = 0;
    return true;
  }
  return Object.freeze({ finite, clamp, createState, processInto, process, reset });
});
