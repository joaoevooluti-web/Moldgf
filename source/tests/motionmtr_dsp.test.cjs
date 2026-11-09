const test = require("node:test");
const assert = require("node:assert/strict");
const Motion = require("../app/src/main/assets/motionmtr_dsp.js");

test("CV inversion mode reverses polarity and CV attenuation preserves polarity", () => {
  assert.deepEqual(Motion.process([5,5,0],[1,1,1],[0,1,1],[true,true],true),[-5,5,0]);
});

test("audio mode is positive gain and does not invert", () => {
  assert.deepEqual(Motion.process([-5,0,0],[0.5,1,1],[2,2,2],[true,true],true),[-2.5,0,0]);
});

test("CV modes normalize unpatched inputs to ten volts", () => {
  assert.deepEqual(Motion.process([null,null,null],[0.5,0.25,1],[1,1,1],[true,true],true),[5,2.5,10]);
});

test("audio mode can break the ten-volt normaling", () => {
  assert.deepEqual(Motion.process([null,null,null],[1,1,1],[2,2,2],[true,true],true),[0,0,0]);
  assert.deepEqual(Motion.process([null,null,null],[1,1,1],[2,2,2],[true,true],false),[10,10,10]);
});

test("unpatched channel outputs are summed into OUT3", () => {
  assert.deepEqual(Motion.process([2,3,4],[1,1,1],[1,1,1],[false,false],true),[2,3,9]);
});

test("patched OUT1 and OUT2 are removed from the OUT3 mix", () => {
  assert.deepEqual(Motion.process([2,3,4],[1,1,1],[1,1,1],[true,false],true),[2,3,7]);
});
