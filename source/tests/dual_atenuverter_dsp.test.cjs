const test = require("node:test");
const assert = require("node:assert/strict");
const DSP = require("../app/src/main/assets/dual_atenuverter_dsp.js");

test("attenuverter spans -1 through +1 and preserves bipolar signals", () => {
  assert.equal(DSP.processChannel(5, 1, 0), 5);
  assert.equal(DSP.processChannel(5, -1, 0), -5);
  assert.equal(DSP.processChannel(-5, -1, 0), 5);
  assert.equal(DSP.processChannel(8, 0, 0), 0);
});

test("offset is bipolar and remains available with an unpatched input", () => {
  assert.equal(DSP.processChannel(null, 0, 10), 10);
  assert.equal(DSP.processChannel(undefined, 0, -10), -10);
  assert.equal(DSP.processChannel(2, 0.5, -3), -2);
});

test("second channel follows channel one input only while its own input is unpatched", () => {
  assert.equal(DSP.resolveInput(null, 4.5), 4.5);
  assert.equal(DSP.resolveInput(undefined, -2), -2);
  assert.equal(DSP.resolveInput(7, 4.5), 7);
});

test("controls are bounded and non-finite values are made safe", () => {
  assert.equal(DSP.processChannel(12, 5, 20), 22);
  assert.equal(DSP.processChannel(12, -5, -20), -22);
  assert.equal(DSP.processChannel(Infinity, 1, 0), 0);
  assert.equal(DSP.processChannel(5, NaN, NaN), 0);
});

test("bipolar indicator follows output polarity with a quiet deadband", () => {
  assert.equal(DSP.ledPolarity(2), "positive");
  assert.equal(DSP.ledPolarity(-2), "negative");
  assert.equal(DSP.ledPolarity(0), "off");
  assert.equal(DSP.ledPolarity(0.005), "off");
  assert.equal(DSP.ledPolarity(NaN), "off");
});
