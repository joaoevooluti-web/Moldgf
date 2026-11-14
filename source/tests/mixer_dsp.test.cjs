const test = require("node:test");
const assert = require("node:assert/strict");
const Mixer = require("../app/src/main/assets/mixer_dsp.js");

test("four channels sum independently into the main output", () => {
  assert.deepEqual(Mixer.process([1, 2, 3, 4], [1, 1, 1, 1]), [10, -10]);
});

test("per-channel level controls scale each source", () => {
  assert.deepEqual(Mixer.process([10, 10, 10, 10], [1, 0.5, 0.25, 0]), [17.5, -17.5]);
});

test("unpatched and non-finite channels contribute silence", () => {
  assert.deepEqual(Mixer.process([null, NaN, Infinity, 5], [1, 1, 1, 1]), [5, -5]);
});

test("main and inverted outputs remain exact polarity complements without clipping", () => {
  const result = Mixer.process([10, 10, 10, 10], [1, 1, 1, 1]);
  assert.equal(result[0], 40);
  assert.equal(result[1], -40);
});

test("meter reports bipolar polarity and bounded brightness", () => {
  assert.deepEqual(Mixer.meter(2.5), { positive: true, negative: false, magnitude: 0.5 });
  assert.deepEqual(Mixer.meter(-10), { positive: false, negative: true, magnitude: 1 });
  assert.deepEqual(Mixer.meter(0), { positive: false, negative: false, magnitude: 0 });
});

test("processInto and meterInto reuse caller-owned output objects", () => {
  const output = [0, 0];
  const meter = { positive: false, negative: false, magnitude: 0 };
  assert.strictEqual(Mixer.processInto(1, 2, 3, 4, [1, 1, 1, 1], output), output);
  assert.deepEqual(output, [10, -10]);
  assert.strictEqual(Mixer.meterInto(-10, meter), meter);
  assert.deepEqual(meter, { positive: false, negative: true, magnitude: 1 });
});
