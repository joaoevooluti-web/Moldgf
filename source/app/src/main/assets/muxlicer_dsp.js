(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfMuxlicerDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const GATE=2.5;
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function createState(){return{step:0,playing:false,oneShot:false,clockHigh:false,resetHigh:false,clockPhase:0,clockOutPhase:0,stepPhase:0,stepDuration:.5,timeSinceClock:0,dividerCount:0,eocPulse:0,clockOutPulse:0,gates:new Float32Array(8),stepOutputs:new Float32Array(8),commonOutput:0,lastClockInterval:.5,activeGateMode:0}}
 function cvRangeValue(step,range){
  const v=clamp(step,0,1,0),mode=Math.round(clamp(range,0,2,1));
  return mode===0?v*5:mode===2?(v*2-1)*5:v*10;
 }
 function speedRatio(value){return Math.pow(2,Math.round((clamp(value,0,1,.5)-.5)*8))}
 function gateIsHigh(mode,phase){
  if(mode<=0)return false;
  if(mode===1)return true;
  if(mode===2)return phase<.5;
  const pulses=mode-1,position=(phase*pulses)%1;
  return position<.5;
 }
 function advanceStep(state,address){
  if(address>.02){state.step=Math.min(7,Math.floor(clamp(address,0,1,0)*8));return false}
  if(state.step>=7){
   state.eocPulse=1;
   if(state.oneShot){state.playing=false;state.oneShot=false;state.step=7;return true}
   state.step=0;return true;
  }
  state.step++;return false;
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(),sr=clamp(sampleRate,8000,192000,48000),dt=1/sr;
  s.eocPulse=0;s.clockOutPulse=0;
  const reset=finite(i.reset)>=GATE,resetEdge=reset&&!s.resetHigh;s.resetHigh=reset;
  if(resetEdge){if(s.playing){s.step=0;s.stepPhase=0;s.oneShot=false}else{s.step=0;s.stepPhase=0;s.playing=true;s.oneShot=true}}
  const clockConnected=i.clockIn!==null&&i.clockIn!==undefined,clockHigh=finite(i.clockIn)>=GATE,clockFall=clockConnected&&s.clockHigh&&!clockHigh;
  s.clockHigh=clockHigh;
  const ratio=speedRatio(p.speed),bpm=clamp(p.bpm,30,300,120);
  const internalHz=bpm/60*ratio;
  let tickCount=0;
  s.timeSinceClock+=dt;
  if(clockConnected){
   if(clockFall&&s.playing){
    const period=s.timeSinceClock>dt?s.timeSinceClock:s.lastClockInterval;s.timeSinceClock=0;s.lastClockInterval=period;
    if(ratio>=1){tickCount=Math.max(1,Math.round(ratio));s.stepDuration=period/ratio}
    else{const divisor=Math.max(1,Math.round(1/ratio));s.dividerCount++;if(s.dividerCount>=divisor){tickCount=1;s.dividerCount=0;s.stepDuration=period*divisor}}
    for(let n=0;n<tickCount;n++){advanceStep(s,clamp(p.address+finite(i.addressCV)/10,0,1,0));s.stepPhase=0}
   }
  }else{
   s.stepDuration=1/Math.max(.01,internalHz);
   if(s.playing){
    s.clockPhase+=dt*internalHz;
    while(s.clockPhase>=1){s.clockPhase-=1;advanceStep(s,clamp(p.address+finite(i.addressCV)/10,0,1,0));s.stepPhase=0;tickCount++}
   }
  }
  if(s.playing)s.stepPhase=Math.min(1,s.stepPhase+dt/Math.max(dt,s.stepDuration));else s.stepPhase=0;
  const address=clamp(p.address+finite(i.addressCV)/10,0,1,0);
  const modeCV=i.gateModeCV===null||i.gateModeCV===undefined?null:clamp(i.gateModeCV,0,10,0);
  const gateModeValue=clamp(p.gateMode,0,1,.5)*(modeCV===null?1:modeCV/10);
  const gateMode=Math.round(gateModeValue*9);s.activeGateMode=gateMode;
  let allGates=0;
  for(let n=0;n<8;n++){const active=s.playing&&s.step===n&&gateIsHigh(gateMode,s.stepPhase);s.gates[n]=active?10:0;if(active)allGates=10}
  const allIn=i.allIn===null||i.allIn===undefined?null:finite(i.allIn);
  const commonIn=i.commonIn===null||i.commonIn===undefined?null:finite(i.commonIn);
  const switchMode=Math.round(clamp(p.switchMode,0,1,0));
  let commonOutput=0;
  if(switchMode===0){
   const stepInput=i["stepIn"+(s.step+1)];
   const raw=stepInput!==null&&stepInput!==undefined?finite(stepInput):allIn!==null?allIn:cvRangeValue(p["level"+(s.step+1)],p.cvRange);
   commonOutput=clamp(raw*clamp(p["level"+(s.step+1)],0,1,1),-10,10,0);
   for(let n=0;n<8;n++)s.stepOutputs[n]=0;
  }else{
   commonOutput=0;
   for(let n=0;n<8;n++){
    let raw=allIn!==null?allIn:0;
    if(commonIn!==null&&s.step===n)raw=commonIn;
    s.stepOutputs[n]=clamp(raw*clamp(p["level"+(n+1)],0,1,1),-10,10,0);
   }
  }
  s.commonOutput=commonOutput;
  const clockOutRatio=Math.pow(2,Math.round((clamp(p.clockOutDivMult,0,1,.5)-.5)*8));
  if((s.playing||p.clockAlways)&&s.stepDuration>0){
   s.clockOutPhase+=dt/s.stepDuration*clockOutRatio;
   if(s.clockOutPhase>=1){s.clockOutPhase-=Math.floor(s.clockOutPhase);s.clockOutPulse=1}
  }else{s.clockOutPhase=0}
  const result={commonOut:commonOutput,commonOutCV:commonOutput,clockOut:s.clockOutPulse?10:0,allGates,eoc:s.eocPulse?10:0,
   step:s.step+1,playing:s.playing,oneShot:s.oneShot,stepPhase:s.stepPhase,gateMode,clockHz:s.stepDuration>0?1/s.stepDuration:0,
   state:s};
  for(let n=0;n<8;n++){result["gate"+(n+1)]=s.gates[n];result["stepOut"+(n+1)]=s.stepOutputs[n];result["stepOutCV"+(n+1)]=s.stepOutputs[n]}
  return result;
 }
 return Object.freeze({clamp,cvRangeValue,speedRatio,gateIsHigh,createState,process});
});
