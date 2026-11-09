(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfOctavesDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function createState(){
  const outputs=new Float32Array(6),result={outputs,frequency:261.625565,phase:0,pulseWidth:.5};
  return{phase:0,syncHigh:false,frequency:261.625565,pulseWidth:.5,outputs,result};
 }
 function pulseAtPhase(phase,width){
  const p=((phase%1)+1)%1,w=clamp(width,.05,.95,.5),start=(1-w)*.5,end=(1+w)*.5;
  return p>=start&&p<end?1:-1;
 }
 function process(params,inputs,state,sampleRate,outputPatched){
  const p=params||{},i=inputs||{},s=state||createState(),sr=clamp(sampleRate,8000,192000,48000);
  const range=Math.round(clamp(p.tuneRange,0,2,1)),tune=clamp(p.tune,-1,1,0);
  const tuneSemitones=tune*(range===0?60:range===1?12:1);
  const octave=Math.round(clamp(p.octave,0,6,2))-2;
  const pitch=finite(i.pitch1)+finite(i.pitch2);
  const rawFrequency=261.625565*Math.pow(2,octave+tuneSemitones/12+pitch);
  const frequency=clamp(rawFrequency,5,sr*.45/32,261.625565);
  const pwmCV=i.pwmCV===null||i.pwmCV===undefined?0:finite(i.pwmCV);
  const width=clamp(p.pwm+(pwmCV/10)*clamp(p.pwmAtt,0,1,0),.05,.95,.5);
  const sync=finite(i.sync)>=2.5,syncEdge=sync&&!s.syncHigh;s.syncHigh=sync;
  if(syncEdge)s.phase=0;
  s.phase+=frequency/sr;if(s.phase>=1)s.phase-=Math.floor(s.phase);
  let sum=0;
  for(let n=0;n<6;n++){
   const phase=(s.phase*Math.pow(2,n))%1,pulse=pulseAtPhase(phase,width);
   const manual=clamp(Array.isArray(p.level)?p.level[n]:1,0,1,1);
   const cv=i.levelCV&&i.levelCV[n]!==undefined?i.levelCV[n]:i["levelCV"+(n+1)];
   const gain=cv===null||cv===undefined?manual:manual*clamp(finite(cv)/10,0,1,0);
   sum+=pulse*gain;s.outputs[n]=sum;
   if(outputPatched&&outputPatched[n])sum=0;
  }
  s.frequency=frequency;s.pulseWidth=width;
  const r=s.result;r.frequency=frequency;r.phase=s.phase;r.pulseWidth=width;
  return r;
 }
 return{createState,process,pulseAtPhase};
});
