const test=require("node:test");
const assert=require("node:assert/strict");
const Mux=require("../app/src/main/assets/muxlicer_dsp.js");

test("Muxlicer initializes stopped at step one",()=>{
 const s=Mux.createState(),r=Mux.process({bpm:120,speed:.5,gateMode:0,cvRange:0},{},s,48000);
 assert.equal(r.step,1);assert.equal(r.playing,false);assert.equal(r.commonOutCV,5);
});
test("speed encoder spans divide-by-16 through multiply-by-16",()=>{
 assert.equal(Mux.speedRatio(0),1/16);assert.equal(Mux.speedRatio(.5),1);assert.equal(Mux.speedRatio(1),16);
});
test("internal clock advances one step at the selected tempo",()=>{
 const s=Mux.createState();s.playing=true;
 let r;for(let n=0;n<24000;n++)r=Mux.process({bpm:120,speed:.5,gateMode:0},{},s,48000);
 assert.equal(r.step,2);
});
test("external clock advances on falling edge and ignores rising edge",()=>{
 const s=Mux.createState();s.playing=true;
 let r=Mux.process({speed:.5,gateMode:0},{clockIn:5},s,48000);assert.equal(r.step,1);
 r=Mux.process({speed:.5,gateMode:0},{clockIn:0},s,48000);assert.equal(r.step,2);
});
test("external clock division and multiplication change step count",()=>{
 const fast=Mux.createState(),slow=Mux.createState();fast.playing=slow.playing=true;
 for(const state of [fast,slow])Mux.process({speed:.5,gateMode:0},{clockIn:5},state,48000);
 for(const state of [fast,slow])Mux.process({speed:.5,gateMode:0},{clockIn:0},state,48000);
 for(let n=0;n<16;n++){Mux.process({speed:1,gateMode:0},{clockIn:5},fast,48000);Mux.process({speed:1,gateMode:0},{clockIn:0},fast,48000);Mux.process({speed:0,gateMode:0},{clockIn:5},slow,48000);Mux.process({speed:0,gateMode:0},{clockIn:0},slow,48000)}
 assert.ok(fast.step!==slow.step);
});
test("address CV selects a step only on the next clock and suppresses EOC",()=>{
 const s=Mux.createState();s.playing=true;s.step=0;
 Mux.process({speed:.5,address:0,gateMode:0},{clockIn:5},s,48000);
 const r=Mux.process({speed:.5,address:0,gateMode:0},{clockIn:0,addressCV:5},s,48000);
 assert.equal(r.step,5);assert.equal(r.eoc,0);
});
test("reset input resets playback or starts one-shot when stopped",()=>{
 const playing=Mux.createState();playing.playing=true;playing.step=5;
 const r=Mux.process({bpm:120,speed:.5,gateMode:0},{reset:5},playing,48000);
 assert.equal(r.step,1);assert.equal(r.playing,true);
 const stopped=Mux.createState(),one=Mux.process({bpm:120,speed:.5,gateMode:0},{reset:5},stopped,48000);
 assert.equal(one.playing,true);assert.equal(one.oneShot,true);
});
test("one-shot playback stops after step eight and emits one EOC pulse",()=>{
 const s=Mux.createState();s.playing=true;s.oneShot=true;let pulses=0,r;
 for(let n=0;n<80000;n++){r=Mux.process({bpm:300,speed:.5,gateMode:0},{},s,48000);if(r.eoc===10)pulses++}
 assert.equal(r.playing,false);assert.equal(r.step,8);assert.equal(pulses,1);
});
test("normal playback wraps after step eight and emits EOC",()=>{
 const s=Mux.createState();s.playing=true;s.step=7;s.clockPhase=.99999;
 const r=Mux.process({bpm:120,speed:.5,gateMode:0},{},s,48000);
 assert.equal(r.step,1);assert.equal(r.eoc,10);
});
test("addressed jumps do not emit EOC",()=>{
 const s=Mux.createState();s.playing=true;s.step=7;s.clockPhase=.99999;
 const r=Mux.process({bpm:120,speed:.5,address:.5,gateMode:0},{},s,48000);
 assert.equal(r.step,5);assert.equal(r.eoc,0);
});
test("Gate Mode zero disables gates and ALL GATES",()=>{
 const s=Mux.createState();s.playing=true;s.step=0;s.stepPhase=.25;
 const r=Mux.process({gateMode:0},{},s,48000);
 assert.equal(r.gate1,0);assert.equal(r.allGates,0);
});
test("Gate Mode one holds a gate for the full step",()=>{
 const s=Mux.createState();s.playing=true;s.step=0;s.stepPhase=.8;
 const r=Mux.process({gateMode:1/9},{},s,48000);
 assert.equal(r.gate1,10);assert.equal(r.allGates,10);
});
test("Gate Mode two produces a half-step gate",()=>{
 const s=Mux.createState();s.playing=true;s.step=0;s.stepPhase=.75;
 const r=Mux.process({gateMode:2/9},{},s,48000);
 assert.equal(r.gate1,0);
});
test("Gate Mode three produces two retrigger pulses per step",()=>{
 const s=Mux.createState();s.playing=true;s.step=0;s.stepPhase=.1;
 const on=Mux.process({gateMode:3/9},{},s,48000);
 s.stepPhase=.4;const off=Mux.process({gateMode:3/9},{},s,48000);
 s.stepPhase=.6;const on2=Mux.process({gateMode:3/9},{},s,48000);
 assert.equal(on.gate1,10);assert.equal(off.gate1,0);assert.equal(on2.gate1,10);
});
test("Gate Mode CV scales the knob and controls the gate pattern",()=>{
 const s=Mux.createState();s.playing=true;s.step=0;s.stepPhase=.1;
 const off=Mux.process({gateMode:1/9},{gateModeCV:0},s,48000);
 const on=Mux.process({gateMode:1/9},{gateModeCV:10},s,48000);
 assert.equal(off.gate1,0);assert.equal(on.gate1,10);
});
test("MUX mode selects the active input and applies its step fader",()=>{
 const s=Mux.createState();s.step=2;
 const r=Mux.process({switchMode:0,level3:.5,gateMode:0},{stepIn3:4},s,48000);
 assert.equal(r.commonOut,2);assert.equal(r.commonOutCV,2);
});
test("ALL IN is normalled to unpatched MUX steps but individual inputs override it",()=>{
 const s=Mux.createState();s.step=0;
 const a=Mux.process({switchMode:0,level1:.5},{allIn:4},s,48000);
 const b=Mux.process({switchMode:0,level1:.5},{allIn:4,stepIn1:8},Mux.createState(),48000);
 assert.equal(a.commonOut,2);assert.equal(b.commonOut,4);
});
test("sequencer CV range maps faders to 0–5 V, 0–10 V and ±5 V",()=>{
 const s=Mux.createState();
 const a=Mux.process({switchMode:0,cvRange:0,level1:.5,gateMode:0},{},s,48000);
 const b=Mux.process({switchMode:0,cvRange:1,level1:.5,gateMode:0},{},Mux.createState(),48000);
 const c=Mux.process({switchMode:0,cvRange:2,level1:.5,gateMode:0},{},Mux.createState(),48000);
 assert.equal(a.commonOut,2.5);assert.equal(b.commonOut,5);assert.equal(c.commonOut,0);
});
test("DEMUX routes common input to the active step and ALL IN to other steps",()=>{
 const s=Mux.createState();s.step=3;
 const r=Mux.process({switchMode:1,level1:.5,level4:.25,level5:1,gateMode:0},{commonIn:8,allIn:4},s,48000);
 assert.equal(r.stepOut1,2);assert.equal(r.stepOut4,2);assert.equal(r.stepOut5,4);assert.equal(r.commonOut,0);
});
test("clock output follows the independent clock division multiplier",()=>{
 const s=Mux.createState();s.playing=true;s.stepDuration=.5;let pulses=0;
 for(let n=0;n<24000;n++){const r=Mux.process({speed:.5,bpm:120,clockOutDivMult:1,gateMode:0},{},s,48000);if(r.clockOut===10)pulses++}
 assert.equal(pulses,16);
});
