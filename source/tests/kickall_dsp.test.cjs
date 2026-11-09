const test=require("node:test");
const assert=require("node:assert/strict");
const Kickall=require("../app/src/main/assets/kickall_dsp.js");

test("Kickall is silent until a trigger arrives",()=>{
 const s=Kickall.createState(),r=Kickall.process({tune:.5,shape:0,time:.5,bend:.5,decay:.5},{},s,48000);
 assert.equal(r.out,0);assert.equal(r.volumeEnvelope,0);assert.equal(r.triggerCount,0);
});
test("trigger input starts pitch and volume envelopes together",()=>{
 const s=Kickall.createState(),r=Kickall.process({tune:.5,shape:0,time:.5,bend:.5,decay:.5},{trigger:5},s,48000);
 assert.equal(r.triggered,true);assert.equal(r.volumeEnvelope,Math.exp(-1/(48000*Kickall.envelopeTime(.5,.025,6))));
 assert.ok(r.pitchEnvelope>0);assert.equal(r.triggerCount,1);
});
test("held trigger gate does not retrigger until a new rising edge",()=>{
 const s=Kickall.createState(),p={tune:.5,shape:0,time:.5,bend:.5,decay:.5};
 Kickall.process(p,{trigger:5},s,48000);Kickall.process(p,{trigger:5},s,48000);
 assert.equal(s.triggerCount,1);
 Kickall.process(p,{trigger:0},s,48000);Kickall.process(p,{trigger:5},s,48000);
 assert.equal(s.triggerCount,2);
});
test("manual trigger starts the voice without an external cable",()=>{
 const s=Kickall.createState(),r=Kickall.process({tune:.5,shape:0,time:.5,bend:.5,decay:.5,manualTrigger:true},{},s,48000);
 assert.equal(r.triggered,true);assert.ok(r.out!==0);assert.equal(r.triggerCount,1);
});
test("Tune CV follows one volt per octave",()=>{
 const p={tune:.5,shape:0,time:.5,bend:0,decay:.5};
 const a=Kickall.process(p,{tune:0},Kickall.createState(),48000);
 const b=Kickall.process(p,{tune:1},Kickall.createState(),48000);
 assert.ok(Math.abs(b.frequency/a.frequency-2)<1e-10);
});
test("manual Tune spans the documented A0-to-B2 base range",()=>{
 const p={shape:0,time:.5,bend:0,decay:.5};
 const low=Kickall.process({...p,tune:0},{},Kickall.createState(),48000);
 const high=Kickall.process({...p,tune:1},{},Kickall.createState(),48000);
 assert.ok(Math.abs(low.baseFrequency-27.5)<.01);
 assert.ok(Math.abs(high.baseFrequency-123.47)<.1);
});
test("pitch Bend controls the initial pitch-envelope excursion",()=>{
 const p={tune:.5,shape:0,time:.5,decay:.5};
 const low=Kickall.process({...p,bend:0},{trigger:5},Kickall.createState(),48000);
 const high=Kickall.process({...p,bend:1},{trigger:5},Kickall.createState(),48000);
 assert.ok(high.frequency>low.frequency*20);
});
test("pitch Time changes the pitch envelope decay",()=>{
 const fast=Kickall.createState(),slow=Kickall.createState(),p={tune:.5,shape:0,bend:1,decay:.5};
 let a,b;for(let n=0;n<6000;n++){a=Kickall.process({...p,time:0},{trigger:n===0?5:0},fast,48000);b=Kickall.process({...p,time:1},{trigger:n===0?5:0},slow,48000)}
 assert.ok(b.pitchEnvelope>a.pitchEnvelope);
});
test("Decay CV adjusts the main VCA envelope time",()=>{
 const fast=Kickall.envelopeTime(Kickall.clamp(.5-1,0,1),.025,6);
 const slow=Kickall.envelopeTime(Kickall.clamp(.5+1,0,1),.025,6);
 assert.ok(slow>fast);
});
test("Shape morphs from sine toward a bounded square wave",()=>{
 const p={tune:.5,time:.5,bend:0,decay:1};
 const a=Kickall.process({...p,shape:0},{},Kickall.createState(),48000);
 const b=Kickall.process({...p,shape:1},{},Kickall.createState(),48000);
 assert.ok(Math.abs(a.out)<=5&&Math.abs(b.out)<=5);
 assert.ok(Math.abs(a.out-b.out)>.001);
});
test("general volume VCA is normalled to full level and responds to CV",()=>{
 const p={tune:.5,shape:0,time:.5,bend:0,decay:1};
 const full=Kickall.process(p,{},Kickall.createState(),48000);
 const half=Kickall.process(p,{volume:5},Kickall.createState(),48000);
 const muted=Kickall.process(p,{volume:0},Kickall.createState(),48000);
 assert.ok(Math.abs(full.out-half.out*2)<1e-9);assert.equal(muted.out,0);
});
test("Kickall output remains finite and bounded at extreme CV values",()=>{
 const s=Kickall.createState();let r;
 for(let n=0;n<5000;n++)r=Kickall.process({tune:1,shape:1,time:0,bend:1,decay:0},{trigger:n===0?10:0,tune:10,shape:10,decay:10,volume:10},s,96000);
 assert.ok(Number.isFinite(r.out)&&Math.abs(r.out)<=5);assert.ok(Number.isFinite(r.frequency));
});
