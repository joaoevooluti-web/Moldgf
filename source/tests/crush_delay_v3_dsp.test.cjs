const test=require("node:test");
const assert=require("node:assert/strict");
const Crush=require("../app/src/main/assets/crush_delay_v3_dsp.js");
const params=(overrides={})=>Object.assign({time:0,feedback:0,inVol:1,returnVol:1,dryWet:0,crush1:0,crush2:0,crush3:0},overrides);
const inputs=(overrides={})=>Object.assign({input:0,return:0,timeCV:null,feedbackCV:null,inVolCV:null,returnVolCV:null,dryWetCV:null,crushGate:0},overrides);
const tick=(p,x,s,n=1,sr=48000)=>{let r;for(let i=0;i<n;i++)r=Crush.process(p,x,s,sr);return r};
function impulseWet(time=0,feedback=0,extra={}) {
 const p=params(Object.assign({time,feedback,dryWet:1},extra)),s=Crush.createState(48000),x=inputs();let first=-1,peak=0;
 for(let i=0;i<Math.ceil(Crush.delayTime(time)*48)+32;i++){x.input=i===0?1:0;const r=Crush.process(p,x,s,48000);if(Math.abs(r.send)>peak)peak=Math.abs(r.send);if(first<0&&Math.abs(r.send)>.5)first=i}
 return {first,peak,p,s,x};
}

test("creates a preallocated two-second delay line and reusable result object",()=>{
 const s=Crush.createState(48000);assert.ok(s.buffer.length>=96000);assert.equal(s.result.output,0);
});
test("time control spans fast clean 5 ms, 400 ms midpoint and 2 s crushed end",()=>{
 assert.equal(Crush.delayTime(0),5);assert.equal(Crush.delayTime(.5),400);assert.equal(Crush.delayTime(1),2000);
});
test("main input passes directly to OUT when DRY/WET is fully dry",()=>{
 const p=params({dryWet:0}),s=Crush.createState(),r=tick(p,inputs({input:.75}),s);
 assert.equal(r.output,.75);assert.equal(r.send,0);
});
test("main input reaches SEND and OUT after the clean delay time",()=>{
 const r=impulseWet(0);assert.equal(r.first,240);assert.ok(r.peak>.99);
});
test("RETURN feeds the delay but is excluded from the direct dry path",()=>{
 const p=params({dryWet:0}),s=Crush.createState(48000),x=inputs();let peak=0;
 for(let i=0;i<300;i++){x.return=i===0?1:0;const r=Crush.process(p,x,s,48000);peak=Math.max(peak,Math.abs(r.output))}
 assert.equal(peak,0);
});
test("RETURN signal is present in the fully wet SEND output",()=>{
 const p=params({dryWet:1}),s=Crush.createState(48000),x=inputs();let peak=0;
 for(let i=0;i<300;i++){x.return=i===0?1:0;const r=Crush.process(p,x,s,48000);peak=Math.max(peak,Math.abs(r.send))}
 assert.ok(peak>.99);
});
test("IN VOL CV is normalled to ten volts when unpatched",()=>{
 const p=params({inVol:.4}),s=Crush.createState(),r=tick(p,inputs({input:1}),s);
 assert.equal(r.inputGain,.4);
});
test("IN VOL CV acts as a VCA when patched",()=>{
 const p=params({inVol:1}),s=Crush.createState();
 assert.equal(tick(p,inputs({input:1,inVolCV:0}),s).inputGain,0);
 assert.equal(tick(p,inputs({input:1,inVolCV:5}),s).inputGain,.5);
});
test("RETURN VOL CV is independently normalled and attenuated",()=>{
 const p=params({returnVol:.8}),s=Crush.createState();
 assert.equal(tick(p,inputs({return:1,returnVolCV:null}),s).returnGain,.8);
 assert.equal(tick(p,inputs({return:1,returnVolCV:5}),s).returnGain,.4);
});
test("TIME CV sums with the knob and changes the delay duration",()=>{
 const p=params({time:.25}),s=Crush.createState();
 const a=tick(p,inputs(),s).delayMs,b=tick(p,inputs({timeCV:10}),s).delayMs;
 assert.equal(a,202.5);assert.equal(b,1200);
});
test("FEEDBACK CV sums with the feedback control",()=>{
 const p=params({feedback:.25}),s=Crush.createState();
 assert.equal(tick(p,inputs({feedbackCV:10}),s).feedback,.75);
});
test("DRY/WET CV sums with the manual control and is clipped to its range",()=>{
 const p=params({dryWet:.5}),s=Crush.createState();
 assert.equal(tick(p,inputs({dryWetCV:10}),s).dryWet,1);
 assert.equal(tick(p,inputs({dryWetCV:-20}),s).dryWet,0);
});
test("feedback creates successive delayed repeats",()=>{
 const p=params({time:0,feedback:.5,dryWet:1}),s=Crush.createState(48000),x=inputs();let first=0,second=0;
 for(let i=0;i<500;i++){x.input=i===0?1:0;const y=Crush.process(p,x,s,48000).send;if(i===240)first=y;if(i===480)second=y}
 assert.ok(first>.99);assert.ok(Math.abs(second-.5)<.02);
});
test("CRUSH gate activates all three modifiers at the documented 3 V threshold",()=>{
 const p=params(),s=Crush.createState();
 assert.equal(tick(p,inputs({crushGate:2.99}),s).activeModifiers,0);
 assert.equal(tick(p,inputs({crushGate:3}),s).activeModifiers,7);
});
test("three manual crush switches can be enabled independently",()=>{
 const s=Crush.createState();
 assert.equal(tick(params({crush1:1}),inputs(),s).activeModifiers,1);
 assert.equal(tick(params({crush2:1}),inputs(),s).activeModifiers,2);
 assert.equal(tick(params({crush3:1}),inputs(),s).activeModifiers,4);
});
test("TIME past its midpoint introduces the documented slow-crush character",()=>{
 const s=Crush.createState(),r=tick(params({time:.75}),inputs(),s);
 assert.ok(r.crushIntensity>.4);assert.ok(r.activeModifiers&1);
});
test("bit-crush modifier quantizes the delayed signal",()=>{
 const p=params({time:0,dryWet:1,crush1:1}),s=Crush.createState(48000),x=inputs();let wet=0;
 for(let i=0;i<241;i++){x.input=i===0?.123456:0;wet=Crush.process(p,x,s,48000).send}
 assert.notEqual(wet,.123456);assert.ok(Math.abs(wet-.123456)<.001);
});
test("sample-rate reduction modifier holds the delayed sample across its clock period",()=>{
 const p=params({time:0,dryWet:1,crush2:1}),s=Crush.createState(48000),x=inputs(),v=[];
 for(let i=0;i<260;i++){x.input=i===0?1:i%2?-.5:.5;const r=Crush.process(p,x,s,48000);if(i>=241&&i<252)v.push(r.send)}
 assert.ok(v.length>=3);assert.equal(v[0],v[1]);assert.equal(v[1],v[2]);
});
test("crush modifiers remain bounded and finite under high-level feedback",()=>{
 const p=params({time:1,feedback:.98,dryWet:1,crush1:1,crush2:1,crush3:1}),s=Crush.createState(48000),x=inputs({input:8});let r;
 for(let i=0;i<100000;i++)r=Crush.process(p,x,s,48000);
 assert.ok(Number.isFinite(r.output)&&Number.isFinite(r.send));assert.ok(Math.abs(r.output)<=12);
});
test("delay buffer wraps safely after more than one full two-second cycle",()=>{
 const p=params({feedback:.2}),s=Crush.createState(48000),x=inputs({input:.1});
 for(let i=0;i<s.buffer.length+64;i++)Crush.process(p,x,s,48000);
 assert.ok(s.writeIndex>=0&&s.writeIndex<s.buffer.length);
 assert.ok(Number.isFinite(s.lastWet));
});
test("sample-rate changes resize and clear the delay buffer",()=>{
 const p=params(),s=Crush.createState(48000),x=inputs({input:1});
 tick(p,x,s,100,48000);assert.ok(s.writeIndex>0);
 tick(p,inputs(),s,1,96000);assert.equal(s.sampleRate,96000);assert.equal(s.writeIndex,1);
 assert.equal(s.buffer.length>=192000,true);
});
test("output and send share a stable result object without per-sample result allocation",()=>{
 const p=params(),s=Crush.createState(),x=inputs({input:.25});
 const a=tick(p,x,s),b=tick(p,x,s);assert.equal(a,b);
});
test("missing inputs and non-finite controls never emit NaN or Infinity",()=>{
 const p=params({time:NaN,feedback:NaN,dryWet:NaN,inVol:NaN}),s=Crush.createState();
 const r=tick(p,{},s,20);assert.ok(Number.isFinite(r.output)&&Number.isFinite(r.send));
});
test("wet and output peak meters follow signal and decay",()=>{
 const p=params({dryWet:1}),s=Crush.createState(),x=inputs({input:1});
 tick(p,x,s,300);assert.ok(s.peakWet>0);x.input=0;tick(p,x,s,1000);assert.ok(s.peakWet>=0&&s.peakOutput>=0);
});
