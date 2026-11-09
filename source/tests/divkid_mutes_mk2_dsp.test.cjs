const test = require("node:test");
const assert = require("node:assert/strict");
const DSP = require("../app/src/main/assets/divkid_mutes_mk2_dsp.js");

test("initial state has four open channels and zeroed outputs", () => {
  const s = DSP.createState();
  assert.deepEqual(s.outputs, [0, 0, 0, 0]);
  assert.deepEqual(s.muted, [false, false, false, false]);
});
test("four independent channels pass their input signals", () => {
  const s = DSP.process({}, { level: [1, -2, 3, -4] }, DSP.createState());
  assert.deepEqual(s.outputs, [1, -2, 3, -4]);
  assert.equal(s.sum, -2);
});
test("mute switches silence only their own channel", () => {
  const s = DSP.process({ mute: [false, true, false, true] }, { level: [1, 2, 3, 4] }, DSP.createState());
  assert.deepEqual(s.outputs, [1, 0, 3, 0]);
  assert.equal(s.sum, 4);
});
test("manual mute controls silence channels independently", () => {
  const s = DSP.process({ manual: [true, false, false, true] }, { level: [1, 2, 3, 4] }, DSP.createState());
  assert.deepEqual(s.outputs, [0, 2, 3, 0]);
});
test("master gain scales the summed output only", () => {
  const s = DSP.process({ master: .5 }, { level: [1, 2, 3, 4] }, DSP.createState());
  assert.deepEqual(s.outputs, [1, 2, 3, 4]);
  assert.equal(s.sum, 5);
});
test("master gain is bounded", () => {
  const s = DSP.process({ master: 9 }, { level: [1, 1, 1, 1] }, DSP.createState());
  assert.equal(s.sum, 8);
});
test("gate inputs generate independent ten volt gate indicators", () => {
  const s = DSP.process({}, { gate: [0, 1, 2, 0] }, DSP.createState());
  assert.deepEqual(s.gates, [0, 10, 10, 0]);
});
test("gate threshold is configurable", () => {
  const s = DSP.process({ threshold: 3 }, { gate: [2, 3, 4, 0] }, DSP.createState());
  assert.deepEqual(s.gates, [0, 10, 10, 0]);
});
test("missing inputs safely resolve to silence", () => {
  const s = DSP.process({}, {}, DSP.createState());
  assert.deepEqual(s.outputs, [0, 0, 0, 0]);
  assert.equal(s.sum, 0);
});
test("non-finite signal inputs are treated as silence", () => {
  const s = DSP.process({}, { level: [NaN, Infinity, -Infinity, 2] }, DSP.createState());
  assert.deepEqual(s.outputs, [0, 0, 0, 2]);
});
test("mute state changes are reflected immediately without stale output", () => {
  const s = DSP.createState();
  DSP.process({}, { level: [1, 2, 3, 4] }, s);
  DSP.process({ mute: [true, true, true, true] }, { level: [1, 2, 3, 4] }, s);
  assert.deepEqual(s.outputs, [0, 0, 0, 0]);
  assert.equal(s.sum, 0);
});
test("result state is reused across process calls", () => {
  const s = DSP.createState();
  assert.equal(DSP.process({}, { level: [1, 1, 1, 1] }, s), s);
  assert.equal(DSP.process({}, { level: [2, 2, 2, 2] }, s), s);
  assert.deepEqual(s.outputs, [2, 2, 2, 2]);
});
