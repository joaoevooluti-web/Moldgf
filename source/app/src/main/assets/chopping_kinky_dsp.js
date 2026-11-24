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
  function createState(){
    const inputs={a:null,b:null,gate:null,cvA:null,vcaA:null,cvB:null,vcaB:null};
    const result={outA:0,outB:0,chopp:0,chopA:false,gainA:0,gainB:0,state:null};
    const state={previousA:0,chopA:false,gateHigh:false,dcX:0,dcY:0,inputs,result};
    result.state=state;
    return state;
  }
  function reset(state){
    if(!state||!state.inputs||!state.result)return false;
    state.previousA=0;state.chopA=false;state.gateHigh=false;state.dcX=0;state.dcY=0;
    const i=state.inputs;i.a=i.b=i.gate=i.cvA=i.vcaA=i.cvB=i.vcaB=null;
    const r=state.result;r.outA=0;r.outB=0;r.chopp=0;r.chopA=false;r.gainA=0;r.gainB=0;r.state=state;
    return state;
  }
  function processInto(inputs,params,state,sampleRate){
    const s=state||createState(),i=inputs||s.inputs,p=params||{},sr=clamp(sampleRate,8000,384000,48000);
    const cvA=finite(i.cvA),cvB=i.cvB===null||i.cvB===undefined?cvA:finite(i.cvB);
    const gainA=Math.max(0,clamp(p.foldA,0,2,0)+clamp(p.cvA,-1,1,0)*cvA/10+finite(i.vcaA)/10);
    const gainB=Math.max(0,clamp(p.foldB,0,2,0)+clamp(p.cvB,-1,1,0)*cvB/10+finite(i.vcaB)/10);
    const inA=finite(i.a),inB=i.b===null||i.b===undefined?inA:finite(i.b);
    const outA=foldA(inA,gainA),outB=foldB(inB,gainB);
    const gateConnected=i.gate!==null&&i.gate!==undefined;
    if(gateConnected){
      const v=finite(i.gate),high=s.gateHigh?v>.1:v>=1;
      s.gateHigh=high;s.chopA=high;
    }else{
      if(s.previousA>0&&inA<0)s.chopA=false;
      else if(s.previousA<0&&inA>0)s.chopA=true;
    }
    s.previousA=inA;
    let chopp=s.chopA?outA:outB;
    if(p.blockDC){
      const alpha=Math.exp(-2*Math.PI*22.05/sr);
      const y=chopp-s.dcX+alpha*s.dcY;s.dcX=chopp;s.dcY=y;chopp=y;
    }
    const r=s.result;r.outA=outA;r.outB=outB;r.chopp=chopp;r.chopA=s.chopA;r.gainA=gainA;r.gainB=gainB;r.state=s;
    return r;
  }
  function process(inputs,params,state,sampleRate){
    const s=state||createState();
    return processInto(inputs||s.inputs,params,s,sampleRate);
  }
  return Object.freeze({finite,clamp,foldTriangle,foldA,foldB,createState,reset,processInto,process});
});
