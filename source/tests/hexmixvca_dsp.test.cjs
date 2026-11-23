const test = require("node:test");
const assert = require("node:assert/strict");
const Hexmix = require("../app/src/main/assets/hexmixvca_dsp.js");

const controls = { shape: [0,0,0,0,0,0], level: [1,1,1,1,1,1] };

test("unpatched CV normalizes to 10 V and linear gain is deterministic", () => {
  const state = Hexmix.createState();
  state.inputs.signal[0] = 2;
  state.inputs.cv[0] = null;
  state.inputs.signal[1] = 2;
  state.inputs.cv[1] = 5;
  state.inputs.signal[2] = 2;
  state.inputs.cv[2] = 0;
  state.inputs.signal[3] = 2;
  state.inputs.cv[3] = 20;
  state.inputs.signal[4] = 2;
  state.inputs.cv[4] = -5;
  state.inputs.signal[5] = 2;
  state.inputs.cv[5] = undefined;
  const out = Hexmix.processInto(controls, state, false);
  assert.strictEqual(out, state.out);
  assert.deepEqual(Array.from(out), [2,1,0,2,0,2]);
});

test("negative shape blends toward the fourth-power response", () => {
  assert.equal(Hexmix.gainCurve(0.5, -1), 0.0625);
  assert.equal(Hexmix.gainCurve(0.5, 0), 0.5);
});

test("positive shape blends toward the logarithmic response", () => {
  assert.ok(Hexmix.gainCurve(0.5, 1) > 0.5);
  assert.equal(Hexmix.gainCurve(1, 1), 1);
});

test("OUT 6 sums unpatched channels one through five while individual outputs remain", () => {
  const state = Hexmix.createState();
  state.inputs.signal = [1,2,3,4,5,6];
  state.inputs.cv.fill(null);
  state.outputPatched.set([1,0,1,0,0]);
  const out = Hexmix.processInto(controls, state, true);
  assert.deepEqual(Array.from(out), [1,2,3,4,5,17]);
  assert.strictEqual(out, state.out);
});

test("OUT 6 can be switched to independent channel six", () => {
  const state = Hexmix.createState();
  state.inputs.signal = [1,2,3,4,5,6];
  state.inputs.cv.fill(null);
  state.outputPatched.set([0,0,0,0,0]);
  assert.equal(Hexmix.processInto(controls, state, false)[5], 6);
});

test("level and CV boundaries are clamped without clipping the signal path", () => {
  const state = Hexmix.createState();
  state.inputs.signal = [2,2,2,2,2,2];
  state.inputs.cv = [5,10,10,10,10,10];
  const bounded = { shape:[2,0,0,0,0,0], level:[2,-1,1,1,1,1] };
  const out = Hexmix.processInto(bounded, state, false);
  assert.ok(Math.abs(out[0] - (2 * Hexmix.gainCurve(0.5,1))) < 1e-12);
  assert.equal(out[1], 0);
  assert.equal(out[2], 2);
});

test("reset clears scratch, patch status and outputs without replacing buffers", () => {
  const state = Hexmix.createState();
  const inputs = state.inputs, signals = inputs.signal, cvs = inputs.cv, patch = state.outputPatched, out = state.out;
  inputs.signal.fill(2);
  inputs.cv.fill(5);
  patch.fill(1);
  out.fill(7);
  assert.strictEqual(Hexmix.reset(state), state);
  assert.strictEqual(state.inputs, inputs);
  assert.strictEqual(state.inputs.signal, signals);
  assert.strictEqual(state.inputs.cv, cvs);
  assert.strictEqual(state.outputPatched, patch);
  assert.strictEqual(state.out, out);
  assert.deepEqual(state.inputs.signal, Array(6).fill(null));
  assert.deepEqual(state.inputs.cv, Array(6).fill(null));
  assert.deepEqual(Array.from(patch), [0,0,0,0,0]);
  assert.deepEqual(Array.from(out), [0,0,0,0,0,0]);
});

test("process wrapper retains the legacy six-value array contract", () => {
  const inputs = { signal: [1,2,3,4,5,6], cv: [null,null,null,null,null,null] };
  assert.deepEqual(Hexmix.process(inputs, controls, [true,false,true,false,false], true), [1,2,3,4,5,17]);
});