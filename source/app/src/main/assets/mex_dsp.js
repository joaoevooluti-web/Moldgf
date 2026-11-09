(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfMexDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const THRESHOLD=2.5;
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 function createState(){const result={out:0,step:0,mode:1,gateIn:0,muxGate:0};return{out:0,step:0,mode:1,gateIn:0,muxGate:0,result}}
 function process(params,inputs,state){
  const p=params||{},i=inputs||{},s=state||createState();
  const step=Math.round(clamp(i.step,0,7,0)),mode=Math.round(clamp(Array.isArray(p.mode)?p.mode[step]:p.mode,0,2,1));
  const gateIn=Number.isFinite(i.gateIn)?i.gateIn:0,muxGate=Number.isFinite(i.muxGate)?i.muxGate:0;
  let out=0;
  if(i.hostPresent){
   if(mode===0)out=gateIn>=THRESHOLD?10:0;
   else if(mode===2)out=muxGate>=THRESHOLD?10:0;
  }
  s.out=out;s.step=step;s.mode=mode;s.gateIn=gateIn;s.muxGate=muxGate;
  const r=s.result;r.out=out;r.step=step;r.mode=mode;r.gateIn=gateIn;r.muxGate=muxGate;
  return r;
 }
 return{THRESHOLD,createState,process};
});
