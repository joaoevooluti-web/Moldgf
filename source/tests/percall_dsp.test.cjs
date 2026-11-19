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

test("processInto reuses its result, output and input buffers across samples", () => {
  const state = Percall.createState();
  const inputBuffers = [state.inputs.audio, state.inputs.trigger, state.inputs.decayCV, state.inputs.outputPatched];
  const outputBuffers = [state.out, state.envOut, state.gains, state.stage, state.normalizedAudio, state.channels];
  const result = Percall.processInto(inputs, params, state, 0.001);
  assert.strictEqual(result, state.result);
  assert.strictEqual(result.outputs, state.out);
  assert.strictEqual(result.env, state.envOut);
  assert.strictEqual(result.gains, state.gains);
  assert.strictEqual(result.stages, state.stage);
  for (let i = 0; i < 100; i++) assert.strictEqual(Percall.processInto(inputs, params, state, 1/48000), result);
  for (let i = 0; i < inputBuffers.length; i++) assert.strictEqual([state.inputs.audio, state.inputs.trigger, state.inputs.decayCV, state.inputs.outputPatched][i], inputBuffers[i]);
  for (let i = 0; i < outputBuffers.length; i++) assert.strictEqual([state.out, state.envOut, state.gains, state.stage, state.normalizedAudio, state.channels][i], outputBuffers[i]);
});

test("reset clears envelope, trigger edge memory, CV scratch and output buffers", () => {
  const state = Percall.createState();
  Percall.processInto({ ...inputs, trigger:[5,0,0,0] }, params, state, 0.0015);
  assert.equal(state.stage[0], Percall.DECAY);
  const references = [state.env, state.stage, state.attackElapsed, state.decayElapsed, state.triggerHigh, state.out, state.envOut];
  assert.strictEqual(Percall.reset(state), state);
  assert.deepEqual(state.env, [0,0,0,0]);
  assert.deepEqual(state.stage, [Percall.OFF, Percall.OFF, Percall.OFF, Percall.OFF]);
  assert.deepEqual(state.triggerHigh, [false,false,false,false]);
  assert.deepEqual(state.out, [0,0,0,0]);
  assert.deepEqual(state.envOut, [0,0,0,0]);
  for (let i = 0; i < references.length; i++) assert.strictEqual([state.env, state.stage, state.attackElapsed, state.decayElapsed, state.triggerHigh, state.out, state.envOut][i], references[i]);
});

test("patched channel-one output is excluded from Percall master while CV strength scales envelope outputs", () => {
  const state = Percall.createState();
  const result = Percall.process({ ...inputs, trigger:[5,5,5,5], strength:2.5, outputPatched:[true,false,false] }, params, state, 0.001);
  const channel = 10 * (0.001/0.0015) * 0.5;
  assert.ok(Math.abs(result.outputs[0] - channel) < 1e-9);
  assert.ok(Math.abs(result.outputs[3] - (channel * 3)) < 1e-9);
  assert.ok(Math.abs(result.env[0] - 10 * (0.001/0.0015) * 0.5) < 1e-9);
  assert.equal(result.strength, 0.5);
});
