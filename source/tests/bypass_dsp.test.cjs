const test = require("node:test");
const assert = require("node:assert/strict");
const Bypass = require("../app/src/main/assets/bypass_dsp.js");

const params = (overrides = {}) => ({
  active: false, button: false, launchMode: 0, returnMode: 0,
  fxGain: 0, slew: 0.005, saturation: false, ...overrides
});
const inputs = (overrides = {}) => ({
  inL: 2, inR: -3, fxL: 7, fxR: 5, launch: 0, ...overrides
});

test("hard bypass crossfades from dry input to the stereo FX return", () => {
  const state = Bypass.createState(false);
  let result = Bypass.process(params(), inputs(), state, 0.2);
  assert.equal(result.sendActive, 0);
  assert.equal(result.outLeft, 2);
  assert.equal(result.outRight, -3);
  result = Bypass.process(params({ button: true }), inputs(), state, 0.2);
  assert.equal(result.sendActive, 1);
  assert.ok(Math.abs(result.outLeft - 7) < 1e-6);
  assert.ok(Math.abs(result.outRight - 5) < 1e-6);
});

test("soft bypass preserves FX tails while restoring the dry signal", () => {
  const state = Bypass.createState(false);
  const result = Bypass.process(params({ returnMode: 1 }), inputs(), state, 0.2);
  assert.equal(result.outLeft, 9);
  assert.equal(result.outRight, 2);
});

test("right input normals to left and send outputs follow the smoothed active state", () => {
  const state = Bypass.createState(true);
  const result = Bypass.process(params({ active: true }), inputs({ inL: 4, inR: null }), state, 0.2);
  assert.ok(Math.abs(result.sendLeft - 4) < 1e-6);
  assert.ok(Math.abs(result.sendRight - 4) < 1e-6);
  assert.equal(result.outRight, 5);
});

test("FX return gain follows the -30dB to +12dB control taper", () => {
  assert.ok(Math.abs(Bypass.returnGain(-1) - Math.pow(10, -30 / 20)) < 1e-12);
  assert.equal(Bypass.returnGain(0), 1);
  assert.ok(Math.abs(Bypass.returnGain(1) - Math.pow(10, 12 / 20)) < 1e-12);
});

test("latch mode toggles only on rising edges from CV or the launch button", () => {
  const state = Bypass.createState(false);
  let result = Bypass.process(params(), inputs({ launch: 5 }), state, 0.2);
  assert.equal(result.active, true);
  result = Bypass.process(params(), inputs({ launch: 5 }), state, 0.2);
  assert.equal(result.active, true);
  result = Bypass.process(params(), inputs({ launch: 0 }), state, 0.2);
  assert.equal(result.active, true);
  result = Bypass.process(params(), inputs({ launch: 5 }), state, 0.2);
  assert.equal(result.active, false);
});

test("gate mode follows the CV gate and momentary launch button", () => {
  const state = Bypass.createState(false);
  assert.equal(Bypass.process(params({ launchMode: 1 }), inputs({ launch: 5 }), state, 0.2).active, true);
  assert.equal(Bypass.process(params({ launchMode: 1 }), inputs({ launch: 0 }), state, 0.2).active, false);
  assert.equal(Bypass.process(params({ launchMode: 1, button: true }), inputs(), state, 0.2).active, true);
  assert.equal(Bypass.process(params({ launchMode: 1, button: false }), inputs(), state, 0.2).active, false);
});

test("slew time ramps the send state instead of switching abruptly", () => {
  const state = Bypass.createState(false);
  const first = Bypass.process(params({ active: true, slew: 0.05 }), inputs(), state, 0.001);
  assert.ok(first.sendActive > 0 && first.sendActive < 1);
  let result = first;
  for (let i = 0; i < 1000; i++) result = Bypass.process(params({ active: true, slew: 0.05 }), inputs(), state, 0.001);
  assert.ok(result.sendActive > 0.999);
});

test("optional saturation soft-limits the stereo output", () => {
  const result = Bypass.process(params({ active: true, saturation: true }), inputs({ fxL: 100, fxR: -100 }), Bypass.createState(false), 0.2);
  assert.ok(result.outLeft < 10 && result.outLeft > 9.9);
  assert.ok(result.outRight > -10 && result.outRight < -9.9);
});
