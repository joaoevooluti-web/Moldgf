(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfMuDiDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function createState() {
    return { initialized: true, clockHigh: false, resetHigh: false, div2: false, div4: false, div8: false, div16: false };
  }
  function schmitt(value, high) {
    const v = finite(value);
    return high ? v > 0.1 : v >= 1;
  }
  function process(clock, reset, removeClockDC, state) {
    const s = state || createState();
    const resetHigh = finite(reset) >= 1;
    if (resetHigh) s.div2 = s.div4 = s.div8 = s.div16 = false;
    const oldClock = s.clockHigh;
    s.clockHigh = schmitt(clock, s.clockHigh);
    const baseRising = !oldClock && s.clockHigh;
    if (baseRising) {
      const old2 = s.div2;
      s.div2 = !s.div2;
      const rise2 = !old2 && s.div2;
      if (rise2) {
        const old4 = s.div4;
        s.div4 = !s.div4;
        const rise4 = !old4 && s.div4;
        if (rise4) {
          const old8 = s.div8;
          s.div8 = !s.div8;
          const rise8 = !old8 && s.div8;
          if (rise8) s.div16 = !s.div16;
        }
      }
    }
    const offset = removeClockDC ? -5 : 0;
    const outputs = [s.clockHigh,s.div2,s.div4,s.div8,s.div16].map(v => (v ? 10 : 0) + offset);
    return { outputs, states: [s.clockHigh,s.div2,s.div4,s.div8,s.div16], state: s };
  }
  return Object.freeze({ finite, createState, schmitt, process });
});
