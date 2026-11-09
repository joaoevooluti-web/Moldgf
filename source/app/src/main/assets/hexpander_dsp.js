(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfHexpanderDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function createState(){
  const sendPre=new Float32Array(3),sendPost=new Float32Array(3),direct=new Float32Array(6),result={sendPre,sendPost,direct,mainL:0,mainR:0,headL:0,headR:0,peak:0,pflActive:false};
  return{sendPre,sendPost,direct,result};
 }
 function process(params,inputs,state,host){
  const p=params||{},i=inputs||{},s=state||createState(),h=host||null;
  const pre=h&&h.preEq?h.preEq:null,post=h&&h.post?h.post:null,pan=h&&h.pan?h.pan:null;
  let pflL=0,pflR=0,pflActive=false;
  for(let n=0;n<6;n++){
   const level=!!(p.pfl&&p.pfl[n]);
   if(level&&pre){pflActive=true;const a=clamp(pan&&pan[n],-1,1,0),angle=(a+1)*Math.PI*.25,v=finite(pre[n]);pflL+=v*Math.cos(angle);pflR+=v*Math.sin(angle)}
   s.direct[n]=post?finite(post[n])*.2:0;
  }
  for(let send=0;send<3;send++){
   let preSum=0,postSum=0;
   for(let n=0;n<6;n++){
    const level=clamp(p.send&&p.send[send]&&p.send[send][n],0,1,0);
    preSum+=(pre?finite(pre[n]):0)*level;
    postSum+=(post?finite(post[n]):0)*level;
   }
   const master=clamp(p.sendMaster&&p.sendMaster[send],0,2,1);
   s.sendPre[send]=preSum*master;s.sendPost[send]=postSum*master;
  }
  let returnL=0,returnR=0;
  for(let n=0;n<3;n++){
   const l=i.returns&&i.returns[n]?i.returns[n][0]:i["return"+(n+1)+"L"];
   const r=i.returns&&i.returns[n]?i.returns[n][1]:i["return"+(n+1)+"R"];
   const left=finite(l),right=r===null||r===undefined?left:finite(r);
   const level=clamp(p.returnLevel&&p.returnLevel[n],0,2,1),line=!!(p.returnMode&&p.returnMode[n]);
   const gain=level*(line?5:1);
   returnL+=left*gain;returnR+=right*gain;
  }
  const masterL=h?finite(h.left):0,masterR=h?finite(h.right):0;
  const lineGain=h&&h.outputLevel?1:.2;
  const mainL=(masterL+returnL)*lineGain,mainR=(masterR+returnR)*lineGain;
  const monitor=clamp(p.monitorMix,0,1,0),headVolume=clamp(p.headphonesVolume,0,2,1);
  const monitorL=pflActive?pflL:masterL+returnL,monitorR=pflActive?pflR:masterR+returnR;
  const headL=((masterL+returnL)*(1-monitor)+monitorL*monitor)*headVolume;
  const headR=((masterR+returnR)*(1-monitor)+monitorR*monitor)*headVolume;
  const peak=Math.max(Math.abs(pflActive?pflL:masterL+returnL),Math.abs(pflActive?pFlRsafe(pflR):masterR+returnR));
  const out=s.result;out.mainL=mainL;out.mainR=mainR;out.headL=headL;out.headR=headR;out.peak=peak;out.pflActive=pflActive;
  return out;
 }
 function pFlRsafe(v){return v}
 return{createState,process};
});
