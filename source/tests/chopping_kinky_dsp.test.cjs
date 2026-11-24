const test=require("node:test");
const assert=require("node:assert/strict");
const CK=require("../app/src/main/assets/chopping_kinky_dsp.js");

test("channel A fold is odd-symmetric and channel B has asymmetric response",()=>{
 assert.equal(CK.foldA(2,1),-CK.foldA(-2,1));
 assert.notEqual(CK.foldB(2,1),-CK.foldB(-2,1));
});

test("fold gain and CV attenuverters affect channels independently",()=>{
 const r=CK.process({a:2,b:2,cvA:5,cvB:5,vcaA:0,vcaB:0,gate:null},{foldA:1,foldB:1,cvA:1,cvB:-1,blockDC:false},CK.createState(),48000);
 assert.equal(r.gainA,1.5);assert.equal(r.gainB,.5);
 assert.notEqual(r.outA,r.outB);
});

test("channel B CV normals to channel A CV when unpatched",()=>{
 const a=CK.process({a:2,b:2,cvA:5,cvB:null,vcaA:0,vcaB:0,gate:null},{foldA:1,foldB:1,cvA:1,cvB:-1,blockDC:false},CK.createState(),48000);
 const b=CK.process({a:2,b:2,cvA:5,cvB:5,vcaA:0,vcaB:0,gate:null},{foldA:1,foldB:1,cvA:1,cvB:-1,blockDC:false},CK.createState(),48000);
 assert.equal(a.gainB,b.gainB);
});

test("input B normals to input A when unpatched",()=>{
 const state=CK.createState();
 const a=CK.process({a:3,b:null,cvA:0,cvB:null,vcaA:0,vcaB:0,gate:0},{foldA:1,foldB:1,cvA:0,cvB:0,blockDC:false},state,48000);
 const b=CK.process({a:3,b:3,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:0},{foldA:1,foldB:1,cvA:0,cvB:0,blockDC:false},CK.createState(),48000);
 assert.equal(a.outB,b.outB);
});

test("external gate selects channel A or B for CHOPP output",()=>{
 const state=CK.createState(),p={foldA:1,foldB:1,cvA:0,cvB:0,blockDC:false};
 const a=CK.process({a:2,b:4,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:5},p,state,48000);
 const b=CK.process({a:2,b:4,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:0},p,state,48000);
 assert.equal(a.chopp,a.outA);assert.equal(b.chopp,b.outB);
});

test("without gate input, zero crossings of A toggle the chopper",()=>{
 const state=CK.createState(),p={foldA:1,foldB:1,cvA:0,cvB:0,blockDC:false};
 CK.process({a:-1,b:3,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:null},p,state,48000);
 const a=CK.process({a:1,b:3,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:null},p,state,48000);
 assert.equal(a.chopA,true);
 const b=CK.process({a:-1,b:3,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:null},p,state,48000);
 assert.equal(b.chopA,false);
});

test("optional DC blocker removes a constant offset over time",()=>{
 const state=CK.createState(),p={foldA:1,foldB:1,cvA:0,cvB:0,blockDC:true};
 let r;for(let i=0;i<20000;i++)r=CK.process({a:2,b:2,cvA:0,cvB:0,vcaA:0,vcaB:0,gate:5},p,state,48000);
 assert.ok(Math.abs(r.chopp)<.05);
});

test("processInto reuses the caller-owned input scratch and result object",()=>{
 const state=CK.createState(),inputs=state.inputs,result=state.result,p={foldA:1,foldB:1,cvA:0,cvB:0,blockDC:false};
 inputs.a=2;inputs.b=4;inputs.gate=5;inputs.cvA=0;inputs.cvB=0;inputs.vcaA=0;inputs.vcaB=0;
 const first=CK.processInto(inputs,p,state,48000);
 assert.strictEqual(first,result);assert.strictEqual(first.state,state);assert.equal(first.chopp,first.outA);
 inputs.a=3;
 const second=CK.processInto(inputs,p,state,48000);
 assert.strictEqual(second,result);assert.strictEqual(state.inputs,inputs);
 assert.equal(second.outA,CK.foldA(3,1));
});

test("reset clears chopper and DC memory while preserving scratch/result identity",()=>{
 const state=CK.createState(),inputs=state.inputs,result=state.result,p={foldA:1,foldB:1,cvA:0,cvB:0,blockDC:true};
 inputs.a=2;inputs.b=4;inputs.gate=5;inputs.cvA=0;inputs.cvB=0;inputs.vcaA=0;inputs.vcaB=0;
 CK.processInto(inputs,p,state,48000);
 assert.ok(state.dcX!==0);assert.ok(state.gateHigh);assert.ok(state.chopA);
 CK.reset(state);
 assert.strictEqual(state.inputs,inputs);assert.strictEqual(state.result,result);
 assert.equal(state.previousA,0);assert.equal(state.chopA,false);assert.equal(state.gateHigh,false);
 assert.equal(state.dcX,0);assert.equal(state.dcY,0);assert.equal(result.chopp,0);assert.strictEqual(result.state,state);
 assert.deepEqual(inputs,{a:null,b:null,gate:null,cvA:null,vcaA:null,cvB:null,vcaB:null});
});

test("invalid inputs and out-of-range controls remain finite and bounded",()=>{
 const state=CK.createState(),p={foldA:Infinity,foldB:-Infinity,cvA:Infinity,cvB:-Infinity,blockDC:false};
 const r=CK.process({a:NaN,b:Infinity,gate:Infinity,cvA:Infinity,cvB:Infinity,vcaA:NaN,vcaB:Infinity},p,state,48000);
 for(const v of [r.outA,r.outB,r.chopp,r.gainA,r.gainB])assert.ok(Number.isFinite(v));
 assert.equal(r.gainA,0);assert.equal(r.gainB,0);assert.equal(r.outA,0);assert.equal(r.outB,CK.foldB(0,0));
});
