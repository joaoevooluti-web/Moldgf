const test = require("node:test");
const assert = require("node:assert/strict");
const Voltio = require("../app/src/main/assets/voltio_dsp.js");

test("octave control generates exact one-volt steps in positive and bipolar ranges", () => {
  assert.equal(Voltio.sourceVoltage(0, 0, false), 0);
  assert.equal(Voltio.sourceVoltage(10, 0, false), 10);
  assert.equal(Voltio.sourceVoltage(-5, 0, true), -5);
  assert.equal(Voltio.sourceVoltage(5, 0, true), 5);
});

test("semitone control generates twelve-tone equal-temperament increments", () => {
  assert.equal(Voltio.sourceVoltage(0, 1, false), 1 / 12);
  assert.equal(Voltio.sourceVoltage(2, 6, false), 2.5);
  assert.equal(Voltio.sourceVoltage(0, 11, false), 11 / 12);
});

test("precision adder sums external CV without quantizing the incoming signal", () => {
  assert.equal(Voltio.process(1.25, 2, 6, false), 3.75);
  assert.equal(Voltio.process(-0.125, 0, 0, false), -0.125);
  assert.equal(Voltio.process(null, 3, 0, false), 3);
});

test("range and semitone controls are bounded and non-finite inputs are safe", () => {
  assert.equal(Voltio.sourceVoltage(99, 99, false), 10 + 11 / 12);
  assert.equal(Voltio.sourceVoltage(-99, -99, true), -5);
  assert.equal(Voltio.process(Infinity, NaN, NaN, false), 0);
});
