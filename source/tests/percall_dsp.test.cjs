const test = require("node:test");
const assert = require("node:assert/strict");
const Percall = require("../app/src/main/assets/percall_dsp.js");

const params = { volume:[1,1,1,1], decay:[0,0,0,0], choke:[false,false] };
const inputs = { audio:[10,10,10,10], trigger:[0,0,0,0], decayCV:[0,0,0,0], strength:null, outputPatched:[false,false,false] };

test("strength input is square-root scaled and defaults to unity", () => {
  assert.equal(Percall.strengthFromVoltage(null), 1);
  assert.equal(Percall.strengthFromVoltage(2.5), 0.5);
  assert.equal(Percall.strengthFromVoltage(10), 1);
});

test("decay CV and control map quadratically from 4.5ms to four seconds", () => {
  assert.equal(Percall.decayTime(0,0), 0.0045);
  assert.equal(Percall.decayTime(1,0), 4);
  assert.ok(Percall.decayTime(0,10) > Percall.decayTime(0,0));
});

test("trigger starts a fixed 1.5ms attack then exponential decay", () => {
  const state = Percall.createState();
  const attack = Percall.process({ ...inputs, trigger:[5,0,0,0] }, params, state, 0.00075);
  assert.equal(attack.stages[0], Percall.ATTACK);
  assert.equal(attack.env[0], 5);
  const peak = Percall.process({ ...inputs, trigger:[5,0,0,0] }, params, state, 0.00075);
  assert.equal(peak.stages[0], Percall.DECAY);
  assert.equal(peak.env[0], 10);
});

test("channel volume is squared and envelope gates its audio path", () => {
  const state = Percall.createState();
  const silent = Percall.process(inputs, { ...params, volume:[0.5,1,1,1] }, state, 0.001);
  assert.equal(silent.outputs[0], 0);
  const active = Percall.process({ ...inputs, trigger:[5,0,0,0] }, { ...params, volume:[0.5,1,1,1] }, state, 0.001);
  assert.ok(active.outputs[0] > 0);
  assert.ok(Math.abs(active.outputs[0] - 10 * 0.25 * (0.001/0.0015)) < 1e-9);
});

test("odd audio inputs normal to the previous even channel", () => {
  const state = Percall.createState();
  const result = Percall.process({ ...inputs, audio:[4,null,0,null], trigger:[5,5,0,0] }, params, state, 0.001);
  assert.equal(result.outputs[0], 4 * (0.001/0.0015));
  assert.equal(result.outputs[1], 4 * (0.001/0.0015));
});

test("unpatched individual outputs sum into channel four master output", () => {
  const state = Percall.createState();
  const result = Percall.process({ ...inputs, trigger:[5,5,5,5] }, params, state, 0.001);
  assert.ok(Math.abs(result.outputs[3] - (result.outputs[0] + result.outputs[1] + result.outputs[2] + 10 * (0.001 / 0.0015))) < 1e-9);
  assert.ok(result.outputs[3] > result.outputs[0]);
});

test("choke switch silences the paired channel during the first channel attack", () => {
  const state = Percall.createState();
  const result = Percall.process({ ...inputs, trigger:[5,5,0,0] }, { ...params, choke:[true,false] }, state, 0.0005);
  assert.equal(result.stages[0], Percall.ATTACK);
  assert.equal(result.stages[1], Percall.OFF);
  assert.equal(result.env[1], 0);
});
