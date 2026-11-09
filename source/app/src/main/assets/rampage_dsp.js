(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfRampageDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const GATE=2.5;
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function createChannelState(){return{value:0,phase:0,stage:0,triggerHigh:false,signalHigh:false,eoc:0,rising:0,falling:0,lastValue:0,initialized:false}}
 function createState(){return{a:createChannelState(),b:createChannelState()}}
 function timeSeconds(control,cv,exp,range){
  const knob=clamp(control,0,1,.25),mod=clamp(cv,-5,5,0);
  const normalized=clamp(knob+mod/10-(clamp(exp,0,5,0)/5)*.8,0,1);
  const base=.001*Math.pow(10000,normalized);
  const scale=[.01,1,20][Math.round(clamp(range,0,2,1))];
  return clamp(base*scale,.0001,120,.1);
 }
 function shapeValue(x,shape){
  x=clamp(x,0,1);shape=clamp(shape,-1,1,0);
  if(Math.abs(shape)<1e-4)return x;
  const curve=Math.pow(8,Math.abs(shape));
  return shape>0?Math.pow(x,1/curve):1-Math.pow(1-x,1/curve);
 }
 function channel(params,input,state,sampleRate){
  const sr=clamp(sampleRate,8000,384000,48000),dt=1/sr,s=state||createChannelState(),p=params||{},i=input||{};
  const signal=finite(i.signal),trigger=finite(i.trigger),riseCV=finite(i.riseCV),fallCV=finite(i.fallCV),expCV=finite(i.expCV),cycleCV=finite(i.cycleCV);
  const cycle=!!p.cycle !== (cycleCV>=GATE);
  const triggerHigh=trigger>=GATE,triggerEdge=triggerHigh&&!s.triggerHigh;s.triggerHigh=triggerHigh;
  const signalHigh=signal>=GATE,signalEdge=signalHigh&&!s.signalHigh;s.signalHigh=signalHigh;
  const external=!!p.external;
  const risingTime=timeSeconds(p.rise,riseCV,expCV,p.range);
  const fallingTime=timeSeconds(p.fall,fallCV,expCV,p.range);
  const triggered=triggerEdge||signalEdge||!!p.manualTrigger;
  if(triggered&&(s.stage===0||s.stage===2)){s.stage=1;s.phase=0;s.value=0;s.eoc=0}
  const previous=s.value;
  if(external){
   const target=clamp(signal,-10,10),delta=target-s.value,tau=delta>=0?risingTime:fallingTime;
   let coeff=1-Math.exp(-dt/Math.max(.0001,tau));
   const shape=clamp(p.shape,-1,1,0);
   if(shape>0)coeff=Math.pow(coeff,1/(1+4*shape));
   else if(shape<0)coeff=Math.pow(coeff,1+4*Math.abs(shape));
   s.value+=delta*coeff;
   s.stage=Math.abs(target-s.value)<.0001?0:(delta>0?1:2);
  }else if(s.stage===1){
   s.phase=Math.min(1,s.phase+dt/Math.max(.0001,risingTime));
   s.value=10*shapeValue(s.phase,p.shape);
   if(s.phase>=1){s.value=10;s.phase=0;s.stage=2}
  }else if(s.stage===2){
   s.phase=Math.min(1,s.phase+dt/Math.max(.0001,fallingTime));
   s.value=10*(1-shapeValue(s.phase,p.shape));
   if(s.phase>=1){s.value=0;s.phase=0;s.eoc=1;s.stage=cycle?1:0}
  }else if(cycle){
   s.stage=1;s.phase=Math.min(1,s.phase+dt/Math.max(.0001,risingTime));
   s.value=10*shapeValue(s.phase,p.shape);
   if(s.phase>=1){s.value=10;s.phase=0;s.stage=2}
  }
  const change=s.value-previous;
  s.rising=change>1e-5?10:0;s.falling=change< -1e-5?10:0;
  const eoc=s.eoc?10:0;s.eoc=0;
  s.lastValue=s.value;s.initialized=true;
  return{out:s.value,rising:s.rising,falling:s.falling,eoc,stage:s.stage,value:s.value,state:s};
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState();
  const a=channel({rise:p.riseA,fall:p.fallA,shape:p.shapeA,range:p.rangeA,cycle:p.cycleA,external:i.signalA!==null&&i.signalA!==undefined,manualTrigger:p.manualTriggerA},{
   signal:i.signalA,trigger:i.triggerA,riseCV:i.riseCVA,fallCV:i.fallCVA,expCV:i.expCVA,cycleCV:i.cycleCVA
  },s.a,sampleRate);
  const b=channel({rise:p.riseB,fall:p.fallB,shape:p.shapeB,range:p.rangeB,cycle:p.cycleB,external:i.signalB!==null&&i.signalB!==undefined,manualTrigger:p.manualTriggerB},{
   signal:i.signalB,trigger:i.triggerB,riseCV:i.riseCVB,fallCV:i.fallCVB,expCV:i.expCVB,cycleCV:i.cycleCVB
  },s.b,sampleRate);
  const balance=clamp(p.balance,0,1,.5),av=a.out*(1-balance),bv=b.out*balance;
  return{a,b,outputs:{outA:a.out,outB:b.out,risingA:a.rising,risingB:b.rising,fallingA:a.falling,fallingB:b.falling,eocA:a.eoc,eocB:b.eoc,compare:bv>av?10:0,min:Math.min(av,bv),max:Math.max(av,bv)},state:s};
 }
 return Object.freeze({clamp,timeSeconds,shapeValue,createChannelState,createState,channel,process});
});
