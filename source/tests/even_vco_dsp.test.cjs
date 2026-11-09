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
 const values=[];for(let i=0;i<48000;i++)values.push(Even.process(params,{pitch1:0,pitch2:0,fm:0,sync:0,pwm:0},state,48000,1/48000).outputs[2]);
 const transitions=values.slice(1).filter((v,i)=>Math.sign(v)!==Math.sign(values[i])).length;
 assert.ok(transitions>=3&&transitions<=5);
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
