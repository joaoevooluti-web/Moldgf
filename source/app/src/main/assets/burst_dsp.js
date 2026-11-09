(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfBurstDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX = 32, PULSE = 0.001;
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function schmitt(value, high) { const v=finite(value); return high ? v>0.1 : v>=1; }
  function random(state) {
    let x = state.rng >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    state.rng = x >>> 0;
    return state.rng / 4294967296;
  }
  function timeWindow(tempo, timeParam, timeCV) {
    const mult = -clamp(Math.trunc(4 * finite(timeCV) / 10 + finite(timeParam)), -4, 4, 0);
    const divisions = mult + (mult > 0 ? 1 : mult < 0 ? -1 : 0);
    if (divisions > 0) return tempo * divisions;
    if (divisions < 0) return tempo / -divisions;
    return tempo;
  }
  function makeTimings(quantity, window, distribution) {
    const n = clamp(quantity, 1, MAX, 1) | 0;
    const d = clamp(distribution, -1, 1, 0);
    const power = 1 + Math.abs(d) * 2;
    const times = [];
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      times.push(window * (d >= 0 ? Math.pow(x, power) : Math.pow(x, 1 / power)));
    }
    return times;
  }
  function createState() {
    return { tempo:0.5,pingDuration:0.5,pingElapsed:0,clockRemaining:0.5,pingHigh:false,triggerHigh:false,buttonHigh:false,
      burstActive:false,burstTime:0,timings:[],triggersOccurred:0,triggersRequested:0,wasInhibited:false,
      burstPulse:0,eocPulse:0,tempoPulse:0,rng:0x5eed1234 };
  }
  function process(inputs, params, state, sampleTime) {
    const s=state||createState(),dt=clamp(sampleTime,1/192000,0.1,1/48000);
    s.pingElapsed+=dt;
    s.clockRemaining-=dt;
    const pingHigh=schmitt(inputs.ping,s.pingHigh),pingRising=!s.pingHigh&&pingHigh;
    s.pingHigh=pingHigh;
    if(pingRising){
      const duration=s.pingElapsed;
      const outlier=s.pingDuration&&(duration>s.pingDuration*2||duration<s.pingDuration*.5);
      if(outlier)s.pingDuration=0;
      else{s.pingDuration=duration;s.tempo=duration;s.clockRemaining=duration}
      s.pingElapsed=0;
    }
    if(s.clockRemaining<=0){s.clockRemaining+=s.tempo;s.tempoPulse=PULSE}
    const triggerHigh=schmitt(inputs.trigger,s.triggerHigh),triggerRising=!s.triggerHigh&&triggerHigh;
    const button=!!params.button,buttonRising=button&&!s.buttonHigh;
    s.triggerHigh=triggerHigh;s.buttonHigh=button;
    const start=triggerRising||buttonRising;
    const startBurst=()=>{
      const qcv=clamp(inputs.quantityCV,-5,10,0)*clamp(params.quantityCV,0,1,1)/5;
      const quantity=clamp(Math.round(params.quantity+Math.round(16*qcv)),1,MAX,4)|0;
      const window=timeWindow(s.tempo,params.time,inputs.time);
      const distribution=clamp(finite(params.distribution)+finite(inputs.distribution)/10,-1,1,0);
      const probability=clamp(finite(params.probability)+finite(inputs.probability)/10,0,1,0);
      s.wasInhibited=random(s)<probability;
      s.triggersRequested=s.wasInhibited?1:quantity;
      s.triggersOccurred=0;s.burstTime=0;s.timings=makeTimings(quantity,window,distribution);s.burstActive=true;
    };
    if(start)startBurst();
    let eoc=false;
    if(s.burstActive){
      s.burstTime+=dt;
      if(s.triggersOccurred<=s.triggersRequested&&s.burstTime>s.timings[s.triggersOccurred]){
        if(s.triggersOccurred<s.triggersRequested)s.burstPulse=PULSE;
        else{s.eocPulse=s.wasInhibited?0:PULSE;s.burstActive=false;eoc=true}
        s.triggersOccurred++;
      }
    }
    if(eoc&&params.cycle)startBurst();
    const outputs=[s.tempoPulse>0?10:0,s.eocPulse>0?10:0,s.burstPulse>0?10:0];
    s.tempoPulse=Math.max(0,s.tempoPulse-dt);
    s.eocPulse=Math.max(0,s.eocPulse-dt);
    s.burstPulse=Math.max(0,s.burstPulse-dt);
    return {outputs,tempo:s.tempo,active:s.burstActive,triggersOccurred:s.triggersOccurred,triggersRequested:s.triggersRequested,timings:s.timings.slice(),state:s};
  }
  return Object.freeze({MAX,PULSE,finite,clamp,schmitt,timeWindow,makeTimings,createState,process});
});
