const test=require("node:test");
const assert=require("node:assert/strict");
const Rampage=require("../app/src/main/assets/rampage_dsp.js");

test("dual channels keep independent state and outputs",()=>{
 const s=Rampage.createState();
 const a=Rampage.process({riseA:0,fallA:0,riseB:1,fallB:1,rangeA:1,rangeB:1,cycleA:false,cycleB:false},{triggerA:5},s,48000);
 assert.equal(a.a.stage,1);assert.equal(a.b.stage,0);assert.notEqual(a.a.value,a.b.value);
});
test("manual and external trigger edges start one-shot ramps",()=>{
 const s=Rampage.createState(),p={riseA:0,fallA:0,rangeA:1,cycleA:false};
 Rampage.process(p,{triggerA:0},s,48000);
 const r=Rampage.process(p,{triggerA:5},s,48000);
 assert.equal(r.a.stage,1);assert.ok(r.a.out>0);
});
test("one-shot reaches peak then returns to zero and stops",()=>{
 const s=Rampage.createState(),p={riseA:0,fallA:0,rangeA:0,cycleA:false};
 Rampage.process(p,{triggerA:5},s,48000);
 let r;for(let n=0;n<120000;n++)r=Rampage.process(p,{},s,48000);
 assert.equal(r.a.stage,0);assert.equal(r.a.out,0);assert.equal(r.a.eoc,0);
});
test("cycle mode repeatedly retriggers and emits end-of-cycle pulse",()=>{
 const s=Rampage.createState(),p={riseA:0,fallA:0,rangeA:0,cycleA:true};
 let sawEoc=false;for(let n=0;n<10000;n++){const r=Rampage.process(p,{},s,48000);if(r.a.eoc===10)sawEoc=true}
 assert.equal(sawEoc,true);assert.ok(s.a.value>=0&&s.a.value<=10);
});
test("rise and fall CV inputs alter the corresponding time constants",()=>{
 const short=Rampage.timeSeconds(0,0,0,1),long=Rampage.timeSeconds(1,0,0,1);
 assert.ok(long>short*100);
 assert.ok(Rampage.timeSeconds(.5,-5,0,1)<Rampage.timeSeconds(.5,5,0,1));
});
test("range switch selects fast, medium and slow time domains",()=>{
 const fast=Rampage.timeSeconds(.5,0,0,0),mid=Rampage.timeSeconds(.5,0,0,1),slow=Rampage.timeSeconds(.5,0,0,2);
 assert.ok(fast<mid&&mid<slow);
});
test("shape morph is bounded and monotonic",()=>{
 for(const shape of [-1,-.5,0,.5,1]){let prev=-1;for(let n=0;n<=100;n++){const v=Rampage.shapeValue(n/100,shape);assert.ok(v>=prev);assert.ok(v>=0&&v<=1);prev=v}}
});
test("comparator, minimum and maximum outputs track the two ramps",()=>{
 const s=Rampage.createState();s.a.value=7;s.b.value=3;
 const r=Rampage.process({riseA:.5,fallA:.5,riseB:.5,fallB:.5,cycleA:false,cycleB:false,balance:.5},{},s,48000);
 assert.equal(r.outputs.compare,0);assert.ok(r.outputs.min<=r.outputs.max);
});
test("invalid sample rate and non-finite input remain finite",()=>{
 const s=Rampage.createState(),r=Rampage.process({riseA:NaN,fallA:Infinity,cycleA:true},{signalA:NaN,triggerA:Infinity},s,0);
 for(const v of Object.values(r.outputs))assert.ok(Number.isFinite(v));
});

test("manual trigger input initializes the selected function generator",()=>{
 const s=Rampage.createState(),r=Rampage.process({riseA:0,fallA:0,rangeA:0,cycleA:false,manualTriggerA:true},{},s,48000);
 assert.equal(r.a.stage,1);assert.ok(r.a.out>0);
});
test("external signal input follows a rising CV with independent slew time",()=>{
 const s=Rampage.createState(),p={riseA:0,fallA:0,rangeA:0,cycleA:false};
 Rampage.process(p,{signalA:0},s,48000);
 const r=Rampage.process(p,{signalA:5},s,48000);
 assert.ok(r.a.out>0&&r.a.out<5);
});
test("cycle CV inverts the front-panel cycle switch",()=>{
 const s=Rampage.createState(),p={riseA:0,fallA:0,rangeA:0,cycleA:false};
 const r=Rampage.process(p,{cycleCVA:5},s,48000);
 assert.equal(r.a.stage,1);
});
test("trigger can retrigger a channel during its falling segment",()=>{
 const s=Rampage.createState(),p={riseA:.2,fallA:.2,rangeA:1,cycleA:false};
 Rampage.process(p,{triggerA:5},s,48000);
 Rampage.process(p,{triggerA:0},s,48000);
 let r;for(let n=0;n<320;n++)r=Rampage.process(p,{},s,48000);
 assert.equal(r.a.stage,2);
 r=Rampage.process(p,{triggerA:5},s,48000);
 assert.equal(r.a.stage,1);
});
test("one-shot completion emits a single EOC pulse",()=>{
 const s=Rampage.createState(),p={riseA:0,fallA:0,rangeA:0,cycleA:false};
 Rampage.process(p,{triggerA:5},s,48000);
 let pulse=0;for(let n=0;n<100;n++){const r=Rampage.process(p,{},s,48000);if(r.a.eoc===10)pulse++}
 assert.equal(pulse,1);
});
