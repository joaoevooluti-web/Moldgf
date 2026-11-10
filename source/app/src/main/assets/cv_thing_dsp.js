(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfCVThingDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, d) => Number.isFinite(v) ? v : d;
  const MODES = Object.freeze({ CC: 0, NOTE: 1, PROGRAM: 2, CLOCK: 3, START_STOP: 4, NRPN: 5, PITCH_BEND: 6 });
  function createState() {
    return { previous: Array(8).fill(null), clockHigh: Array(8).fill(false), cooldown: Array(8).fill(0), events: [] };
  }
  function process(params, inputs, state, sampleRate) {
    const p = params || {}, x = inputs || {}, s = state || createState();
    const events = s.events;
    events.length = 0;
    const channel = clamp(Math.round(finite(p.channel, 1)), 1, 16);
    const threshold = clamp(finite(p.threshold, 0.005), 0, 1);
    const midiInterval = Math.max(1, Math.round((finite(sampleRate, 48000) * 0.004)));
    const maps = Array.isArray(p.maps) ? p.maps : [];
    for (let i = 0; i < 8; i++) {
      const cfg = maps[i] || {};
      // The even-numbered jack following a V/Oct Note mapping is reserved as its gate.
      if (i > 0 && maps[i - 1] && Math.round(finite(maps[i - 1].mode, MODES.CC)) === MODES.NOTE) continue;
      const mode = clamp(Math.round(finite(cfg.mode, MODES.CC)), 0, 6);
      const cv = x["cv" + (i + 1)];
      const raw = finite(cv, 0);
      const normalized = clamp((raw + 5) / 10, 0, 1);
      const value = clamp(Math.round(normalized * 127), 0, 127);
      const previous = s.previous[i];
      if (s.cooldown[i] > 0) s.cooldown[i]--;

      if (mode === MODES.CC) {
        if (cv == null) { s.previous[i] = null; continue; }
        const controller = clamp(Math.round(finite(cfg.cc, i)), 0, 127);
        if ((previous === null || Math.abs(normalized - previous) >= threshold) && s.cooldown[i] <= 0) {
          events.push({ type: "cc", channel, controller, value, input: i });
          s.previous[i] = normalized;
          s.cooldown[i] = midiInterval;
        }
      } else if (mode === MODES.NOTE) {
        // Hardware behavior: an odd CV input is paired with the following even input as Gate.
        // Even-numbered mapping rows cannot start a second note mapping while serving as a gate.
        if ((i & 1) !== 0) continue;
        const gate = x["cv" + (i + 2)];
        if (cv == null || gate == null) {
          if (s.clockHigh[i]) events.push({ type: "noteOff", channel, note: previous === null ? 60 : previous, velocity: 0, input: i });
          s.clockHigh[i] = false;
          s.previous[i] = null;
          continue;
        }
        const base = clamp(Math.round(finite(cfg.note, 60)), 0, 127);
        const note = clamp(base + Math.round(raw * finite(cfg.octaveScale, 12)), 0, 127);
        const high = finite(gate, 0) > 1;
        if (high && !s.clockHigh[i]) events.push({ type: "noteOn", channel, note, velocity: clamp(Math.round(finite(cfg.velocity, 100)), 1, 127), input: i });
        else if (high && s.clockHigh[i] && previous !== note) {
          events.push({ type: "noteOff", channel, note: previous === null ? note : previous, velocity: 0, input: i });
          events.push({ type: "noteOn", channel, note, velocity: clamp(Math.round(finite(cfg.velocity, 100)), 1, 127), input: i });
        }
        if (!high && s.clockHigh[i]) events.push({ type: "noteOff", channel, note: previous === null ? note : previous, velocity: 0, input: i });
        s.clockHigh[i] = high;
        s.previous[i] = note;
      } else if (mode === MODES.PROGRAM) {
        if (cv == null) { s.previous[i] = null; continue; }
        const program = value;
        if ((previous === null || Math.abs(normalized - previous) >= threshold) && s.cooldown[i] <= 0) {
          events.push({ type: "programChange", channel, program, input: i });
          s.previous[i] = normalized;
          s.cooldown[i] = midiInterval;
        }
      } else if (mode === MODES.NRPN || mode === MODES.PITCH_BEND) {
        if (cv == null) { s.previous[i] = null; continue; }
        if ((previous === null || Math.abs(normalized - previous) >= threshold) && s.cooldown[i] <= 0) {
          if (mode === MODES.NRPN) {
            events.push({ type: "nrpn", channel, parameter: clamp(Math.round(finite(cfg.cc, 0)), 0, 16383), value: clamp(Math.round(normalized * 16383), 0, 16383), input: i });
          } else {
            events.push({ type: "pitchBend", channel, value: clamp(Math.round(normalized * 16383), 0, 16383), input: i });
          }
          s.previous[i] = normalized;
          s.cooldown[i] = midiInterval;
        }
      } else if (mode === MODES.CLOCK) {
        if (cv == null) { s.clockHigh[i] = false; continue; }
        const high = raw > 2;
        if (high && !s.clockHigh[i]) events.push({ type: "clock", input: i });
        s.clockHigh[i] = high;
      } else {
        if (cv == null) {
          if (s.previous[i] === 1) events.push({ type: "stop", input: i });
          s.previous[i] = null;
          continue;
        }
        const run = raw > 2;
        if (previous === null) {
          s.previous[i] = run ? 1 : 0;
          if (run) events.push({ type: "start", input: i });
        } else if (run !== !!previous) {
          events.push({ type: run ? "start" : "stop", input: i });
          s.previous[i] = run ? 1 : 0;
        }
      }
    }
    return events;
  }
  return Object.freeze({ createState, process, modes: MODES });
});
