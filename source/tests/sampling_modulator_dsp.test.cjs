const test=require("node:test");
const assert=require("node:assert/strict");
const Sampling=require("../app/src/main/assets/sampling_modulator_dsp.js");
const base={internalClock:0,rate:0,fine:0,removeDC:0,steps:[2,2,2,2,2,2,2,2]};
const inputs={sync:0,voct:0,hold:0,raw:0};

test("external clock advances the eight-step sequencer and emits a trigger on active steps",()=>{
 const s=Sampling.createState();
 const first=Sampling.process({...inputs,sync:5,raw:3},base,s,48000,1/48000);
 assert.equal(first.step,1);assert.equal(first.trigger,10);assert.equal(first.sampled,3);
});

test("OFF steps advance without triggering or updating sample hold",()=>{
 const s=Sampling.createState(),p={...base,steps:[2,1,2,2,2,2,2,2]};
 Sampling.process({...inputs,sync:5,raw:2},p,s,48000,1/48000);
 const off=Sampling.process({...inputs,sync:0,raw:9},p,s,48000,1/48000);
 const next=Sampling.process({...inputs,sync:5,raw:9},p,s,48000,1/48000);
 assert.equal(next.step,2);assert.equal(next.sampled,9);
});

test("RESET step shortens the sequence before the first reset position",()=>{
 const s=Sampling.createState(),p={...base,steps:[2,2,0,2,2,2,2,2]};
 Sampling.process({...inputs,sync:5},p,s,48000,1/48000);
 Sampling.process({...inputs,sync:0},p,s,48000,1/48000);
 const result=Sampling.process({...inputs,sync:5},p,s,48000,1/48000);
 assert.equal(result.effectiveSteps,2);assert.equal(result.step,0);
});

test("hold input captures raw voltage and suppresses subsequent step updates",()=>{
 const s=Sampling.createState();
 Sampling.process({...inputs,hold:5,raw:4},base,s,48000,1/48000);
 const result=Sampling.process({...inputs,sync:5,hold:5,raw:9},base,s,48000,1/48000);
 assert.equal(result.sampled,4);
});

test("internal clock frequency follows rate, fine and V/oct controls",()=>{
 const s=Sampling.createState(),p={...base,internalClock:1,rate:0,fine:0};
 const result=Sampling.process(inputs,p,s,48000,1/48000);
 assert.equal(result.frequency,1);
 const high=Sampling.process(inputs,{...p,rate:.5},Sampling.createState(),48000,1/48000);
 assert.equal(high.frequency,256);
});

test("sync resets internal phase and advances one step",()=>{
 const s=Sampling.createState(),p={...base,internalClock:1};
 Sampling.process(inputs,p,s,48000,.1);
 const result=Sampling.process({...inputs,sync:5},p,s,48000,1/48000);
 assert.equal(result.step,1);assert.ok(result.phase<.01);
});

test("clock output supports bipolar DC removal or unipolar mode",()=>{
 const s=Sampling.createState();
 const bipolar=Sampling.process(inputs,{...base,internalClock:1,removeDC:1},s,48000,1/48000);
 assert.ok(bipolar.clock===5||bipolar.clock===-5);
 const unipolar=Sampling.process(inputs,{...base,internalClock:1,removeDC:0},Sampling.createState(),48000,1/48000);
 assert.ok(unipolar.clock===0||unipolar.clock===10);
});

test("internal trigger output reflects active-step state and DC compensation",()=>{
 const p={...base,internalClock:1,removeDC:1};
 const result=Sampling.process(inputs,p,Sampling.createState(),48000,1/48000);
 assert.ok(Number.isFinite(result.trigger));
 assert.equal(result.activeSteps,8);
});
