const test=require("node:test");
const assert=require("node:assert/strict");
const Even=require("../app/src/main/assets/even_vco_dsp.js");

test("octave and tune controls set oscillator pitch with two additive V/oct inputs",()=>{
 const f=Even.frequency({octave:0,tune:0},{pitch1:0,pitch2:0,fm:0});
 assert.ok(Math.abs(f-2*Even.C4)<1e-9);
 const high=Even.frequency({octave:1,tune:0},{pitch1:1,pitch2:0,fm:0});
 assert.ok(Math.abs(high-8*Even.C4)<1e-9);
});

test("FM input is scaled to quarter-volt-per-octave sensitivity",()=>{
 const a=Even.frequency({octave:0,tune:0},{pitch1:0,pitch2:0,fm:0});
 const b=Even.frequency({octave:0,tune:0},{pitch1:0,pitch2:0,fm:4});
 assert.ok(Math.abs(b/a-2)<1e-9);
});

test("five waveform outputs remain finite and within the five-volt nominal range",()=>{
 for(let i=0;i<5;i++){
  const r=Even.process({octave:0,tune:0,pwm:0,limitPW:true,removePulseDC:true},{pitch1:0,pitch2:0,fm:0,sync:0,pwm:0},Even.createState(),48000,1/48000);
  assert.ok(Number.isFinite(r.outputs[i]));assert.ok(Math.abs(r.outputs[i])<=5);
 }
});

test("even output has twice the fundamental cycle rate",()=>{
 const state=Even.createState(),params={octave:-5,tune:0,pwm:0,limitPW:true,removePulseDC:true};
 let evenCrossings=0,sawCrossings=0,previousEven=0,previousSaw=0;
 for(let i=0;i<48000;i++){
  const out=Even.process(params,{pitch1:0,pitch2:0,fm:0,sync:0,pwm:0},state,48000,1/48000).outputs;
  if(i&&Math.sign(out[2])!==Math.sign(previousEven))evenCrossings++;
  if(i&&Math.sign(out[3])!==Math.sign(previousSaw))sawCrossings++;
  previousEven=out[2];previousSaw=out[3];
 }
 assert.ok(evenCrossings>sawCrossings*1.8&&evenCrossings<sawCrossings*2.2);
});

test("hard sync resets phase on a rising edge",()=>{
 const state=Even.createState(),p={octave:0,tune:0,pwm:0,limitPW:true,removePulseDC:true},i={pitch1:0,pitch2:0,fm:0,sync:0,pwm:0};
 Even.process(p,i,state,48000,1/48000);
 const r=Even.process(p,{...i,sync:5},state,48000,1/48000);
 assert.ok(r.phase>.5);
});

test("PWM input changes pulse width and remains limited to five-to-ninety-five percent",()=>{
 const a=Even.process({octave:0,tune:0,pwm:0,limitPW:true,removePulseDC:true},{pitch1:0,pitch2:0,fm:0,sync:0,pwm:-5},Even.createState(),48000,1/48000);
 const b=Even.process({octave:0,tune:0,pwm:0,limitPW:true,removePulseDC:true},{pitch1:0,pitch2:0,fm:0,sync:0,pwm:5},Even.createState(),48000,1/48000);
 assert.equal(a.pulseWidth,.05);assert.equal(b.pulseWidth,.95);
});

test("pulse DC removal can be disabled for hardware compatibility",()=>{
 const p={octave:0,tune:0,pwm:.5,limitPW:true,removePulseDC:false};
 const r=Even.process(p,{pitch1:0,pitch2:0,fm:0,sync:0,pwm:0},Even.createState(),48000,1/48000);
 assert.ok(Number.isFinite(r.outputs[4]));
});

test("processInto writes to the same state-owned output buffer and updates frequency readout",()=>{
 const state=Even.createState(),input=state.inputs,output=state.outputs;
 const p={octave:0,tune:0,pwm:0,limitPW:true,removePulseDC:true};
 input.pitch1=input.pitch2=input.fm=input.sync=input.pwm=0;
 const first=Even.processInto(p,input,state,48000,1/48000);
 assert.strictEqual(first,output);
 assert.ok(first.every(Number.isFinite));
 assert.ok(Math.abs(state.frequency-2*Even.C4)<1e-9);
 input.pitch1=1;
 const second=Even.processInto(p,input,state,48000,1/48000);
 assert.strictEqual(second,output);
 assert.strictEqual(state.outputs,output);
 assert.ok(Math.abs(state.frequency-4*Even.C4)<1e-9);
});

test("reset clears oscillator state and buffers without replacing scratch or outputs",()=>{
 const state=Even.createState(),input=state.inputs,output=state.outputs;
 const p={octave:0,tune:0,pwm:0,limitPW:true,removePulseDC:true};
 Even.processInto(p,input,state,48000,1/48000);
 input.sync=5;input.pitch1=1;Even.processInto(p,input,state,48000,1/48000);
 assert.ok(state.phase>0);
 assert.ok(output.some(v=>v!==0));
 assert.strictEqual(Even.reset(state),state);
 assert.strictEqual(state.inputs,input);
 assert.strictEqual(state.outputs,output);
 assert.equal(state.phase,0);
 assert.equal(state.triangle,0);
 assert.equal(state.syncHigh,false);
 assert.equal(state.frequency,0);
 assert.equal(state.pulseWidth,.5);
 assert.deepEqual(Array.from(output),[0,0,0,0,0]);
 assert.deepEqual({...input},{pitch1:0,pitch2:0,fm:0,sync:0,pwm:0});
});

test("compatibility process returns independent snapshots and numeric switch settings",()=>{
 const state=Even.createState(),input={pitch1:0,pitch2:0,fm:0,sync:0,pwm:0};
 const p={octave:0,tune:0,pwm:0,limitPW:1,removePulseDC:1};
 const first=Even.process(p,input,state,48000,1/48000),snapshot=first.outputs;
 const second=Even.process({...p,pwm:.25},input,state,48000,1/48000);
 assert.ok(Array.isArray(snapshot));
 assert.notStrictEqual(snapshot,state.outputs);
 assert.notStrictEqual(snapshot,second.outputs);
 assert.strictEqual(first.state,state);
 const full=Even.process({...p,pwm:1,limitPW:0,removePulseDC:0},input,state,48000,1/48000);
 assert.equal(full.pulseWidth,1);
 assert.ok(full.outputs.every(Number.isFinite));
});
