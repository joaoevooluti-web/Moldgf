const test = require("node:test");
const assert = require("node:assert/strict");
const Burst = require("../app/src/main/assets/burst_dsp.js");

const params={cycle:false,quantity:4,button:false,quantityCV:1,distribution:0,time:0,probability:0};
const inputs={quantityCV:0,distribution:0,ping:0,time:0,probability:0,trigger:0};

test("burst timing is distributed across the ping tempo window", () => {
  assert.deepEqual(Burst.makeTimings(4,1,0),[0,.25,.5,.75,1]);
  assert.ok(Burst.makeTimings(4,1,1)[1] < .25);
  assert.ok(Burst.makeTimings(4,1,-1)[1] > .25);
});

test("time control selects tempo multiplication or division windows", () => {
  assert.equal(Burst.timeWindow(1,0,0),1);
  assert.equal(Burst.timeWindow(1,-1,0),2);
  assert.equal(Burst.timeWindow(1,1,0),.5);
});

test("trigger immediately emits the first burst pulse and completes the requested count", () => {
  const state=Burst.createState();
  const first=Burst.process({...inputs,trigger:5},{...params,quantity:3},state,.0005);
  assert.equal(first.outputs[2],10);
  assert.equal(first.triggersRequested,3);
  let pulses=1,previousHigh=true;
  for(let i=0;i<5000&&state.burstActive;i++){const r=Burst.process(inputs,params,state,.001);const high=r.outputs[2]===10;if(high&&!previousHigh)pulses++;previousHigh=high}
  assert.equal(pulses,3);
  assert.equal(state.burstActive,false);
});

test("ping input updates tempo from measured intervals", () => {
  const state=Burst.createState();
  Burst.process({...inputs,ping:5},params,state,.001);
  Burst.process({...inputs,ping:0},params,state,.001);
  for(let i=0;i<499;i++)Burst.process(inputs,params,state,.001);
  Burst.process({...inputs,ping:5},params,state,.001);
  assert.ok(Math.abs(state.tempo-.5)<.01);
});

test("probability inhibition passes the original trigger but suppresses repetitions", () => {
  const state=Burst.createState();
  const first=Burst.process({...inputs,trigger:5},{...params,quantity:8,probability:1},state,.0005);
  assert.equal(first.outputs[2],10);
  assert.equal(first.triggersRequested,1);
  for(let i=0;i<1000&&state.burstActive;i++)Burst.process(inputs,params,state,.001);
  assert.equal(state.burstActive,false);
});

test("quantity CV scales requested burst count and clamps to 1–32", () => {
  const state=Burst.createState();
  const result=Burst.process({...inputs,trigger:5,quantityCV:10},{...params,quantity:4},state,.0005);
  assert.equal(result.triggersRequested,32);
});

test("cycle mode starts another burst after end of cycle", () => {
  const state=Burst.createState();
  Burst.process({...inputs,trigger:5},{...params,quantity:1,cycle:true},state,.0005);
  let restarted=false;
  for(let i=0;i<2000;i++){const r=Burst.process(inputs,{...params,quantity:1,cycle:true},state,.001);if(r.active&&r.triggersOccurred===0){restarted=true;break}}
  assert.equal(restarted,true);
});

test("manual button starts a burst without an external trigger", () => {
  const result=Burst.process(inputs,{...params,button:true,quantity:2},Burst.createState(),.0005);
  assert.equal(result.outputs[2],10);
});
