const test = require("node:test");
const assert = require("node:assert/strict");
const Morphader = require("../app/src/main/assets/morphader_dsp.js");

const base = {
  fader: -1, lag: 0.01, cvAtt: 1,
  aLevel: [1,1,1,1], bLevel: [1,1,1,1], mode: [1,1,1,1]
};
const inputs = {
  cv: [null,null,null,null], a: [10,10,10,10], b: [0,0,0,0],
  outputPatched: [false,false,false]
};

test("CV mode crossfades linearly between A and B", () => {
  assert.equal(Morphader.crossfade(10, 0, -1, 1), 10);
  assert.equal(Morphader.crossfade(10, 0, 0, 1), 5);
  assert.equal(Morphader.crossfade(10, 0, 1, 1), 0);
});

test("audio mode uses an equal-power crossfade curve", () => {
  assert.ok(Math.abs(Morphader.crossfade(10, 0, 0, 0) - 10 / Math.sqrt(2)) < 1e-9);
  assert.equal(Morphader.crossfade(10, 0, -1, 0), 10);
  assert.ok(Math.abs(Morphader.crossfade(0, 10, 1, 0) - 10) < 1e-9);
});

test("master fader lag moves toward its target without an abrupt jump", () => {
  const state = Morphader.createState();
  Morphader.process(inputs, { ...base, fader: 0, lag: 1 }, state, 0.01);
  const first = Morphader.process(inputs, { ...base, fader: 1, lag: 1 }, state, 0.01);
  assert.ok(first.fader > 0 && first.fader < 1);
  let result = first;
  for (let i = 0; i < 1000; i++) result = Morphader.process(inputs, { ...base, fader: 1, lag: 0.01 }, state, 0.01);
  assert.ok(result.fader > 0.99);
});

test("channel-one CV is attenuated and offsets the master fader", () => {
  const state = Morphader.createState();
  const result = Morphader.process({ ...inputs, cv: [5,null,null,null] }, { ...base, fader: -1, cvAtt: 1 }, state, 1);
  assert.equal(result.outputs[0], 5);
});

test("a channel-specific CV overrides the master and CV1 normaling", () => {
  const state = Morphader.createState();
  const result = Morphader.process({ ...inputs, cv: [10,5,null,null] }, { ...base, fader: -1, cvAtt: 1 }, state, 1);
  assert.equal(result.outputs[0], 0);
  assert.equal(result.outputs[1], 5);
});

test("unpatched channel outputs are summed into the fourth master output", () => {
  const state = Morphader.createState();
  const result = Morphader.process(inputs, { ...base, fader: -1 }, state, 1);
  assert.equal(result.outputs[3], 40);
  const separated = Morphader.process({ ...inputs, outputPatched: [true,true,true] }, { ...base, fader: -1 }, Morphader.createState(), 1);
  assert.equal(separated.outputs[3], 10);
});
