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
