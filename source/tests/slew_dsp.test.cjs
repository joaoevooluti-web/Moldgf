const test = require("node:test");
const assert = require("node:assert/strict");
const Slew = require("../app/src/main/assets/slew_dsp.js");

test("range switch scales minimum and maximum slopes by decades", () => {
  assert.deepEqual(Slew.rateBounds(0), { min: 2.5, max: 2500 });
  assert.deepEqual(Slew.rateBounds(1), { min: 0.25, max: 250 });
  assert.deepEqual(Slew.rateBounds(2), { min: 0.025, max: 25 });
});

test("rise and fall direction gates follow the sign of the input delta", () => {
  const state={out:0};
  const rise=Slew.process(1,null,{rise:0,fall:0,range:0,shape:0,cvMode:1},state,.001);
  assert.equal(rise.rising,10);
  assert.equal(rise.falling,0);
  const fall=Slew.process(-1,null,{rise:0,fall:0,range:0,shape:0,cvMode:1},state,.001);
  assert.equal(fall.rising,0);
  assert.equal(fall.falling,10);
});

test("range and slider determine constant-rate slew without overshoot", () => {
  const state={out:0};
  const fast=Slew.process(5,null,{rise:0,fall:0,range:0,shape:0,cvMode:1},state,.001);
  assert.equal(fast.output,2.5);
  const slow=Slew.process(5,null,{rise:1,fall:0,range:0,shape:0,cvMode:1},state,.001);
  assert.ok(slow.output>=fast.output&&slow.output<=5);
});

test("CV mode routes CV to fall only, both directions, or rise only", () => {
  const fallOnly=Slew.process(5,10,{rise:1,fall:1,range:0,shape:0,cvMode:0},{out:0},.001);
  const riseOnly=Slew.process(5,10,{rise:1,fall:1,range:0,shape:0,cvMode:2},{out:0},.001);
  assert.equal(fallOnly.rate,2500);
  assert.equal(riseOnly.rate,2.5);
});

test("CV input is attenuated by the active rise or fall slider", () => {
  const full=Slew.process(5,10,{rise:1,fall:1,range:0,shape:0,cvMode:2},{out:0},.001);
  const half=Slew.process(5,10,{rise:.5,fall:1,range:0,shape:0,cvMode:2},{out:0},.001);
  assert.ok(half.rate>full.rate);
});

test("shape blends constant slope with delta-proportional movement", () => {
  const a=Slew.process(20,null,{rise:0,fall:0,range:1,shape:0,cvMode:1},{out:0},.001).output;
  const b=Slew.process(20,null,{rise:0,fall:0,range:1,shape:1,cvMode:1},{out:0},.001).output;
  assert.ok(b>a);
});

test("output converges exactly to the target without overshoot", () => {
  const state={out:0};let result;
  for(let i=0;i<1000;i++)result=Slew.process(1,null,{rise:0,fall:0,range:0,shape:0,cvMode:1},state,.001);
  assert.equal(result.output,1);
});
