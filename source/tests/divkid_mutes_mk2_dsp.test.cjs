const test = require("node:test");
const assert = require("node:assert/strict");
const DSP = require("../app/src/main/assets/divkid_mutes_mk2_dsp.js");

test("initial state has four silent channels", () => {
  const s = DSP.createState();
  assert.deepEqual(s.outputs, [0, 0, 0, 0]);
  assert.deepEqual(s.envelope, [0, 0, 0, 0]);
});
test("on switches open their channels while off switches mute", () => {
  const s = DSP.createState();
  DSP.process({ switches: [1, 0, 1, 0], response: .001 }, { input: [1, 2, 3, 4] }, s, 48000);
  for (let n = 0; n < 500; n++) DSP.process({ switches: [1, 0, 1, 0], response: .001 }, { input: [1, 2, 3, 4] }, s, 48000);
  assert.ok(s.outputs[0] > .99); assert.equal(s.outputs[1], 0);
  assert.ok(s.outputs[2] > 2.99); assert.equal(s.outputs[3], 0);
});
test("momentary position passes only while its switch is held", () => {
  const s = DSP.createState();
  DSP.process({ switches: [-1, -1, -1, -1], held: [true, false, true, false], response: .001 }, { input: [1, 2, 3, 4] }, s, 48000);
  for (let n = 0; n < 500; n++) DSP.process({ switches: [-1, -1, -1, -1], held: [true, false, true, false], response: .001 }, { input: [1, 2, 3, 4] }, s, 48000);
  assert.ok(s.outputs[0] > .99); assert.equal(s.outputs[1], 0);
  assert.ok(s.outputs[2] > 2.99); assert.equal(s.outputs[3], 0);
});
test("momentary switch returns to muted when released", () => {
  const s = DSP.createState();
  for (let n = 0; n < 500; n++) DSP.process({ switches: [-1, 0, 0, 0], held: [true] , response: .001 }, { input: [1] }, s, 48000);
  for (let n = 0; n < 500; n++) DSP.process({ switches: [-1, 0, 0, 0], held: [false], response: .001 }, { input: [1] }, s, 48000);
  assert.equal(s.outputs[0], 0);
});
test("inputs cascade-normalise when a later input is unpatched", () => {
  const s = DSP.createState();
  for (let n = 0; n < 500; n++) DSP.process({ switches: [1, 1, 1, 1], response: .001 }, { input: [2] }, s, 48000);
  assert.ok(s.outputs.every(v => Math.abs(v - 2) < .001));
});
test("a later patched input becomes the source for its channel and following normalled channels", () => {
  const s = DSP.createState();
  for (let n = 0; n < 500; n++) DSP.process({ switches: [1, 1, 1, 1], response: .001 }, { input: [2, 5] }, s, 48000);
  assert.ok(Math.abs(s.outputs[0] - 2) < .001);
  assert.ok(s.outputs.slice(1).every(v => Math.abs(v - 5) < .001));
});
test("mute transitions are click-free ramps rather than abrupt discontinuities", () => {
  const s = DSP.createState();
  for (let n = 0; n < 1000; n++) DSP.process({ switches: [1], response: .01 }, { input: [1] }, s, 48000);
  const before = s.outputs[0];
  DSP.process({ switches: [0], response: .01 }, { input: [1] }, s, 48000);
  assert.ok(s.outputs[0] < before && s.outputs[0] > 0);
});
test("invalid inputs are finite and cascade from silence", () => {
  const s = DSP.createState();
  DSP.process({ switches: [1, 1, 1, 1], response: NaN }, { input: [NaN, Infinity] }, s, 48000);
  assert.ok(s.outputs.every(Number.isFinite));
});
test("switch positions are clamped to momentary, off and on", () => {
  const s = DSP.createState();
  for (let n = 0; n < 500; n++) DSP.process({ switches: [99, -99, 1, 0], response: .001 }, { input: [1, 2, 3, 4] }, s, 48000);
  assert.ok(s.outputs[0] > .99); assert.equal(s.outputs[1], 0);
});
test("output levels preserve the input signal amplitude when fully open", () => {
  const s = DSP.createState();
  for (let n = 0; n < 500; n++) DSP.process({ switches: [1, 1, 1, 1], response: .001 }, { input: [.25, -.5, 2, -4] }, s, 48000);
  assert.ok(s.outputs.every((v, i) => Math.abs(v - [.25, -.5, 2, -4][i]) < .001));
});
test("processing reuses the supplied state object", () => {
  const s = DSP.createState();
  assert.equal(DSP.process({}, {}, s, 48000), s);
});
