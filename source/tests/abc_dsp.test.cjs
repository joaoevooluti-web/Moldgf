const test = require("node:test");
const assert = require("node:assert/strict");
const ABC = require("../app/src/main/assets/abc_dsp.js");

test("A*B+C uses B normalled to 5V and the B attenuverter spans -2x to +2x", () => {
  assert.equal(ABC.processChannel(5, null, 0, 0.5, 0), 1);
  assert.equal(ABC.processChannel(5, null, 0, 1, 0), 10);
  assert.equal(ABC.processChannel(5, null, 0, -1, 0), -10);
});

test("C is normalled to 10V and its bipolar offset attenuverter spans -10V to +10V", () => {
  assert.equal(ABC.processChannel(0, 5, null, 0, 1), 10);
  assert.equal(ABC.processChannel(0, 5, null, 0, -1), -10);
  assert.equal(ABC.processChannel(0, 5, null, 0, 0), 0);
});

test("B and C controls use a bipolar exponential response and external inputs remain continuous", () => {
  assert.equal(ABC.bipolarCurve(0), 0);
  assert.equal(ABC.bipolarCurve(1), 1);
  assert.equal(ABC.bipolarCurve(-1), -1);
  assert.equal(ABC.processChannel(2, 2.5, 1.25, 0.5, 0.5),
    2 * (2.5 / 5) * 2 * ABC.bipolarCurve(0.5) + 1.25 * ABC.bipolarCurve(0.5));
});

test("the second output sums channel one while OUT1 is unpatched", () => {
  const inputs = { a1: 2, b1: 5, c1: 0, a2: 3, b2: 5, c2: 0 };
  const controls = [{ bLevel: 0.5, cLevel: 0 }, { bLevel: 0.5, cLevel: 0 }];
  const independent = ABC.processPair(inputs, controls, true);
  const summed = ABC.processPair(inputs, controls, false);
  assert.equal(independent[0], 2 * 2 * ABC.bipolarCurve(0.5));
  assert.equal(independent[1], 3 * 2 * ABC.bipolarCurve(0.5));
  assert.equal(summed[1], independent[0] + independent[1]);
});

test("inputs and outputs are limited to the +/-10V operating range", () => {
  assert.equal(ABC.clipVoltage(40), 10);
  assert.equal(ABC.clipVoltage(-40), -10);
  assert.equal(ABC.processChannel(10, 10, 10, 1, 1), 10);
});

test("output indicator follows positive and negative signal polarity", () => {
  assert.equal(ABC.ledPolarity(2), "positive");
  assert.equal(ABC.ledPolarity(-2), "negative");
  assert.equal(ABC.ledPolarity(0.001), "off");
});
