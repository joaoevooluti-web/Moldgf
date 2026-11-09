const test=require("node:test");
const assert=require("node:assert/strict");
const BF22=require("../app/src/main/assets/bf22_dsp.js");
const defaults=(overrides={})=>Object.assign({cutoffA:.5,resonanceA:.15,cv1AttA:0,filterModeA:0,slopeA:1,inputLevelA:1,cutoffB:.5,resonanceB:.15,cv1AttB:0,filterModeB:0,slopeB:1,inputLevelB:1,link:0},overrides);
const inputs=(overrides={})=>Object.assign({inA:0,inB:0,cv1A:0,cv2A:0,resCVA:0,cv1B:0,cv2B:0,resCVB:0},overrides);
const tick=(p,x,s,n=1,sr=48000)=>{let r;for(let i=0;i<n;i++)r=BF22.process(p,x,s,sr);return r};
function rmsForSlope(slope){
 const sr=48000,frequency=4000,p=defaults({cutoffA:.5,resonanceA:.1,slopeA:slope}),s=BF22.createState(sr),x=inputs();let sum=0,count=0;
 for(let i=0;i<12000;i++){x.inA=Math.sin(2*Math.PI*frequency*i/sr);const y=BF22.process(p,x,s,sr).outA;if(i>4000){sum+=y*y;count++}}
 return Math.sqrt(sum/count);
}

test("creates two independent filter states and a reusable stereo result",()=>{
 const s=BF22.createState(48000);assert.notEqual(s.a,s.b);assert.notEqual(s.a.ic1,s.b.ic1);
 assert.equal(s.result.outA,0);assert.equal(s.result.outB,0);
});
test("6 dB low-pass passes DC and settles to its input level",()=>{
 const p=defaults({slopeA:0}),s=BF22.createState(),r=tick(p,inputs({inA:1}),s,5000);
 assert.ok(Math.abs(r.outA-1)<.01);
});
test("12 dB low-pass passes DC and settles to its input level",()=>{
 const p=defaults({slopeA:1}),s=BF22.createState(),r=tick(p,inputs({inA:1}),s,5000);
 assert.ok(Math.abs(r.outA-1)<.01);
});
test("6 dB high-pass rejects a steady DC input",()=>{
 const p=defaults({filterModeA:1,slopeA:0}),s=BF22.createState(),r=tick(p,inputs({inA:1}),s,5000);
 assert.ok(Math.abs(r.outA)<.01);
});
test("12 dB high-pass rejects a steady DC input",()=>{
 const p=defaults({filterModeA:1,slopeA:1}),s=BF22.createState(),r=tick(p,inputs({inA:1}),s,5000);
 assert.ok(Math.abs(r.outA)<.01);
});
test("12 dB low-pass attenuates high frequencies more than the 6 dB setting",()=>{
 const six=rmsForSlope(0),twelve=rmsForSlope(1);assert.ok(twelve<six*.65,{six,twelve});
});
test("cutoff CV2 tracks one volt per octave",()=>{
 const p=defaults(),s=BF22.createState(),x=inputs();
 const base=tick(p,x,s).cutoffA;x.cv2A=1;const one=tick(p,x,s).cutoffA;
 assert.ok(Math.abs(one/base-2)<.01);
});
test("cutoff CV1 spans three octaves at ten volts with full positive attenuation",()=>{
 const p=defaults({cv1AttA:1}),s=BF22.createState(),x=inputs();
 const base=tick(p,x,s).cutoffA;x.cv1A=10;const high=tick(p,x,s).cutoffA;
 assert.ok(Math.abs(high/base-8)<.05);
});
test("CV1 attenuverter reverses polarity and has zero at its center",()=>{
 const p=defaults({cv1AttA:0}),s=BF22.createState(),x=inputs({cv1A:10});
 const center=tick(p,x,s).cutoffA;p.cv1AttA=1;const positive=tick(p,x,s).cutoffA;
 p.cv1AttA=-1;const negative=tick(p,x,s).cutoffA;
 assert.ok(Math.abs(center-20*Math.pow(1000,.5))<.1);assert.ok(positive>center);assert.ok(negative<center);
});
test("CV2 tracking is bounded to the documented four-octave span",()=>{
 const p=defaults(),s=BF22.createState(),x=inputs({cv2A:10});
 const high=tick(p,x,s).cutoffA;x.cv2A=-10;const low=tick(p,x,s).cutoffA;
 assert.ok(high/low<17&&high/low>15);
});
test("resonance CV adds to the manual resonance setting",()=>{
 const p=defaults({resonanceA:.2}),s=BF22.createState(),x=inputs();
 const a=tick(p,x,s).resonanceA;x.resCVA=10;const b=tick(p,x,s).resonanceA;
 assert.equal(a,.2);assert.equal(b,1);
});
test("A and B channels keep independent cutoff, resonance and filter modes",()=>{
 const p=defaults({cutoffA:.2,cutoffB:.8,resonanceA:.1,resonanceB:.9,filterModeA:0,filterModeB:1}),s=BF22.createState();
 const r=tick(p,inputs({inA:1,inB:1}),s,5000);
 assert.ok(r.cutoffB>r.cutoffA);assert.ok(r.resonanceB>r.resonanceA);assert.notEqual(r.outA,r.outB);
});
test("link routes filter A output into filter B and ignores the external B input",()=>{
 const p=defaults({filterModeA:0,filterModeB:1,link:1}),s=BF22.createState();
 const a=tick(p,inputs({inA:1,inB:0}),s,1).outB;
 const s2=BF22.createState(),b=tick(p,inputs({inA:1,inB:12}),s2,1).outB;
 assert.equal(a,b);assert.ok(a>0);
});
test("unlinked B channel receives its own external input",()=>{
 const p=defaults({link:0}),s=BF22.createState(),r=tick(p,inputs({inA:0,inB:1}),s,3000);
 assert.ok(Math.abs(r.outA)<.001);assert.ok(r.outB>0.9);
});
test("link implements the classic A high-pass into B low-pass chain",()=>{
 const p=defaults({filterModeA:1,filterModeB:0,link:1}),s=BF22.createState();
 const r=tick(p,inputs({inA:1}),s,1200);assert.ok(Number.isFinite(r.outB));assert.ok(r.cutoffA>0&&r.cutoffB>0);
});
test("manual input level acts as a VCA before the filter",()=>{
 const p=defaults({inputLevelA:.5}),s=BF22.createState(),r=tick(p,inputs({inA:1}),s,5000);
 assert.ok(Math.abs(r.outA-.5)<.01);
});
test("cutoff remains below Nyquist and above the low-frequency floor",()=>{
 const p=defaults({cutoffA:1}),s=BF22.createState(),x=inputs({cv2A:100});
 let r=tick(p,x,s,1,48000);assert.ok(r.cutoffA<=21600);
 p.cutoffA=0;x.cv2A=-100;r=tick(p,x,s,1,48000);assert.ok(r.cutoffA>=10);
});
test("high resonance remains finite and bounded under sustained input",()=>{
 const p=defaults({resonanceA:1,slopeA:1}),s=BF22.createState(),x=inputs({inA:8});let r;
 for(let i=0;i<100000;i++)r=BF22.process(p,x,s,48000);
 assert.ok(Number.isFinite(r.outA));assert.ok(Math.abs(r.outA)<=12);
});
test("sample-rate changes reset filter integrators safely",()=>{
 const p=defaults(),s=BF22.createState(48000),x=inputs({inA:1});
 tick(p,x,s,3000,48000);assert.ok(s.a.lp>0);
 x.inA=0;const r=tick(p,x,s,1,96000);
 assert.equal(s.sampleRate,96000);assert.equal(r.outA,0);
});
test("missing inputs and non-finite parameters produce finite silence",()=>{
 const p=defaults({cutoffA:NaN,resonanceA:NaN,cv1AttA:NaN}),s=BF22.createState();
 const r=tick(p,{},s,8);assert.equal(r.outA,0);assert.equal(r.outB,0);
 assert.ok(Number.isFinite(r.cutoffA)&&Number.isFinite(r.resonanceA));
});
test("process reuses the same result object without per-call output allocation",()=>{
 const p=defaults(),s=BF22.createState(),x=inputs({inA:.25});
 const a=tick(p,x,s),b=tick(p,x,s);assert.equal(a,b);assert.equal(a.outA,b.outA);
});
test("filter peak meters track output and decay smoothly",()=>{
 const p=defaults(),s=BF22.createState(),x=inputs({inA:1});
 const r=tick(p,x,s,2000);assert.ok(r.peakA>0);
 x.inA=0;tick(p,x,s,1000);assert.ok(s.a.peak>=0);
});
