(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfCVThingDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, d) => Number.isFinite(v) ? v : d;
  const MODES = Object.freeze({ CC: 0, NOTE: 1, PROGRAM: 2, CLOCK: 3, START_STOP: 4 });
  function createState() {
    return { previous: Array(8).fill(null), clockHigh: Array(8).fill(false), events: [] };
  }
  function process(params, inputs, state) {
    const p = params || {}, x = inputs || {}, s = state || createState();
    const events = s.events;
    events.length = 0;
    const channels = clamp(Math.round(finite(p.channel, 1)), 1, 16);
    const threshold = clamp(finite(p.threshold, 0.005), 0, 1);
    const maps = Array.isArray(p.maps) ? p.maps : [];
    for (let i = 0; i < 8; i++) {
      const cfg = maps[i] || {};
      const mode = clamp(Math.round(finite(cfg.mode, MODES.CC)), 0, 4);
      const raw = finite(x["cv" + (i + 1)], 0);
      const normalized = clamp((raw + 5) / 10, 0, 1);
      const value = clamp(Math.round(normalized * 127), 0, 127);
      const prev = s.previous[i];
      if (mode === MODES.CC) {
        const cc = clamp(Math.round(finite(cfg.cc, i)), 0, 127);
        if (prev === null || Math.abs(normalized - prev) >= threshold) {
          events.push({ type: "cc", channel: channels, controller: cc, value, input: i });
          s.previous[i] = normalized;
        }
      } else if (mode === MODES.NOTE) {
        const base = clamp(Math.round(finite(cfg.note, 60)), 0, 127);
        const note = clamp(base + Math.round(raw * finite(cfg.octaveScale, 12)), 0, 127);
        const gate = finite(x["gate" + (i + 1)], 0) > 1;
        const wasGate = s.clockHigh[i];
        if (gate && !wasGate) events.push({ type: "noteOn", channel: channels, note, velocity: clamp(Math.round(finite(cfg.velocity, 100)), 1, 127), input: i });
        if (!gate && wasGate) events.push({ type: "noteOff", channel: channels, note: prev === null ? note : prev, velocity: 0, input: i });
        s.clockHigh[i] = gate;
        s.previous[i] = note;
      } else if (mode === MODES.PROGRAM) {
        const program = clamp(Math.round(normalized * 127), 0, 127);
        if (prev === null || Math.abs(normalized - prev) >= threshold) {
          events.push({ type: "programChange", channel: channels, program, input: i });
          s.previous[i] = normalized;
        }
      } else if (mode === MODES.CLOCK) {
        const high = finite(x["gate" + (i + 1)], raw) > 1;
        if (high && !s.clockHigh[i]) events.push({ type: "clock", input: i });
        s.clockHigh[i] = high;
      } else {
        const run = finite(x["gate" + (i + 1)], raw) > 1;
        if (s.previous[i] === null || run !== !!s.previous[i]) {
          events.push({ type: run ? "start" : "stop", input: i });
          s.previous[i] = run ? 1 : 0;
        }
      }
    }
    return events;
  }
  return Object.freeze({ createState, process, modes: MODES });
});
