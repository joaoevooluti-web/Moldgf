(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfPonyVCFDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function createState(sampleRate){
  return{sampleRate:clamp(sampleRate,8000,192000,48000),stages:new Float64Array(4),lastOutput:0,g:0,lastCutoff:-1,result:{output:0,mix:0,peak:0,clipping:false,cutoff:1000,resonance:0,volume:1}};
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(sampleRate),sr=clamp(sampleRate,8000,192000,s.sampleRate);
  if(s.sampleRate!==sr){const f=createState(sr);s.sampleRate=sr;s.stages=f.stages;s.lastOutput=0;s.g=0;s.lastCutoff=-1;s.result=f.result}
  const in1=finite(i.in1),in2=finite(i.in2),in3=i.in3===null||i.in3===undefined?s.lastOutput:finite(i.in3);
  const level=p.inputLevel||[1,1,1],mix=in1*clamp(level[0],0,1,1)+in2*clamp(level[1],0,1,1)+in3*clamp(level[2],0,1,1);
  const peak=Math.abs(mix),cv1=i.cv1===null||i.cv1===undefined?0:finite(i.cv1),cv2=i.cv2===null||i.cv2===undefined?0:finite(i.cv2);
  const cv1Att=clamp(p.cv1Att,0,1,0),base=20*Math.pow(2,clamp(p.cutoff,0,1,.6)*10);
  const cutoff=clamp(base*Math.pow(2,(cv1/10)*cv1Att+cv2/10),10,sr*.45,1000);
  const resonance=clamp(p.resonance+(i.resCV===null||i.resCV===undefined?0:finite(i.resCV)/10),0,1,0);
  const g=cutoff===s.lastCutoff?s.g:Math.tan(Math.PI*cutoff/sr)/(1+Math.tan(Math.PI*cutoff/sr));
  s.g=g;s.lastCutoff=cutoff;
  const feedback=resonance*3.85,input=Math.tanh((mix-s.stages[3]*feedback)*.8);
  let x=input;
  for(let n=0;n<4;n++){s.stages[n]+=g*(x-s.stages[n]);x=s.stages[n]}
  const filterOut=x*(1+resonance*.35);
  const volumeCV=i.volumeCV===null||i.volumeCV===undefined?null:clamp(finite(i.volumeCV)/10,0,1);
  const cv1Mode=Math.round(clamp(p.cv1Mode,0,1,0));
  const normalVolume=volumeCV===null?(cv1Mode===1?clamp(cv1/10,0,1):1):volumeCV;
  const volume=clamp(p.volume,0,1,1)*normalVolume;
  const output=filterOut*volume;s.lastOutput=output;
  const r=s.result;r.output=output;r.mix=mix;r.peak=peak;r.clipping=peak>1;r.cutoff=cutoff;r.resonance=resonance;r.volume=volume;
  return r;
 }
 return{createState,process};
});
