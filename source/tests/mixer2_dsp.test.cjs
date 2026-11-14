const test = require("node:test");
const assert = require("node:assert/strict");
const Mixer2 = require("../app/src/main/assets/mixer2_dsp.js");

test("Mixer2 forms two independent channel pairs", () => {
  assert.deepEqual(Mixer2.process([2, 3, 5, 7], [1, 1, 1, 1], true, false), [5, 12]);
});

test("unpatched MIX 1+2 is normalized into the master output", () => {
  assert.deepEqual(Mixer2.process([2, 3, 5, 7], [1, 1, 1, 1], false, false), [0, 17]);
});

test("each channel gain is independent and bounded to unity", () => {
  assert.deepEqual(Mixer2.process([10, 10, 10, 10], [0.5, 0.25, 0, 2], true, false), [7.5, 10]);
});

test("optional hardware compatibility clips both outputs to +/-10V", () => {
  assert.deepEqual(Mixer2.process([10, 10, 10, 10], [1, 1, 1, 1], true, true), [10, 10]);
  assert.deepEqual(Mixer2.process([10, 10, 10, 10], [1, 1, 1, 1], false, true), [0, 10]);
});

test("meter reports polarity and bounded level", () => {
  assert.deepEqual(Mixer2.meter(5), { positive: true, negative: false, level: 0.5 });
  assert.deepEqual(Mixer2.meter(-20), { positive: false, negative: true, level: 1 });
  assert.deepEqual(Mixer2.meter(0), { positive: false, negative: false, level: 0 });
});

test("processInto and meterInto reuse caller-owned output objects", () => {
  const output = [0, 0];
  const meter = { positive: false, negative: false, level: 0 };
  assert.strictEqual(Mixer2.processInto(2, 3, 5, 7, [1, 1, 1, 1], true, false, output), output);
  assert.deepEqual(output, [5, 12]);
  assert.strictEqual(Mixer2.meterInto(-20, meter), meter);
  assert.deepEqual(meter, { positive: false, negative: true, level: 1 });
});
