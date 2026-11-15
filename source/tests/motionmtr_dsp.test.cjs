const test = require("node:test");
const assert = require("node:assert/strict");
const Motion = require("../app/src/main/assets/motionmtr_dsp.js");

test("CV inversion mode reverses polarity and CV attenuation preserves polarity", () => {
  assert.deepEqual(Motion.process([5,5,0],[1,1,1],[0,1,1],[true,true],true),[-5,5,0]);
});

test("audio mode is positive gain and does not invert", () => {
  assert.deepEqual(Motion.process([-5,0,0],[0.5,1,1],[2,2,2],[true,true],true),[-2.5,0,0]);
});

test("CV modes normalize unpatched inputs to ten volts", () => {
  assert.deepEqual(Motion.process([null,null,null],[0.5,0.25,1],[1,1,1],[true,true],true),[5,2.5,10]);
});

test("audio mode can break the ten-volt normaling", () => {
  assert.deepEqual(Motion.process([null,null,null],[1,1,1],[2,2,2],[true,true],true),[0,0,0]);
  assert.deepEqual(Motion.process([null,null,null],[1,1,1],[2,2,2],[true,true],false),[10,10,10]);
});

test("unpatched channel outputs are summed into OUT3", () => {
  assert.deepEqual(Motion.process([2,3,4],[1,1,1],[1,1,1],[false,false],true),[2,3,9]);
});

test("patched OUT1 and OUT2 are removed from the OUT3 mix", () => {
  assert.deepEqual(Motion.process([2,3,4],[1,1,1],[1,1,1],[true,false],true),[2,3,7]);
});

test("processInto writes to stable caller-owned input, patch and output buffers", () => {
  const state = Motion.createState();
  const inputs = state.inputs;
  const patchState = state.outputsPatched;
  const output = state.out;
  state.inputs[0] = 5;
  state.inputs[1] = null;
  state.inputs[2] = null;
  assert.strictEqual(Motion.processInto([0.5,0.25,0.5],[1,1,1],true,state),output);
  assert.deepEqual(Array.from(output),[2.5,2.5,10]);
  state.inputs[0] = 5;
  state.outputsPatched[0] = 1;
  state.outputsPatched[1] = 1;
  assert.strictEqual(Motion.processInto([0.5,0.25,0.5],[1,1,1],true,state),output);
  assert.deepEqual(Array.from(output),[2.5,2.5,5]);
  assert.strictEqual(state.inputs,inputs);
  assert.strictEqual(state.outputsPatched,patchState);
  assert.strictEqual(state.out,output);
});

test("processInto clamps modes and gain and keeps non-finite inputs finite", () => {
  const state = Motion.createState();
  state.inputs[0] = Infinity;
  state.inputs[1] = -5;
  state.inputs[2] = null;
  const output = Motion.processInto([-1,2,NaN],[99,-1,NaN],false,state);
  assert.deepEqual(Array.from(output),[0,5,0]);
  assert.ok(Array.from(output).every(Number.isFinite));
});

test("reset clears runtime buffers and output-normaling state without replacing them", () => {
  const state = Motion.createState();
  const inputs = state.inputs, outputs = state.out, patched = state.outputsPatched;
  state.inputs[0] = 5;
  state.outputsPatched[0] = 1;
  state.out[0] = 2.5;
  assert.equal(Motion.reset(state),true);
  assert.deepEqual(state.inputs,[null,null,null]);
  assert.deepEqual(Array.from(state.out),[0,0,0]);
  assert.deepEqual(Array.from(state.outputsPatched),[0,0]);
  assert.strictEqual(state.inputs,inputs);
  assert.strictEqual(state.out,outputs);
  assert.strictEqual(state.outputsPatched,patched);
});

test("processInto rejects incomplete runtime state", () => {
  assert.equal(Motion.processInto([1,1,1],[1,1,1],false,null),null);
  assert.equal(Motion.processInto([1,1,1],[1,1,1],false,{inputs:[],outputsPatched:new Uint8Array(2),out:new Float64Array(3)}),null);
});
