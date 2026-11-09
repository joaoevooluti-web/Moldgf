const test = require("node:test");
const assert = require("node:assert/strict");
const ABC = require("../app/src/main/assets/abc_dsp.js");

const unity = { bLevel: 1, bMode: 0, cLevel: 0, cMode: 0 };

test("A*B+C divides the product by five and supports four-quadrant multiplication", () => {
  assert.equal(ABC.processChannel(5, 5, 0, unity), 5);
  assert.equal(ABC.processChannel(5, -5, 0, unity), -5);
  assert.equal(ABC.processChannel(-5, -5, 0, unity), 5);
});

test("B and C default to five volts and their attenuverter controls scale independently", () => {
  assert.equal(ABC.processChannel(8, null, 0, unity), 8);
  assert.equal(ABC.processChannel(0, 5, null, { bLevel: 0, bMode: 0, cLevel: 1, cMode: 0 }), 5);
  assert.equal(ABC.processChannel(5, 5, 5, { bLevel: 0.5, bMode: 1, cLevel: 0.5, cMode: 2 }), 2.5);
});

test("gain switches provide x1, x2 and inverted ranges", () => {
  assert.equal(ABC.gainFactor(0), 1);
  assert.equal(ABC.gainFactor(1), 2);
  assert.equal(ABC.gainFactor(2), -1);
  assert.equal(ABC.processChannel(5, 5, 0, { bLevel: 1, bMode: 2, cLevel: 0, cMode: 0 }), -5);
});

test("MULT mode normalizes A1 to A2 while a connected A2 overrides it", () => {
  const controls = [unity, unity];
  assert.deepEqual(ABC.processPair({ a1: 5, a2: null, b1: 5, c1: 0, b2: 5, c2: 0 }, controls, 0, false), [5, 5]);
  assert.deepEqual(ABC.processPair({ a1: 5, a2: -5, b1: 5, c1: 0, b2: 5, c2: 0 }, controls, 0, false), [5, -5]);
});

test("MIX mode sums OUT1 into the bus until OUT1 is patched", () => {
  const controls = [unity, unity];
  const inputs = { a1: 5, a2: 5, b1: 5, c1: 0, b2: 5, c2: 0 };
  assert.deepEqual(ABC.processPair(inputs, controls, 1, false), [5, 10]);
  assert.deepEqual(ABC.processPair(inputs, controls, 1, true), [5, 5]);
});

test("all inputs and resulting outputs are bounded to the ten-volt operating range", () => {
  assert.equal(ABC.clipVoltage(25), 10);
  assert.equal(ABC.clipVoltage(-25), -10);
  assert.equal(ABC.processChannel(10, 10, 10, { bLevel: 1, bMode: 1, cLevel: 1, cMode: 1 }), 10);
});

test("bipolar output indicator follows the output voltage sign", () => {
  assert.equal(ABC.ledPolarity(3), "positive");
  assert.equal(ABC.ledPolarity(-3), "negative");
  assert.equal(ABC.ledPolarity(0.001), "off");
});
