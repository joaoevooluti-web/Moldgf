(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfSpringReverbDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 const COMB_SECONDS=[.0297,.0331,.0379,.0413];
 const ALLPASS_SECONDS=[.0051,.0017,.00063];
 const COMB_FEEDBACK=[.79,.775,.755,.735],COMB_DAMP=[.19,.16,.13,.11],ALLPASS_GAIN=[.68,.61,.54];
 function buffers(sr){return{
  comb:COMB_SECONDS.map(t=>new Float32Array(Math.max(8,Math.round(t*sr)))),
  combIndex:[0,0,0,0],combDamp:[0,0,0,0],
  allpass:ALLPASS_SECONDS.map(t=>new Float32Array(Math.max(4,Math.round(t*sr)))),
  allpassIndex:[0,0,0],hpfIn:0,hpfOut:0,peakIn:0,peakWet:0,sampleRate:sr
 }}
 function createState(sampleRate){const sr=clamp(sampleRate,8000,192000,48000);return buffers(sr)}
 function cvGain(slider,cv){
  const level=clamp(slider,0,1,1),control=cv===null||cv===undefined?10:clamp(cv,0,10,0);
  return level*control/10;
 }
 function meterLevel(value){return clamp(Math.abs(finite(value))/5,0,2,0)}
 function meterColor(level){return level>=1.25?"red":level>=.8?"orange":level>=.08?"green":"off"}
 function highPass(input,cutoff,state,sr){
  if(cutoff<=20.01){state.hpfIn=input;state.hpfOut=input;return input}
  const rc=1/(Math.PI*2*cutoff),dt=1/sr,alpha=rc/(rc+dt);
  const out=alpha*(state.hpfOut+input-state.hpfIn);
  state.hpfIn=input;state.hpfOut=Number.isFinite(out)?out:0;return state.hpfOut;
 }
 function tank(input,state,sr){
  const driven=Math.tanh(clamp(input,-20,20,0)*.45);
  let sum=0;
  for(let i=0;i<4;i++){
   const line=state.comb[i],index=state.combIndex[i],delayed=line[index];
   state.combDamp[i]+=(delayed-state.combDamp[i] )*COMB_DAMP[i];
   line[index]=clamp(driven*.22+state.combDamp[i]*COMB_FEEDBACK[i],-1.5,1.5,0);
   state.combIndex[i]=(index+1)%line.length;sum+=delayed;
  }
  let wet=sum*.42;
  for(let i=0;i<3;i++){
   const line=state.allpass[i],index=state.allpassIndex[i],delayed=line[index],g=ALLPASS_GAIN[i];
   const output=delayed-g*wet;
   line[index]=clamp(wet+g*output,-1.5,1.5,0);
   state.allpassIndex[i]=(index+1)%line.length;wet=output;
  }
  return Math.tanh(wet*1.55)*5;
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},sr=clamp(sampleRate,8000,192000,48000);
  const s=state&&state.sampleRate===sr?state:createState(sr);
  const in1=finite(i.in1),in2=finite(i.in2);
  const gain1=cvGain(p.level1,i.cv1),gain2=cvGain(p.level2,i.cv2);
  const tankInput=in1*gain1+in2*gain2;
  const cutoff=clamp(p.hpf,0,1,0)<=.001?20:20+Math.pow(clamp(p.hpf,0,1,0),2)*1180;
  const filtered=highPass(tankInput,cutoff,s,sr);
  const wet=tank(filtered,s,sr);
  const mix=clamp(clamp(p.mix,0,1,.5)+finite(i.mixCV)/10,0,1);
  const dry=in1;
  const mixed=clamp(dry*(1-mix)+wet*mix,-10,10,0);
  const inputLevel=meterLevel(tankInput),wetLevel=meterLevel(wet);
  const attack=1-Math.exp(-1/(sr*.008)),release=1-Math.exp(-1/(sr*.28));
  s.peakIn+=(inputLevel-s.peakIn)*(inputLevel>s.peakIn?attack:release);
  s.peakWet+=(wetLevel-s.peakWet)*(wetLevel>s.peakWet?attack:release);
  const output={mix:mixed,wet, dry,tankInput,filtered,mixAmount:mix,cutoff,inputLevel,wetLevel,
   inputMeter:s.peakIn,wetMeter:s.peakWet,inputMeterColor:meterColor(s.peakIn),wetMeterColor:meterColor(s.peakWet),
   saturated:inputLevel>=1.25,state:s};
  return output;
 }
 return Object.freeze({clamp,cvGain,meterLevel,meterColor,createState,highPass,tank,process});
});
