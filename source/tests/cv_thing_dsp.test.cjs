const test = require("node:test");
const assert = require("node:assert/strict");
const DSP = require("../app/src/main/assets/cv_thing_dsp.js");

test("creates eight independent input histories", () => {
  const s = DSP.createState();
  assert.equal(s.previous.length, 8);
  assert.equal(s.clockHigh.length, 8);
});
test("maps bipolar CV to MIDI CC range", () => {
  const s = DSP.createState();
  const e = DSP.process({ maps: [{ mode: DSP.modes.CC, cc: 74 }] }, { cv1: -5 }, s);
  assert.deepEqual(e[0], { type: "cc", channel: 1, controller: 74, value: 0, input: 0 });
});
test("maps positive full scale to MIDI value 127", () => {
  const e = DSP.process({ maps: [{ mode: 0 }] }, { cv1: 5 }, DSP.createState());
  assert.equal(e[0].value, 127);
});
test("suppresses small CC movements using threshold", () => {
  const s = DSP.createState(), p = { threshold: .05, maps: [{ mode: 0 }] };
  DSP.process(p, { cv1: 0 }, s);
  assert.equal(DSP.process(p, { cv1: .1 }, s).length, 0);
  assert.equal(DSP.process(p, { cv1: 1 }, s).length, 1);
});
test("supports independent CC mappings across eight inputs", () => {
  const maps = Array.from({ length: 8 }, (_, i) => ({ mode: 0, cc: i + 10 }));
  const e = DSP.process({ maps }, Object.fromEntries(maps.map((_, i) => ["cv" + (i + 1), 5])), DSP.createState());
  assert.equal(e.length, 8);
  assert.deepEqual(e.map(x => x.controller), [10,11,12,13,14,15,16,17]);
});
test("note mode emits note on only on gate rising edge", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 60 }] };
  const x = { cv1: 0, gate1: 10 };
  assert.equal(DSP.process(p, x, s)[0].type, "noteOn");
  assert.equal(DSP.process(p, x, s).length, 0);
});
test("note mode emits note off on gate falling edge", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 60 }] };
  DSP.process(p, { gate1: 10 }, s);
  const e = DSP.process(p, { gate1: 0 }, s);
  assert.equal(e[0].type, "noteOff");
  assert.equal(e[0].note, 60);
});
test("program change maps input voltage to 0..127", () => {
  const e = DSP.process({ maps: [{ mode: DSP.modes.PROGRAM }] }, { cv1: 5 }, DSP.createState());
  assert.deepEqual(e[0], { type: "programChange", channel: 1, program: 127, input: 0 });
});
test("clock mode emits on rising edges only", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.CLOCK }] };
  assert.equal(DSP.process(p, { gate1: 10 }, s)[0].type, "clock");
  assert.equal(DSP.process(p, { gate1: 10 }, s).length, 0);
  assert.equal(DSP.process(p, { gate1: 0 }, s).length, 0);
  assert.equal(DSP.process(p, { gate1: 10 }, s).length, 1);
});
test("start stop mode reports run state changes", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.START_STOP }] };
  assert.equal(DSP.process(p, { gate1: 10 }, s)[0].type, "start");
  assert.equal(DSP.process(p, { gate1: 10 }, s).length, 0);
  assert.equal(DSP.process(p, { gate1: 0 }, s)[0].type, "stop");
});
test("invalid voltages and channel values are bounded", () => {
  const e = DSP.process({ channel: 99, maps: [{ mode: 0 }] }, { cv1: NaN }, DSP.createState());
  assert.equal(e[0].channel, 16);
  assert.equal(e[0].value, 64);
});
test("event array is reused between processing calls", () => {
  const s = DSP.createState(), a = DSP.process({ maps: [{ mode: 0 }] }, { cv1: 0 }, s);
  const b = DSP.process({ maps: [{ mode: 0 }] }, { cv1: 1 }, s);
  assert.equal(a, b);
});

test("unpatched inputs emit no startup MIDI events", () => {
  const s = DSP.createState();
  assert.deepEqual(DSP.process({}, {}, s), []);
  assert.deepEqual(DSP.process({}, {}, s), []);
});
test("CC mapping rearms after its CV cable is removed and reconnected", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.CC, cc: 12 }] };
  assert.equal(DSP.process(p, { cv1: 0 }, s).length, 1);
  assert.equal(DSP.process(p, {}, s).length, 0);
  assert.equal(DSP.process(p, { cv1: 0 }, s).length, 1);
});
test("removing a note gate sends note off to avoid a stuck MIDI note", () => {
  const s = DSP.createState(), p = { maps: [{ mode: DSP.modes.NOTE, note: 64 }] };
  assert.equal(DSP.process(p, { cv1: 0, gate1: 10 }, s)[0].type, "noteOn");
  const events = DSP.process(p, {}, s);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "noteOff");
  assert.equal(events[0].note, 64);
});
