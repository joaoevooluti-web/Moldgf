(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfSamplingModulatorDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const RESET=0, OFF=1, ON=2, PULSE=.001;
  function finite(value){return Number.isFinite(value)?value:0}
  function clamp(value,min,max,fallback=0){return Math.max(min,Math.min(max,Number.isFinite(value)?value:fallback))}
  function schmitt(value,high){const v=finite(value);return high?v>.1:v>=1}
  function createState(){return{step:0,phase:0,halfPhase:false,syncHigh:false,holdHigh:false,clockHigh:false,heldValue:0,triggerPulse:0,triggerHigh:false}}
  function process(inputs,params,state,sampleRate,sampleTime){
    const s=state||createState(),sr=clamp(sampleRate,8000,384000,48000),dt=clamp(sampleTime,1/sr,.1,1/sr);
    const modes=params.steps.map(v=>clamp(v,0,2,2)|0);
    let effective=8,active=0;
    for(let i=0;i<8;i++){if(modes[i]===RESET){effective=i;break}if(modes[i]===ON)active++}
    const internal=params.internalClock===1;
    const syncHigh=schmitt(inputs.sync,s.syncHigh),syncRising=!s.syncHigh&&syncHigh;
    s.syncHigh=syncHigh;
    const holdHigh=schmitt(inputs.hold,s.holdHigh),holdRising=!s.holdHigh&&holdHigh;
    s.holdHigh=holdHigh;
    if(holdRising)s.heldValue=finite(inputs.raw);
    const pitch=16*clamp(params.rate,0,1,0)+clamp(params.fine,0,1,0)+finite(inputs.voct);
    const frequency=Math.pow(2,pitch);
    let advance=!internal&&syncRising;
    if(internal&&syncRising){advance=true;s.phase=0;s.halfPhase=false}
    const oldPhase=s.phase,delta=clamp(dt*frequency,1e-6,.5,.5);
    s.phase+=delta;
    let wrapped=false;
    if(s.phase>=1){s.phase-=1;wrapped=true;if(internal)advance=true;s.halfPhase=false}
    else if(s.phase>=.5)s.halfPhase=true;
    if(advance){
      s.step=(s.step+1)%Math.max(1,effective);
      if(modes[s.step]===ON){
        s.triggerPulse=PULSE;
        if(!s.holdHigh)s.heldValue=finite(inputs.raw);
      }
    }
    const pulse=s.triggerPulse>0?10:0;
    s.triggerPulse=Math.max(0,s.triggerPulse-dt);
    const clockSquare=s.phase<.5?2:0;
    const removeDC=params.removeDC===1;
    const clock=5*(clockSquare-(removeDC?1:0));
    let trigger;
    if(internal){
      const on=modes[s.step]===ON;
      let square=(s.phase<.5&&on)?2:0;
      if(removeDC){square-=1;if(effective>0)square+=(effective-active)/effective}
      trigger=5*square;
    }else trigger=pulse;
    return{clock,trigger,sampled:s.heldValue,step:s.step,frequency,phase:s.phase,activeSteps:active,effectiveSteps:effective,state:s};
  }
  return Object.freeze({RESET,OFF,ON,PULSE,finite,clamp,schmitt,createState,process});
});
