(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfBanditDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const BAND_INFO=[{name:"LOW",type:"lowpass",frequency:300},{name:"MID LOW",type:"bandpass",frequency:700},{name:"MID HIGH",type:"bandpass",frequency:1500},{name:"HIGH",type:"highpass",frequency:5000}];
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function coefficients(type,frequency,sr){
  const f=clamp(frequency,10,sr*.45,1000),w=2*Math.PI*f/sr,cs=Math.cos(w),sn=Math.sin(w),q=type==="bandpass"?1.15:.707,alpha=sn/(2*q);
  let b0,b1,b2;
  if(type==="lowpass"){b0=(1-cs)*.5;b1=1-cs;b2=(1-cs)*.5}
  else if(type==="highpass"){b0=(1+cs)*.5;b1=-(1+cs);b2=(1+cs)*.5}
  else{b0=alpha;b1=0;b2=-alpha}
  const a0=1+alpha,a1=-2*cs,a2=1-alpha;
  return{b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0};
 }
 function makeFilter(info,sr){return{z1:0,z2:0,coeff:coefficients(info.type,info.frequency,sr)}}
 function createState(sampleRate){
  const sr=clamp(sampleRate,8000,192000,48000),filters=BAND_INFO.map(info=>makeFilter(info,sr)),bands=new Float32Array(4),lastInputs=new Float32Array(4),result={bands,mixOut:0,peak:0,clipping:false};
  return{sampleRate:sr,filters,bands,lastInputs,result};
 }
 function filterSample(f,x){
  const c=f.coeff,y=c.b0*x+f.z1;
  f.z1=c.b1*x-c.a1*y+f.z2;f.z2=c.b2*x-c.a2*y;
  return y;
 }
 function process(params,inputs,state,sampleRate,outputPatched){
  const p=params||{},i=inputs||{},s=state||createState(sampleRate),sr=clamp(sampleRate,8000,192000,s.sampleRate);
  if(s.sampleRate!==sr){const fresh=createState(sr);s.sampleRate=sr;s.filters=fresh.filters;s.bands=fresh.bands;s.lastInputs=fresh.lastInputs;s.result=fresh.result}
  const allIn=i.allIn,allCV=i.allCV;
  let mix=0;
  for(let n=0;n<4;n++){
   const individual=i.bandIn&&i.bandIn[n]!==undefined?i.bandIn[n]:i["bandIn"+(n+1)];
   const input=individual!==null&&individual!==undefined?finite(individual):allIn===null||allIn===undefined?0:finite(allIn);
   s.lastInputs[n]=input;
   const band=filterSample(s.filters[n],input);
   const level=clamp(p["level"+(n+1)],0,2,1);
   const channelCV=i.bandCV&&i.bandCV[n]!==undefined?i.bandCV[n]:i["bandCV"+(n+1)];
   const cvConnected=(allCV!==null&&allCV!==undefined)||(channelCV!==null&&channelCV!==undefined);
   const cv=finite(allCV)+finite(channelCV);
   const gain=cvConnected?level*clamp(cv/5,0,2,0):level;
   const out=band*gain;s.bands[n]=out;
   if(!(outputPatched&&outputPatched[n]))mix+=out;
   const ret=i.returns&&i.returns[n]!==undefined?i.returns[n]:i["return"+(n+1)];
   if(ret!==null&&ret!==undefined)mix+=finite(ret);
  }
  const limited=Math.tanh(mix),r=s.result;
  r.mixOut=limited;r.peak=Math.abs(limited);r.clipping=Math.abs(mix)>1;
  return r;
 }
 return{BAND_INFO,coefficients,createState,process};
});
