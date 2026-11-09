(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfRampageDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 const GATE=2.5;
 function createChannelState(){return{value:0,stage:0,triggerHigh:false,signalHigh:false,cycleHigh:false,gateHigh:false,eoc:0,rising:0,falling:0,lastValue:0,initialized:false}}
 function createState(){return{a:createChannelState(),b:createChannelState(),previousA:0,previousB:0}}
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
  const sr=clamp(sampleRate,8000,384000,48000),dt=1/sr,s=state||createChannelState(),p=params||{};
  const signal=finite(input.signal),trigger=finite(input.trigger),riseCV=finite(input.riseCV),fallCV=finite(input.fallCV),expCV=finite(input.expCV),cycleCV=finite(input.cycleCV);
  const cycle=!!p.cycle !== (cycleCV>=GATE);
  const triggerHigh=trigger>=GATE,triggerEdge=triggerHigh&&!s.triggerHigh;s.triggerHigh=triggerHigh;
  const signalHigh=signal>=GATE,signalEdge=signalHigh&&!s.signalHigh;s.signalHigh=signalHigh;
  const external=!!p.external;
  const risingTime=timeSeconds(p.rise,riseCV,expCV,p.range);
  const fallingTime=timeSeconds(p.fall,fallCV,expCV,p.range);
  const triggered=triggerEdge||signalEdge||!!p.manualTrigger;
  if(triggered&&s.stage!==2){s.stage=1;s.value=0;s.eoc=0}
  let previous=s.value;
  if(external){
   const target=clamp(signal,-10,10);
   const tau=target>s.value?riseTime:fallingTime;
   const coeff=1-Math.exp(-dt/Math.max(.0001,tau));
   s.value+= (target-s.value)*coeff;
   s.stage=Math.abs(target-s.value)<.0001?0:(target>s.value?1:2);
  }else if(s.stage===1){
   const delta=dt/Math.max(.0001,risingTime);
   s.value=Math.min(10,s.value+delta*10);
   if(s.value>=10){s.value=10;s.stage=2}
  }else if(s.stage===2){
   const delta=dt/Math.max(.0001,fallingTime);
   s.value=Math.max(0,s.value-delta*10);
   if(s.value<=0){s.value=0;s.stage=cycle?1:0;if(cycle)s.eoc=1}
  }else if(cycle){
   s.stage=1;s.value=Math.min(10,s.value+dt/Math.max(.0001,risingTime)*10);
  }
  const delta=s.value-previous;
  s.rising=delta>1e-5?10:0;s.falling=delta< -1e-5?10:0;
  const eoc=s.eoc?10:0;s.eoc=0;
  s.lastValue=s.value;s.initialized=true;
  return{out:s.value,rising:s.rising,falling:s.falling,eoc,stage:s.stage,value:s.value,state:s};
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState();
  const a=channel({rise:p.riseA,fall:p.fallA,shape:p.shapeA,range:p.rangeA,cycle:p.cycleA,external:p.externalA}, {
   signal:i.signalA,trigger:i.triggerA,riseCV:i.riseCVA,fallCV:i.fallCVA,expCV:i.expCVA,cycleCV:i.cycleCVA
  },s.a,sampleRate);
  const b=channel({rise:p.riseB,fall:p.fallB,shape:p.shapeB,range:p.rangeB,cycle:p.cycleB,external:p.externalB}, {
   signal:i.signalB,trigger:i.triggerB,riseCV:i.riseCVB,fallCV:i.fallCVB,expCV:i.expCVB,cycleCV:i.cycleCVB
  },s.b,sampleRate);
  const balance=clamp(p.balance,0,1,.5),av=a.out*(1-balance),bv=b.out*balance;
  return{a,b,outputs:{outA:a.out,outB:b.out,risingA:a.rising,risingB:b.rising,fallingA:a.falling,fallingB:b.falling,eocA:a.eoc,eocB:b.eoc,compare:b.out>a.out?10:0,min:Math.min(av,bv),max:Math.max(av,bv)},state:s};
 }
 return Object.freeze({clamp,timeSeconds,shapeValue,createChannelState,createState,channel,process});
});
