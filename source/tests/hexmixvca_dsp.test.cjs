const test = require("node:test");
const assert = require("node:assert/strict");
const Hexmix = require("../app/src/main/assets/hexmixvca_dsp.js");

const controls = { shape: [0,0,0,0,0,0], level: [1,1,1,1,1,1] };

test("each VCA uses a normalized 10V CV input and linear response at neutral shape", () => {
  assert.equal(Hexmix.gainCurve(10 / 10, 0), 1);
  assert.equal(Hexmix.gainCurve(5 / 10, 0), 0.5);
  assert.equal(Hexmix.process({ signal: [2,0,0,0,0,0], cv: [null,null,null,null,null,null] }, controls, [false,false,false,false,false], true)[0], 2);
});

test("negative shape blends toward a fourth-power exponential response", () => {
  assert.equal(Hexmix.gainCurve(0.5, -1), 0.0625);
  assert.equal(Hexmix.gainCurve(0.5, 0), 0.5);
});

test("positive shape blends toward the logarithmic response", () => {
  assert.ok(Hexmix.gainCurve(0.5, 1) > 0.5);
  assert.equal(Hexmix.gainCurve(1, 1), 1);
});

test("unpatched outputs one through five are summed into the sixth output", () => {
  const inputs = { signal: [1,2,3,4,5,6], cv: [null,null,null,null,null,null] };
  assert.deepEqual(Hexmix.process(inputs, controls, [false,false,false,false,false], true), [1,2,3,4,5,21]);
});

test("patched channels are removed from the final mix while their own outputs stay available", () => {
  const inputs = { signal: [1,2,3,4,5,6], cv: [null,null,null,null,null,null] };
  assert.deepEqual(Hexmix.process(inputs, controls, [true,false,true,false,false], true), [1,2,3,4,5,17]);
});

test("final row can be switched to independent output mode", () => {
  const inputs = { signal: [1,2,3,4,5,6], cv: [null,null,null,null,null,null] };
  assert.equal(Hexmix.process(inputs, controls, [false,false,false,false,false], false)[5], 6);
});
