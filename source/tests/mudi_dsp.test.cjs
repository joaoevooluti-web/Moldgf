const test = require("node:test");
const assert = require("node:assert/strict");
const MuDi = require("../app/src/main/assets/mudi_dsp.js");

function pulse(state, reset = 0) {
  MuDi.process(0, reset, false, state);
  return MuDi.process(5, reset, false, state);
}

test("base output follows the input clock and uses 0–10V levels", () => {
  const state = MuDi.createState();
  assert.equal(MuDi.process(5,0,false,state).outputs[0], 10);
  assert.equal(MuDi.process(0,0,false,state).outputs[0], 0);
});

test("divider stages produce successive powers-of-two subclocks", () => {
  const state = MuDi.createState();
  const snapshots=[];
  for(let i=0;i<16;i++){pulse(state);snapshots.push(state.div2?1:0,state.div4?1:0,state.div8?1:0,state.div16?1:0);MuDi.process(0,0,false,state)}
  assert.equal(snapshots.filter((_,i)=>i%4===0&&snapshots[i]===1).length,8);
  assert.equal(snapshots.filter((_,i)=>i%4===1&&snapshots[i]===1).length,4);
  assert.equal(snapshots.filter((_,i)=>i%4===2&&snapshots[i]===1).length,2);
  assert.equal(snapshots.filter((_,i)=>i%4===3&&snapshots[i]===1).length,1);
});

test("reset clears all divided clocks without stopping the base clock", () => {
  const state = MuDi.createState();
  for(let i=0;i<8;i++){pulse(state);MuDi.process(0,0,false,state)}
  const result=MuDi.process(0,5,false,state);
  assert.deepEqual(result.states,[false,false,false,false,false]);
});

test("hardware compatibility shifts clock outputs to bipolar +/-5V", () => {
  const state=MuDi.createState();
  const high=MuDi.process(5,0,true,state);
  assert.equal(high.outputs[0],5);
  const low=MuDi.process(0,0,true,state);
  assert.equal(low.outputs[0],-5);
});

test("Schmitt trigger rejects low noise and requires a clean falling threshold", () => {
  const state=MuDi.createState();
  MuDi.process(.5,0,false,state);
  assert.equal(state.clockHigh,false);
  MuDi.process(5,0,false,state);
  assert.equal(state.clockHigh,true);
  MuDi.process(.5,0,false,state);
  assert.equal(state.clockHigh,true);
  MuDi.process(0,0,false,state);
  assert.equal(state.clockHigh,false);
});

test("divider states remain independent and reset can be held high", () => {
  const state=MuDi.createState();
  for(let i=0;i<4;i++){pulse(state);MuDi.process(0,0,false,state)}
  assert.equal(state.div2,false);
  MuDi.process(5,5,false,state);
  assert.deepEqual([state.div2,state.div4,state.div8,state.div16],[false,false,false,false]);
});
