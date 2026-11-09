(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.MoldgfEvenVCODSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const C4=261.6255653006;
 function finite(v){return Number.isFinite(v)?v:0}
 function clamp(v,min,max,fallback=0){return Math.max(min,Math.min(max,Number.isFinite(v)?v:fallback))}
 function wrap(p){return p-Math.floor(p)}
 function polyBlep(t,dt){if(dt<=0)return 0;if(t<dt){const x=t/dt;return x+x-x*x-1}if(t>1-dt){const x=(t-1)/dt;return x*x+x+x+1}return 0}
 function saw(p,dt){return 2*p-1-polyBlep(p,dt)}
 function square(p,pw,dt){return(p<pw?1:-1)+polyBlep(p,dt)-polyBlep(wrap(p-pw),dt)}
 function frequency(params,inputs){const pitch=finite(inputs.pitch1)+finite(inputs.pitch2)+1+Math.round(clamp(params.octave,-5,4,0))+clamp(params.tune,-7,7,0)/12+finite(inputs.fm)*.25;return C4*Math.pow(2,pitch)}
 function createState(){return{phase:0,triangle:0,syncHigh:false}}
 function process(params,inputs,state,sampleRate,sampleTime){
  const s=state||createState(),sr=clamp(sampleRate,8000,384000,48000),dt=clamp(sampleTime,1/sr,.1,1/sr);
  const freq=frequency(params,inputs),delta=clamp(freq*dt,1e-6,.5,.5);
  const sync=finite(inputs.sync),syncHigh=s.syncHigh?sync>.1:sync>=1,syncRising=!s.syncHigh&&syncHigh;s.syncHigh=syncHigh;
  if(syncRising){s.phase=.5;s.triangle=0}
  s.phase=wrap(s.phase+delta);
  const pwm=clamp(params.pwm+finite(inputs.pwm)/5,-1,1,0),pw=params.limitPW===false?(pwm+1)*.5:clamp((pwm+1)*.45+.05,.05,.95,.5);
  const step=Math.max(Math.abs(delta),1/sr);
  const triSquare=square(s.phase,.5,step);s.triangle=clamp(s.triangle+triSquare*4*delta,-1,1,0);
  const triangle=s.triangle,sine=Math.sin(2*Math.PI*s.phase),sawtooth=saw(s.phase,step),squareWave=square(s.phase,pw,step);
  const p2=wrap(s.phase*2),even=saw(p2,Math.min(.5,step*2));
  const pulseOffset=params.removePulseDC===false?2*(.5-pw):0;
  return{outputs:[5*triangle,5*sine,5*even,5*sawtooth,5*(squareWave+pulseOffset)],frequency:freq,phase:s.phase,pulseWidth:pw,state:s};
 }
 return Object.freeze({C4,finite,clamp,wrap,polyBlep,saw,square,frequency,createState,process});
});
