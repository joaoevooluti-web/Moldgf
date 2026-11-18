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


test("processInto mutates caller-owned state and reuses its gate and input buffers", () => {
  const state = ADSR.createState();
  const gates = state.gates;
  const inputScratch = state.inputs;
  inputScratch.gate = 10;
  const envelope = ADSR.processInto(params, inputScratch, state, 0.001);
  assert.equal(typeof envelope, "number");
  assert.equal(envelope, state.env);
  assert.deepEqual(Array.from(state.gates), [10, 0, 0, 0]);
  for (let i = 0; i < 32; i++) ADSR.processInto(params, inputScratch, state, 1 / 48000);
  assert.strictEqual(state.gates, gates);
  assert.strictEqual(state.inputs, inputScratch);
});

test("reset clears stage, edge memory, envelope and gate outputs without replacing buffers", () => {
  const state = ADSR.createState();
  const gates = state.gates;
  const inputScratch = state.inputs;
  inputScratch.gate = 10;
  ADSR.processInto(params, inputScratch, state, 0.001);
  assert.equal(state.gateHigh, true);
  ADSR.reset(state);
  assert.equal(state.stage, ADSR.STAGE.IDLE);
  assert.equal(state.env, 0);
  assert.equal(state.gateHigh, false);
  assert.equal(state.triggerHigh, false);
  assert.equal(state.buttonHigh, false);
  assert.deepEqual(Array.from(state.gates), [0, 0, 0, 0]);
  assert.strictEqual(state.gates, gates);
  assert.strictEqual(state.inputs, inputScratch);
});

test("process compatibility wrapper and allocation-free path produce identical stage transitions", () => {
  const fastState = ADSR.createState();
  const compatState = ADSR.createState();
  const fastInputs = { ...inputs, gate: 10 };
  const compatInputs = { ...inputs, gate: 10 };
  for (let n = 0; n < 400; n++) {
    const fast = ADSR.processInto(params, fastInputs, fastState, 1 / 48000);
    const compat = ADSR.process(params, compatInputs, compatState, 1 / 48000);
    assert.equal(fast, compat.envelope);
    assert.equal(fastState.stage, compatState.stage);
    assert.deepEqual(Array.from(fastState.gates), compat.gates);
  }
});


test("gate mode starts release as soon as the gate falls", () => {
  const state = ADSR.createState();
  const modeParams = { ...params, mode: 0 };
  const scratch = state.inputs;
  scratch.gate = 10;
  ADSR.processInto(modeParams, scratch, state, 0.001);
  scratch.gate = 0;
  ADSR.processInto(modeParams, scratch, state, 0.001);
  assert.equal(state.stage, ADSR.STAGE.RELEASE);
  assert.deepEqual(Array.from(state.gates), [0, 0, 0, 10]);
});

test("trigger mode completes attack and decay after a short gate pulse, then releases", () => {
  const state = ADSR.createState();
  const modeParams = { ...params, mode: 1 };
  const scratch = state.inputs;
  scratch.gate = 10;
  ADSR.processInto(modeParams, scratch, state, 0.001);
  scratch.gate = 0;
  ADSR.processInto(modeParams, scratch, state, 0.001);
  assert.equal(state.stage, ADSR.STAGE.ATTACK, "short pulse must not interrupt attack in trigger mode");
  for (let i = 0; i < 4; i++) ADSR.processInto(modeParams, scratch, state, 0.001);
  assert.equal(state.stage, ADSR.STAGE.DECAY, "attack must finish before release");
  ADSR.processInto(modeParams, scratch, state, 0.001);
  assert.equal(state.stage, ADSR.STAGE.RELEASE, "release begins after decay when the pulse is no longer high");
  assert.deepEqual(Array.from(state.gates), [0, 0, 0, 10]);
});
