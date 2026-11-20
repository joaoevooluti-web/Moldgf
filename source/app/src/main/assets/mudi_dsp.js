(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMuDiDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function createState() {
    return {
      clockHigh: false, resetHigh: false,
      div2: false, div4: false, div8: false, div16: false,
      outputs: new Float32Array(7), states: new Uint8Array(5)
    };
  }
  function reset(state) {
    if (!state) return false;
    state.clockHigh = state.resetHigh = false;
    state.div2 = state.div4 = state.div8 = state.div16 = false;
    if (state.outputs) state.outputs.fill(0);
    if (state.states) state.states.fill(0);
    return true;
  }
  function schmitt(value, high) {
    const v = finite(value);
    return high ? v > 0.1 : v >= 2.0;
  }
  function processInto(clock, resetInput, removeClockDC, state) {
    if (!state || !state.outputs || state.outputs.length < 7 || !state.states || state.states.length < 5) {
      throw new TypeError("MuDi processInto requires a state from createState()");
    }
    const s = state;
    const resetHigh = finite(resetInput) >= 2.0;
    const oldClock = s.clockHigh;
    s.clockHigh = schmitt(clock, s.clockHigh);
    const baseRising = !oldClock && s.clockHigh;
    s.resetHigh = resetHigh;
    if (resetHigh) {
      s.div2 = s.div4 = s.div8 = s.div16 = false;
    } else if (baseRising) {
      const old2 = s.div2;
      s.div2 = !s.div2;
      if (!old2 && s.div2) {
        const old4 = s.div4;
        s.div4 = !s.div4;
        if (!old4 && s.div4) {
          const old8 = s.div8;
          s.div8 = !s.div8;
          if (!old8 && s.div8) s.div16 = !s.div16;
        }
      }
    }
    const offset = removeClockDC ? -5 : 0;
    const high = 10 + offset, low = offset;
    const out = s.outputs;
    out[0] = out[1] = out[2] = s.clockHigh ? high : low;
    out[3] = s.div2 ? high : low;
    out[4] = s.div4 ? high : low;
    out[5] = s.div8 ? high : low;
    out[6] = s.div16 ? high : low;
    const states = s.states;
    states[0] = s.clockHigh ? 1 : 0;
    states[1] = s.div2 ? 1 : 0;
    states[2] = s.div4 ? 1 : 0;
    states[3] = s.div8 ? 1 : 0;
    states[4] = s.div16 ? 1 : 0;
    return out;
  }
  // Compatibility API: retain the original five-output shape (base + divisions).
  function process(clock, resetInput, removeClockDC, state) {
    const s = state || createState();
    processInto(clock, resetInput, removeClockDC, s);
    return {
      outputs: [s.outputs[0], s.outputs[3], s.outputs[4], s.outputs[5], s.outputs[6]],
      states: [s.clockHigh, s.div2, s.div4, s.div8, s.div16],
      state: s
    };
  }
  return Object.freeze({ finite, createState, reset, schmitt, processInto, process });
});