const test = require("node:test");
const assert = require("node:assert/strict");
const Atte = require("../app/src/main/assets/atte_dsp.js");

test("Atte first input is fixed at +10V and ignores legacy normal-voltage selectors", () => {
  for (const legacyValue of [undefined, 0, 1, 2, 99]) {
    assert.equal(Atte.normalledVoltage(legacyValue), 10);
  }
});

test("unpatched inputs inherit the previous channel input, not its output", () => {
  const inputA = Atte.resolveInput(null, Atte.normalledVoltage(2));
  const outputA = Atte.applyGain(inputA, 0.25, true);
  const inputB = Atte.resolveInput(undefined, inputA);
  const outputB = Atte.applyGain(inputB, 0.5, false);
  assert.equal(inputA, 10);
  assert.equal(outputA, 2.5);
  assert.equal(inputB, 10);
  assert.equal(outputB, -5);
});

test("a connected input overrides normaling and becomes the next channel normal", () => {
  const inputA = Atte.resolveInput(-3.5, 10);
  const outputA = Atte.applyGain(inputA, 1, true);
  const inputB = Atte.resolveInput(null, inputA);
  assert.equal(outputA, -3.5);
  assert.equal(inputB, -3.5);
});

test("gain spans zero to unity and mode selects positive or inverted attenuation", () => {
  assert.equal(Atte.applyGain(8, 0, true), 0);
  assert.equal(Atte.applyGain(8, 1, true), 8);
  assert.equal(Atte.applyGain(8, 0.5, false), -4);
  assert.equal(Atte.applyGain(-10, 1, false), 10);
});

test("gain is bounded to the physical 0..1 control range without clipping the signal", () => {
  assert.equal(Atte.applyGain(12, 2, true), 12);
  assert.equal(Atte.applyGain(-12, -1, true), 0);
});


test("processInto reuses the caller output buffer and cascades the previous input", () => {
  const output = [0, 0, 0, 0];
  const gains = [0.5, 1, 1, 1];
  const modes = [1, 0, 1, 1];
  const returned = Atte.processInto(null, 3.5, null, null, gains, modes, output);
  assert.strictEqual(returned, output);
  assert.deepEqual(output, [5, -3.5, 3.5, 3.5]);
  assert.strictEqual(Atte.processInto(-2, null, null, null, gains, modes, output), output);
  assert.deepEqual(output, [-1, 2, -2, -2]);
});

test("processInto rejects an undersized output buffer without allocating a replacement", () => {
  assert.equal(Atte.processInto(null, null, null, null, [1, 1, 1, 1], [1, 1, 1, 1], [0, 0, 0]), null);
});
