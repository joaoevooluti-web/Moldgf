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
