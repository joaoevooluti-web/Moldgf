(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfKickallDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const TAU=Math.PI*2,GATE=3.5;
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function createState(){return{phase:0,volumeEnvelope:0,pitchEnvelope:0,triggerHigh:false,frequency:0,output:0,triggerCount:0,manualTrigger:0}}
 function envelopeTime(value,min,max){return min*Math.pow(max/min,clamp(value,0,1,.5))}
 function squareFromSine(phase,frequency,sampleRate){
  let sum=0,norm=0;
  for(let h=1;h<=15;h+=2){
   if(h*frequency>=sampleRate*.45)break;
   const sign=((h-1)/2)%2===0?1:-1;
   sum+=Math.sin(phase*h)/h;norm+=sign/h;
  }
  return norm>0?clamp(sum/norm,-1,1,0):Math.sign(Math.sin(phase));
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(),sr=clamp(sampleRate,8000,192000,48000),dt=1/sr;
  const trigger=finite(i.trigger),high=trigger>=GATE,edge=high&&!s.triggerHigh;s.triggerHigh=high;
  const triggered=edge||!!p.manualTrigger;
  if(triggered){s.volumeEnvelope=1;s.pitchEnvelope=1;s.triggerCount++}
  const tuneCV=clamp(i.tune,-5,5,0),baseTune=clamp(p.tune,0,1,.5);
  const baseFrequency=27.5*Math.pow(123.47/27.5,baseTune)*Math.pow(2,tuneCV);
  const pitchTime=envelopeTime(p.time,.008,3.5),volumeTime=envelopeTime(clamp(p.decay+finite(i.decay)/10,0,1,.5),.025,6);
  const pitchSemitones=clamp(p.bend,0,1,.5)*60*s.pitchEnvelope;
  const frequency=clamp(baseFrequency*Math.pow(2,pitchSemitones/12),18,Math.min(12000,sr*.4),55);
  s.phase=(s.phase+TAU*frequency*dt)%TAU;
  const shape=clamp(p.shape+finite(i.shape)/10,0,1);
  const sine=Math.sin(s.phase),square=squareFromSine(s.phase,frequency,sr);
  const wave=sine+(square-sine)*shape;
  const volumeCV=i.volume===null||i.volume===undefined?10:clamp(i.volume,0,10,0);
  const generalGain=volumeCV/10;
  const output=clamp(wave*s.volumeEnvelope*generalGain*5,-5,5,0);
  s.volumeEnvelope*=Math.exp(-dt/volumeTime);
  s.pitchEnvelope*=Math.exp(-dt/pitchTime);
  if(s.volumeEnvelope<1e-6)s.volumeEnvelope=0;
  if(s.pitchEnvelope<1e-6)s.pitchEnvelope=0;
  s.frequency=frequency;s.output=output;
  return{out:output,frequency,baseFrequency,pitchEnvelope:s.pitchEnvelope,volumeEnvelope:s.volumeEnvelope,shape,volume:generalGain,triggered,triggerCount:s.triggerCount,state:s};
 }
 return Object.freeze({clamp,envelopeTime,createState,squareFromSine,process});
});
