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
  const fallOnly=Slew.process(5,5,{rise:1,fall:1,range:0,shape:0,cvMode:0},{out:0},.001);
  const riseOnly=Slew.process(5,5,{rise:1,fall:1,range:0,shape:0,cvMode:2},{out:0},.001);
  assert.equal(fallOnly.rate,2.5);
  assert.ok(riseOnly.rate>2.5&&riseOnly.rate<2500);
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


test("processInto uses caller-owned state and returns a number without a result record", () => {
  const state = Slew.createState();
  const result = Slew.processInto(1, null,
    { rise: 0, fall: 0, range: 0, shape: 0, cvMode: 1 }, state, .001);
  assert.equal(typeof result, "number");
  assert.equal(result, 1);
  assert.equal(state.out, 1);
  assert.equal(state.rising, 10);
  assert.equal(state.falling, 0);
  assert.strictEqual(Slew.reset(state, -2), state);
  assert.deepEqual(state, { out: -2, rising: 0, falling: 0, rate: 0 });
});

test("processInto applies CV only to the selected rise or fall direction", () => {
  const params = { rise: 1, fall: 0, range: 0, shape: 0, cvMode: 2 };
  const rising = Slew.createState();
  Slew.processInto(5, 10, params, rising, 1 / 48000);
  assert.equal(rising.rate, 2.5);
  assert.equal(rising.rising, 10);
  assert.equal(rising.falling, 0);

  const falling = { out: 5 };
  Slew.processInto(0, 10, params, falling, 1 / 48000);
  assert.equal(falling.rate, 2500, "rise-only mode must leave fall on its manual control");

  params.fall = 1;
  params.cvMode = 0;
  const fallCv = { out: 5 };
  Slew.processInto(0, 10, params, fallCv, 1 / 48000);
  assert.equal(fallCv.rate, 2.5, "fall-only mode must apply CV to falling movement");
  assert.equal(fallCv.falling, 10);
});

test("processInto sanitizes corrupt state and clears slope gates at the target", () => {
  const state = Slew.createState();
  state.out = NaN;
  const result = Slew.processInto(0, null,
    { rise: 0, fall: 0, range: 1, shape: 0, cvMode: 1 }, state, 1 / 48000);
  assert.equal(result, 0);
  assert.equal(state.out, 0);
  assert.equal(state.rising, 0);
  assert.equal(state.falling, 0);
  assert.equal(state.rate, 0);
});
