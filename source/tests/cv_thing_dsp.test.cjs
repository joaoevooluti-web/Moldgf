const test = require("node:test");
const assert = require("node:assert/strict");
const DSP = require("../app/src/main/assets/cv_thing_dsp.js");

test("creates eight independent input histories", () => {
  const s = DSP.createState();
  assert.equal(s.previous.length, 8);
  assert.equal(s.clockHigh.length, 8);
});
test("maps bipolar CV to MIDI CC range", () => {
  const e = DSP.process({ maps: [{ mode: DSP.modes.CC, cc: 74 }] }, { cv1: -5 }, DSP.createState());
  assert.deepEqual(e[0], { type: "cc", channel: 1, controller: 74, value: 0, input: 0 });
});
test("maps positive full scale to MIDI value 127", () => {
  const e = DSP.process({ maps: [{ mode: DSP.modes.CC }] }, { cv1: 5 }, DSP.createState());
  assert.equal(e[0].value, 127);
});
test("suppresses small CC movements using threshold", () => {
  const s = DSP.createState(), p = { threshold: .05, maps: [{ mode: DSP.modes.CC }] };
  DSP.process(p, { cv1: 0 }, s, 1);
  assert.equal(DSP.process(p, { cv1: .1 }, s, 1).length, 0);
  assert.equal(DSP.process(p, { cv1: 1 }, s, 1).length, 1);
});
test("supports independent CC mappings across all eight physical inputs", () => {
  const maps = Array.from({ length: 8 }, (_, i) => ({ mode: DSP.modes.CC, cc: i + 10 }));
  const inputs = Object.fromEntries(maps.map((_, i) => ["cv" + (i + 1), 5]));
  const e = DSP.process({ maps }, inputs, DSP.createState());
  assert.equal(e.length, 8);
  assert.deepEqual(e.map(x => x.controller), [10,11,12,13,14,15,16,17]);
});
test("V/Oct Note pairs an odd CV input with the following input as Gate", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 60 }] };
  const x = { cv1: 1, cv2: 10 };
  assert.deepEqual(DSP.process(p, x, s)[0], { type: "noteOn", channel: 1, note: 72, velocity: 100, input: 0 });
  assert.equal(DSP.process(p, x, s).length, 0);
});
test("paired Gate falling edge emits note off for the last note", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 60 }] };
  DSP.process(p, { cv1: 1, cv2: 10 }, s);
  const e = DSP.process(p, { cv1: 1, cv2: 0 }, s);
  assert.equal(e[0].type, "noteOff");
  assert.equal(e[0].note, 72);
});
test("the input following a V/Oct Note mapping is reserved as its Gate", () => {
  const maps = [{ mode: DSP.modes.NOTE, note: 60 }, { mode: DSP.modes.CC, cc: 7 }];
  const e = DSP.process({ maps }, { cv1: 0, cv2: 5 }, DSP.createState());
  assert.equal(e.length, 1);
  assert.equal(e[0].type, "noteOn");
  assert.equal(e.some(event => event.type === "cc"), false);
});
test("removing the paired Gate sends note off to avoid a stuck MIDI note", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 64 }] };
  DSP.process(p, { cv1: 0, cv2: 10 }, s);
  const events = DSP.process(p, { cv1: 0 }, s);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "noteOff");
  assert.equal(events[0].note, 64);
});
test("program change maps input voltage to 0..127", () => {
  const e = DSP.process({ maps: [{ mode: DSP.modes.PROGRAM }] }, { cv1: 5 }, DSP.createState());
  assert.deepEqual(e[0], { type: "programChange", channel: 1, program: 127, input: 0 });
});
test("clock mode emits on rising edges above two volts only", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.CLOCK }] };
  assert.equal(DSP.process(p, { cv1: 3 }, s)[0].type, "clock");
  assert.equal(DSP.process(p, { cv1: 5 }, s).length, 0);
  assert.equal(DSP.process(p, { cv1: 0 }, s).length, 0);
  assert.equal(DSP.process(p, { cv1: 3 }, s).length, 1);
});
test("start stop mode reports run state changes", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.START_STOP }] };
  assert.equal(DSP.process(p, { cv1: 3 }, s)[0].type, "start");
  assert.equal(DSP.process(p, { cv1: 5 }, s).length, 0);
  assert.equal(DSP.process(p, { cv1: 0 }, s)[0].type, "stop");
});
test("invalid voltages and channel values are bounded", () => {
  const e = DSP.process({ channel: 99, maps: [{ mode: DSP.modes.CC }] }, { cv1: NaN }, DSP.createState());
  assert.equal(e[0].channel, 16);
  assert.equal(e[0].value, 64);
});
test("unpatched inputs emit no startup MIDI events", () => {
  const s = DSP.createState();
  assert.deepEqual(DSP.process({}, {}, s), []);
  assert.deepEqual(DSP.process({}, {}, s), []);
});
test("CC mapping rearms after its CV cable is removed and reconnected", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.CC, cc: 12 }] };
  assert.equal(DSP.process(p, { cv1: 0 }, s, 1).length, 1);
  assert.equal(DSP.process(p, {}, s, 1).length, 0);
  assert.equal(DSP.process(p, { cv1: 0 }, s, 1).length, 1);
});
test("event array is reused between processing calls", () => {
  const s = DSP.createState(), a = DSP.process({ maps: [{ mode: 0 }] }, { cv1: 0 }, s);
  const b = DSP.process({ maps: [{ mode: 0 }] }, { cv1: 1 }, s);
  assert.equal(a, b);
});

test("Start/Stop mode does not send a spurious STOP when first connected low", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.START_STOP }] };
  assert.equal(DSP.process(p, { cv1: 0 }, s).length, 0);
  assert.equal(DSP.process(p, { cv1: 5 }, s)[0].type, "start");
  assert.equal(DSP.process(p, { cv1: 0 }, s)[0].type, "stop");
});

test("CC and Program Change outputs are rate-limited to four milliseconds", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.CC, cc: 1 }] };
  assert.equal(DSP.process(p, { cv1: 0 }, s, 48000).length, 1);
  for (let i = 0; i < 191; i++) assert.equal(DSP.process(p, { cv1: 5 }, s, 48000).length, 0);
  assert.equal(DSP.process(p, { cv1: 5 }, s, 48000).length, 1);
});
test("V/Oct pitch changes while Gate is high retrigger without leaving the old note held", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 60 }] };
  const first = DSP.process(p, { cv1: 0, cv2: 10 }, s);
  assert.equal(first[0].type, "noteOn");
  const changed = DSP.process(p, { cv1: 1, cv2: 10 }, s);
  assert.deepEqual(changed.map(e => e.type), ["noteOff", "noteOn"]);
  assert.equal(changed[0].note, 60);
  assert.equal(changed[1].note, 72);
});
