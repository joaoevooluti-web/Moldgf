const test = require("node:test");
const assert = require("node:assert/strict");
const Slew = require("../app/src/main/assets/slewlimiter_dsp.js");

test("rise and fall CV map from fast to slow slew rates", () => {
  assert.equal(Slew.rateFromCV(0), 10000);
  assert.ok(Math.abs(Slew.rateFromCV(10) - 0.1) < 1e-12);
  assert.ok(Slew.rateFromCV(5) < Slew.rateFromCV(0));
});

test("zero rise setting tracks upward steps quickly", () => {
  const state = { out: 0 };
  const result = Slew.process(5, 0, 0, { rise: 0, fall: 0, shape: 0 }, state, 0.001);
  assert.equal(result.output, 5);
});

test("high rise CV slows upward movement", () => {
  const state = { out: 0 };
  const result = Slew.process(5, 10, 0, { rise: 0, fall: 0, shape: 0 }, state, 0.001);
  assert.ok(result.output > 0 && result.output < 0.001);
});

test("fall time is independent from rise time", () => {
  const state = { out: 5 };
  const result = Slew.process(0, 0, 10, { rise: 0, fall: 0, shape: 0 }, state, 0.001);
  assert.ok(result.output < 5 && result.output > 4.999);
});

test("shape blends constant-rate and delta-proportional response", () => {
  const a = Slew.process(20, 5, 5, { rise: 0, fall: 0, shape: 0 }, { out: 0 }, 0.0001).output;
  const b = Slew.process(20, 5, 5, { rise: 0, fall: 0, shape: 1 }, { out: 0 }, 0.0001).output;
  assert.ok(b > a);
});

test("slew never overshoots and settles exactly at the target", () => {
  const state = { out: 0 };
  let result;
  for (let i = 0; i < 1000; i++) result = Slew.process(1, 0, 0, { rise: 0, fall: 0, shape: 0 }, state, 0.001);
  assert.equal(result.output, 1);
});


test("processInto mutates the caller-owned state and returns a primitive sample", () => {
  const state = Slew.createState();
  const output = Slew.processInto(5, 10, 0, { rise: 0, fall: 0, shape: 0 }, state, 1 / 48000);
  assert.equal(typeof output, "number");
  assert.equal(output, state.out);
  assert.ok(output > 0 && output < 0.001);
  assert.strictEqual(Slew.reset(state, 1.25), state);
  assert.equal(state.out, 1.25);
});

test("rise and fall CV inputs control their own directions independently", () => {
  const params = { rise: 0, fall: 0, shape: 0 };
  const state = Slew.createState();
  const slowRise = Slew.processInto(5, 10, 0, params, state, 1 / 48000);
  assert.ok(slowRise > 0 && slowRise < 0.001);

  Slew.reset(state, 5);
  const slowFall = Slew.processInto(0, 0, 10, params, state, 1 / 48000);
  assert.ok(slowFall < 5 && slowFall > 4.999);

  Slew.reset(state, 5);
  const fastFall = Slew.processInto(0, 10, 0, params, state, 1 / 48000);
  assert.ok(fastFall < slowFall);
});

test("equal elapsed time produces equivalent movement at 48 and 96 kHz", () => {
  const params = { rise: 0, fall: 0, shape: 0 };
  const run = (sampleRate, samples) => {
    const state = Slew.createState();
    for (let i = 0; i < samples; i++) {
      Slew.processInto(5, 10, 0, params, state, 1 / sampleRate);
    }
    return state.out;
  };
  const at48k = run(48000, 4800);
  const at96k = run(96000, 9600);
  assert.ok(Math.abs(at48k - at96k) < 1e-12);
});

test("reset sanitizes non-finite values and the compatibility wrapper retains state identity", () => {
  const state = Slew.createState(Number.NaN);
  assert.equal(state.out, 0);
  const result = Slew.process(2, 0, 0, { rise: 0, fall: 0, shape: 0 }, state, 0.001);
  assert.strictEqual(result.state, state);
  assert.equal(result.output, 2);
  Slew.reset(state, Number.POSITIVE_INFINITY);
  assert.equal(state.out, 0);
});
