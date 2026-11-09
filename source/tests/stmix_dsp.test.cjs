const test = require("node:test");
const assert = require("node:assert/strict");
const STMix = require("../app/src/main/assets/stmix_dsp.js");

test("four stereo channels are summed with independent gain controls", () => {
  assert.deepEqual(STMix.process([1, 2, 3, 4, 5, 6, 7, 8, 0, 0], [1, 1, 1, 1]), [16, 20]);
});

test("each right input normals to its matching left input when unpatched", () => {
  assert.deepEqual(STMix.process([2, null, 0, undefined, 0, 0, 0, 0, 1, null], [1, 0, 0, 0]), [3, 3]);
});

test("auxiliary stereo input is mixed at unity independently of channel gains", () => {
  assert.deepEqual(STMix.process([10, 20, 0, 0, 0, 0, 0, 0, 3, 4], [0, 0, 0, 0]), [3, 4]);
});

test("channel gain curve is monotonic and bounded from zero to unity", () => {
  assert.equal(STMix.channelGain(0), 0);
  assert.equal(STMix.channelGain(1), 1);
  assert.equal(STMix.channelGain(0.5), 0.25);
  assert.equal(STMix.channelGain(2), 1);
});

test("stereo output meter reports polarity and bounded brightness", () => {
  assert.deepEqual(STMix.meter(2.5), { positive: true, negative: false, magnitude: 0.5 });
  assert.deepEqual(STMix.meter(-10), { positive: false, negative: true, magnitude: 1 });
});
