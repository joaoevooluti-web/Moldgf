(function (root, factory) {
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.MoldgfChoppingKinkyDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function finite(v){return Number.isFinite(v)?v:0}
  function clamp(v,min,max,fallback=0){return Math.max(min,Math.min(max,Number.isFinite(v)?v:fallback))}
  function foldTriangle(x){const p=((x+1)%4+4)%4;return p<2?p-1:3-p}
  function foldA(input,gain){return 10*foldTriangle(clamp(finite(input)*Math.max(0,gain)/10,-40,40,0))}
  function foldB(input,gain){
    const x=finite(input)*Math.max(0,gain)/10;
    if(x>=0)return 10*foldTriangle(x*.9+.08);
    return 10*foldTriangle(x*1.1-.08);
  }
  function createState(){return{previousA:0,chopA:false,gateHigh:false,dcX:0,dcY:0}}
  function process(inputs,params,state,sampleRate){
    const s=state||createState(),sr=clamp(sampleRate,8000,384000,48000);
    const cvA=finite(inputs.cvA),cvB=inputs.cvB===null||inputs.cvB===undefined?cvA:finite(inputs.cvB);
    const gainA=Math.max(0,clamp(params.foldA,0,2,0)+clamp(params.cvA,-1,1,0)*cvA/10+finite(inputs.vcaA)/10);
    const gainB=Math.max(0,clamp(params.foldB,0,2,0)+clamp(params.cvB,-1,1,0)*cvB/10+finite(inputs.vcaB)/10);
    const inA=finite(inputs.a),inB=inputs.b===null||inputs.b===undefined?inA:finite(inputs.b);
    const outA=foldA(inA,gainA),outB=foldB(inB,gainB);
    const gateConnected=inputs.gate!==null&&inputs.gate!==undefined;
    if(gateConnected){
      const v=finite(inputs.gate),high=s.gateHigh?v>.1:v>=1;
      s.gateHigh=high;s.chopA=high;
    }else{
      if(s.previousA>0&&inA<0)s.chopA=false;
      else if(s.previousA<0&&inA>0)s.chopA=true;
    }
    s.previousA=inA;
    let chopp=s.chopA?outA:outB;
    if(params.blockDC){
      const alpha=Math.exp(-2*Math.PI*22.05/sr);
      const y=chopp-s.dcX+alpha*s.dcY;s.dcX=chopp;s.dcY=y;chopp=y;
    }
    return{outA,outB,chopp,chopA:s.chopA,gainA,gainB,state:s};
  }
  return Object.freeze({finite,clamp,foldTriangle,foldA,foldB,createState,process});
});
