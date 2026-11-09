const test = require("node:test");
const assert = require("node:assert/strict");
const DSP = require("../app/src/main/assets/joystick_dsp.js");

test("creates reusable zeroed output state", () => {
  const s = DSP.createState();
  assert.deepEqual(s.result, { x: 0, y: 0, gateX: 0, gateY: 0, mode: 0, peak: 0 });
});
test("manual center outputs zero CV", () => {
  const s = DSP.createState(), o = DSP.process({ x: 0, y: 0 }, {}, s);
  assert.equal(o.x, 0); assert.equal(o.y, 0);
});
test("manual full positive and negative travel maps to plus/minus five volts", () => {
  const s = DSP.createState(), o = DSP.process({ x: 1, y: -1 }, {}, s);
  assert.equal(o.x, 5); assert.equal(o.y, -5);
});
test("range scales manual travel without changing center", () => {
  const s = DSP.createState(), o = DSP.process({ x: 1, y: -1, range: .4 }, {}, s);
  assert.equal(o.x, 2); assert.equal(o.y, -2);
});
test("offset shifts each axis independently", () => {
  const s = DSP.createState(), o = DSP.process({ x: 0, y: 0, offsetX: .5, offsetY: -.25 }, {}, s);
  assert.equal(o.x, 2.5); assert.equal(o.y, -1.25);
});
test("attenuverter mode scales incoming bipolar signals", () => {
  const s = DSP.createState(), o = DSP.process({ mode: 1, attenX: -.5, attenY: .25 }, { xIn: 5, yIn: -5 }, s);
  assert.equal(o.x, -2.5); assert.equal(o.y, -1.25);
});
test("attenuverter mode applies independent offsets", () => {
  const s = DSP.createState(), o = DSP.process({ mode: 1, attenX: 0, attenY: 0, offsetX: .2, offsetY: -.4 }, { xIn: 5, yIn: 5 }, s);
  assert.equal(o.x, 1); assert.equal(o.y, -2);
});
test("incoming CV defaults to zero when unpatched", () => {
  const s = DSP.createState(), o = DSP.process({ mode: 1 }, {}, s);
  assert.equal(o.x, 0); assert.equal(o.y, 0);
});
test("gate buttons produce independent ten volt gates", () => {
  const s = DSP.createState(), o = DSP.process({ gateX: true, gateY: false }, {}, s);
  assert.equal(o.gateX, 10); assert.equal(o.gateY, 0);
});
test("gate outputs release cleanly", () => {
  const s = DSP.createState();
  DSP.process({ gateX: true, gateY: true }, {}, s);
  const o = DSP.process({}, {}, s);
  assert.equal(o.gateX, 0); assert.equal(o.gateY, 0);
});
test("outputs clamp at plus/minus five volts", () => {
  const s = DSP.createState(), o = DSP.process({ mode: 1, attenX: 1, attenY: -1 }, { xIn: 100, yIn: 100 }, s);
  assert.equal(o.x, 5); assert.equal(o.y, -5);
});
test("invalid values fall back to finite defaults", () => {
  const s = DSP.createState(), o = DSP.process({ x: NaN, y: Infinity, offsetX: NaN }, { xIn: NaN }, s);
  assert.ok(Number.isFinite(o.x)); assert.ok(Number.isFinite(o.y));
});
test("mode and controls are bounded", () => {
  const s = DSP.createState(), o = DSP.process({ mode: 99, x: 99, y: -99, range: 9 }, {}, s);
  assert.equal(o.mode, 1); assert.equal(o.x, 0); assert.equal(o.y, 0);
});
test("result object is reused across calls", () => {
  const s = DSP.createState(), first = DSP.process({ x: .5 }, {}, s), second = DSP.process({ x: -.5 }, {}, s);
  assert.equal(first, second); assert.equal(second.x, -2.5);
});
