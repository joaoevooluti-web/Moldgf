const test = require("node:test");
const assert = require("node:assert/strict");
const ADSR = require("../app/src/main/assets/adsr_dsp.js");

const params = { attack: 0, decay: 0, sustain: 0.5, release: 0, shape: 0, retrigger: true, button: false };
const inputs = { gate: 0, trigger: 0, attackCV: 0, decayCV: 0, sustainCV: 0, releaseCV: 0 };

test("stage time controls map exponentially between minimum and ten seconds", () => {
  assert.equal(ADSR.stageTime(0, 0, 0.003), 0.003);
  assert.ok(Math.abs(ADSR.stageTime(1, 0, 0.003) - 10) < 1e-9);
  assert.ok(Math.abs(ADSR.stageTime(0, -10, 0.003, 0.0002) - 0.0002) < 1e-12);
});

test("attack rises to ten volts and exposes the attack gate", () => {
  const state = ADSR.createState();
  const result = ADSR.process(params, { ...inputs, gate: 10 }, state, 0.001);
  assert.equal(result.stage, ADSR.STAGE.ATTACK);
  assert.ok(result.envelope > 0 && result.envelope < 10);
  assert.deepEqual(result.gates, [10,0,0,0]);
});

test("decay reaches sustain and holds while the gate remains high", () => {
  const state = ADSR.createState();
  ADSR.process(params, { ...inputs, gate: 10 }, state, 0.01);
  const result = ADSR.process(params, { ...inputs, gate: 10 }, state, 0.01);
  assert.equal(result.stage, ADSR.STAGE.SUSTAIN);
  assert.equal(result.envelope, 5);
  assert.deepEqual(result.gates, [0,0,10,0]);
});

test("gate falling starts release and returns the envelope to zero", () => {
  const state = ADSR.createState();
  ADSR.process(params, { ...inputs, gate: 10 }, state, 0.01);
  ADSR.process(params, { ...inputs, gate: 10 }, state, 0.01);
  const release = ADSR.process(params, { ...inputs, gate: 0 }, state, 0.001);
  assert.equal(release.stage, ADSR.STAGE.RELEASE);
  assert.equal(release.gates[3], 10);
  const done = ADSR.process(params, { ...inputs, gate: 0 }, state, 0.02);
  assert.equal(done.stage, ADSR.STAGE.IDLE);
  assert.equal(done.envelope, 0);
});

test("trigger input starts an envelope without holding sustain", () => {
  const state = ADSR.createState();
  const attack = ADSR.process(params, { ...inputs, trigger: 10 }, state, 0.001);
  assert.equal(attack.stage, ADSR.STAGE.ATTACK);
  const decay = ADSR.process(params, { ...inputs, trigger: 0 }, state, 0.002);
  assert.equal(decay.stage, ADSR.STAGE.DECAY);
  const release = ADSR.process(params, { ...inputs, trigger: 0 }, state, 0.01);
  assert.equal(release.stage, ADSR.STAGE.RELEASE);
});

test("shape control changes the attack curve and stage CV changes time", () => {
  assert.ok(ADSR.curve(0.5, -1) < ADSR.curve(0.5, 0));
  assert.ok(ADSR.curve(0.5, 1) > ADSR.curve(0.5, 0));
  assert.ok(ADSR.stageTime(0.5, 5, 0.003) > ADSR.stageTime(0.5, 0, 0.003));
});

test("button gate and retrigger reset the envelope", () => {
  const state = ADSR.createState();
  ADSR.process(params, { ...inputs, gate: 10 }, state, 0.001);
  const retrigger = ADSR.process(params, { ...inputs, gate: 10, trigger: 10 }, state, 0.001);
  assert.equal(retrigger.stage, ADSR.STAGE.ATTACK);
  const button = ADSR.process({ ...params, button: true }, inputs, ADSR.createState(), 0.001);
  assert.equal(button.stage, ADSR.STAGE.ATTACK);
});
