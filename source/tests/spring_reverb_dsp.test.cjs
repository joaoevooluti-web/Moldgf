const test=require("node:test");
const assert=require("node:assert/strict");
const Spring=require("../app/src/main/assets/spring_reverb_dsp.js");

test("IN1 is routed to the dry/wet mix while its fader controls tank send",()=>{
 const s=Spring.createState(),r=Spring.process({level1:0,level2:0,mix:0,hpf:0},{in1:3},s,48000);
 assert.equal(r.mix,3);assert.equal(r.tankInput,0);
});
test("IN2 feeds the tank only and does not enter the dry path",()=>{
 const s=Spring.createState(),r=Spring.process({level1:1,level2:1,mix:0,hpf:0},{in1:0,in2:5},s,48000);
 assert.equal(r.dry,0);assert.equal(r.mix,0);assert.equal(r.tankInput,5);
});
test("IN1 VCA is normalled to 10 V when CV is unpatched",()=>{
 assert.equal(Spring.cvGain(.7,null),.7);
 assert.equal(Spring.cvGain(.7,0),0);
 assert.equal(Spring.cvGain(.7,5),.35);
 assert.equal(Spring.cvGain(.7,10),.7);
});
test("IN2 VCA responds to its own CV and slider",()=>{
 const s=Spring.createState(),r=Spring.process({level1:0,level2:.8,mix:0},{in2:5,cv2:2.5},s,48000);
 assert.equal(r.tankInput,1);
});
test("MIX CV is added to the dry/wet control and clamped",()=>{
 const s=Spring.createState(),r=Spring.process({level1:1,level2:0,mix:.2,hpf:0},{in1:2,mixCV:10},s,48000);
 assert.equal(r.mixAmount,1);assert.equal(r.mix,r.wet);
 const r2=Spring.process({level1:1,level2:0,mix:.9,hpf:0},{in1:2,mixCV:-20},s,48000);
 assert.equal(r2.mixAmount,0);assert.equal(r2.mix,2);
});
test("HPF at minimum is transparent and higher settings reject DC",()=>{
 const s=Spring.createState();assert.equal(Spring.highPass(2,20,s,48000),2);
 const hp=Spring.createState();let y=0;for(let n=0;n<3000;n++)y=Spring.highPass(2,1000,hp,48000);
 assert.ok(Math.abs(y)<.02);
});
test("tank produces a delayed wet response and a decaying tail",()=>{
 const s=Spring.createState();let first=0,peak=0,last=0;
 for(let n=0;n<18000;n++){const r=Spring.process({level1:1,level2:0,mix:1,hpf:0},{in1:n===0?4:0},s,48000);if(n===0)first=r.wet;peak=Math.max(peak,Math.abs(r.wet));last=Math.abs(r.wet)}
 assert.equal(first,0);assert.ok(peak>.01);assert.ok(Number.isFinite(last));
});
test("feedback-level inputs remain finite and bounded under overload",()=>{
 const s=Spring.createState();let r;
 for(let n=0;n<24000;n++)r=Spring.process({level1:1,level2:1,mix:1,hpf:.2},{in1:20,in2:20},s,48000);
 assert.ok(Number.isFinite(r.wet)&&Math.abs(r.wet)<=5);
 assert.ok(Number.isFinite(r.mix)&&Math.abs(r.mix)<=10);
});
test("input and wet VU meters follow their respective signal paths",()=>{
 const s=Spring.createState();let r;
 for(let n=0;n<3000;n++)r=Spring.process({level1:1,level2:0,mix:1,hpf:0},{in1:4},s,48000);
 assert.ok(r.inputMeter>0);assert.ok(r.wetMeter>0);assert.ok(["green","orange","red"].includes(r.inputMeterColor));
});
test("sample-rate changes rebuild delay buffers without stale indices",()=>{
 const s=Spring.createState(48000);s.combIndex[0]=s.comb[0].length-1;
 const r=Spring.process({level1:1,level2:0,mix:1},{in1:1},s,44100);
 assert.equal(r.state.sampleRate,44100);assert.notEqual(r.state,s);assert.ok(r.state.combIndex[0]>=0);
});
test("dry output remains present at zero wet mix regardless of tank send fader",()=>{
 const s=Spring.createState(),r=Spring.process({level1:0,level2:1,mix:0},{in1:-2,in2:4},s,48000);
 assert.equal(r.mix,-2);
});
