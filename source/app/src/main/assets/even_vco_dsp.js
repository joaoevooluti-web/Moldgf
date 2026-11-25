(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.MoldgfEvenVCODSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const C4=261.6255653006;
 function finite(v){return Number.isFinite(v)?v:0}
 function clamp(v,min,max,fallback=0){return Math.max(min,Math.min(max,Number.isFinite(v)?v:fallback))}
 function wrap(p){return p-Math.floor(p)}
 function polyBlep(t,dt){if(dt<=0)return 0;if(t<dt){const x=t/dt;return x+x-x*x-1}if(t>1-dt){const x=(t-1)/dt;return x*x+x+1}return 0}
 function saw(p,dt){return 2*p-1-polyBlep(p,dt)}
 function square(p,pw,dt){return(p<pw?1:-1)+polyBlep(p,dt)-polyBlep(wrap(p-pw),dt)}
 function frequency(params,inputs){
  const p=params||{},i=inputs||{};
  const pitch=finite(i.pitch1)+finite(i.pitch2)+1+Math.round(clamp(p.octave,-5,4,0))+clamp(p.tune,-7,7,0)/12+finite(i.fm)*.25;
  return C4*Math.pow(2,pitch)
 }
 function createState(){
  return{phase:0,triangle:0,syncHigh:false,frequency:0,pulseWidth:.5,
   inputs:{pitch1:0,pitch2:0,fm:0,sync:0,pwm:0},outputs:new Float32Array(5)}
 }
 function reset(state){
  if(!state||!state.inputs||!state.outputs||state.outputs.length<5)return false;
  state.phase=0;state.triangle=0;state.syncHigh=false;state.frequency=0;state.pulseWidth=.5;
  const i=state.inputs;i.pitch1=i.pitch2=i.fm=i.sync=i.pwm=0;
  state.outputs.fill(0);
  return state
 }
 function processInto(params,inputs,state,sampleRate,sampleTime){
  if(!state||!state.inputs||!state.outputs||state.outputs.length<5)throw new TypeError("Even VCO processInto requires a state from createState()");
  const p=params||{},i=inputs||state.inputs,s=state;
  const sr=clamp(sampleRate,8000,384000,48000),dt=clamp(sampleTime,1/sr,.1,1/sr);
  const freq=frequency(p,i),delta=clamp(freq*dt,1e-6,.5,.5);
  const sync=finite(i.sync),syncHigh=s.syncHigh?sync>.1:sync>=1,syncRising=!s.syncHigh&&syncHigh;
  s.syncHigh=syncHigh;
  if(syncRising){s.phase=.5;s.triangle=0}
  s.phase=wrap(s.phase+delta);
  const pwm=clamp(p.pwm+finite(i.pwm)/5,-1,1,0);
  const limitPW=p.limitPW===false||p.limitPW===0?false:true;
  const pw=limitPW?clamp((pwm+1)*.45+.05,.05,.95,.5):(pwm+1)*.5;
  const step=Math.max(Math.abs(delta),1/sr);
  const triSquare=square(s.phase,.5,step);s.triangle=clamp(s.triangle+triSquare*4*delta,-1,1,0);
  const triangle=s.triangle,sine=Math.sin(2*Math.PI*s.phase),sawtooth=saw(s.phase,step),squareWave=square(s.phase,pw,step);
  const p2=wrap(s.phase*2),even=saw(p2,Math.min(.5,step*2));
  const removeDC=p.removePulseDC===false||p.removePulseDC===0?false:true;
  const pulseOffset=removeDC?0:2*(.5-pw),out=s.outputs;
  out[0]=5*triangle;out[1]=5*sine;out[2]=5*even;out[3]=5*sawtooth;out[4]=5*(squareWave+pulseOffset);
  s.frequency=freq;s.pulseWidth=pw;
  return out
 }
 function process(params,inputs,state,sampleRate,sampleTime){
  const s=state||createState();
  processInto(params,inputs||s.inputs,s,sampleRate,sampleTime);
  return{outputs:Array.from(s.outputs),frequency:s.frequency,phase:s.phase,pulseWidth:s.pulseWidth,state:s}
 }
 return Object.freeze({C4,finite,clamp,wrap,polyBlep,saw,square,frequency,createState,reset,processInto,process});
});
