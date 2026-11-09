(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfIroiDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 const RATIOS=[1,1.5,2.32],REV_DELAYS=[1493,1601,1867,1999],AP_DELAYS=[113,337];
 function rngNext(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x|0;return(x>>>0)/4294967296}
 function channel(sr){
  return{
   filter:{ic1:0,ic2:0,comb:new Float32Array(4096),combPos:0,lastCutoff:-1,lastRes:-1,lastMode:-1,g:0,k:1,a1:1},
   resonator:Array.from({length:3},()=>({buf:new Float32Array(4096),pos:0})),echoLP:0,
   echoBuf:new Float32Array(Math.ceil(sr*6)+8),
   reverb:REV_DELAYS.map((d)=>({buf:new Float32Array(4096),pos:0,base:d*sr/48000})),
   allpass:AP_DELAYS.map((d)=>({buf:new Float32Array(1024),pos:0,base:d*sr/48000})),
   reverbLP:0
  };
 }
 function createState(sampleRate){
  const sr=clamp(sampleRate,8000,192000,48000),result={left:0,right:0,peak:0,clipping:false,mod:0};
  return{sampleRate:sr,channels:[channel(sr),channel(sr)],echoPos:0,modPhase:0,modHold:0,modChaos:0,modEnvelope:0,randomValue:0,rng:0x49524f49,syncHigh:false,randomHigh:false,syncCounter:0,syncPeriodSamples:0,result};
 }
 function ringRead(buf,pos,delay){const n=buf.length,d=Math.max(1,Math.min(n-2,delay|0));return buf[(pos-d+n)%n]}
 function filterVca(ch,x,cutoff,resonance,mode,level,sr,noise){
  const f=ch.filter;
  if(resonance>.75)x+=noise*(resonance-.75)*.12;
  if(mode===3){
   const delay=clamp(Math.round(sr/Math.max(20,cutoff)),4,4094),d=ringRead(f.comb,f.combPos,delay);
   f.comb[f.combPos]=x+d*resonance*.92;f.combPos=(f.combPos+1)&4095;
   return(x-d*.72)*level;
  }
  if(Math.abs(f.lastCutoff-cutoff)>.5||Math.abs(f.lastRes-resonance)>.001||f.lastMode!==mode){
   const g=Math.tan(Math.PI*clamp(cutoff,10,sr*.45,1000)/sr),k=2-1.92*resonance;
   f.g=g;f.k=k;f.a1=1/(1+g*(g+k));f.lastCutoff=cutoff;f.lastRes=resonance;f.lastMode=mode;
  }
  const v1=(f.ic1+f.g*(x-f.ic2))*f.a1,v2=f.ic2+f.g*v1;
  f.ic1=2*v1-f.ic1;f.ic2=2*v2-f.ic2;
  const low=v2,band=v1,high=x-f.k*v1-v2;
  return(mode===1?band:mode===2?high:low)*level;
 }
 function resonator(ch,x,frequency,feedback,sr,dissonance){
  let sum=0;
  for(let n=0;n<3;n++){
   const ratio=RATIOS[n]*(n===0?1:n===1?1+dissonance*.3:1-dissonance*.15),c=ch.resonator[n],delay=clamp(Math.round(sr/(frequency*ratio)),4,4094),d=ringRead(c.buf,c.pos,delay);
   c.buf[c.pos]=x+d*feedback;c.pos=(c.pos+1)&4095;sum+=d;
  }
  return sum/3;
 }
 function ambience(ch,x,space,decay){
  let sum=0;
  for(let n=0;n<4;n++){
   const c=ch.reverb[n],delay=clamp(Math.round(c.base*(.65+space*1.25)),4,c.buf.length-2),d=ringRead(c.buf,c.pos,delay);
   c.buf[c.pos]=x+d*(.68+decay*.29);c.pos=(c.pos+1)%c.buf.length;sum+=d;
  }
  let y=sum*.25;
  for(let n=0;n<2;n++){
   const a=ch.allpass[n],delay=clamp(Math.round(a.base*(.7+space)),4,a.buf.length-2),d=ringRead(a.buf,a.pos,delay),out=d-y*.5;
   a.buf[a.pos]=y+d*.5;a.pos=(a.pos+1)%a.buf.length;y=out;
  }
  ch.reverbLP+=(y-ch.reverbLP)*(.02+space*.2);
  return ch.reverbLP;
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(sampleRate),sr=clamp(sampleRate,8000,192000,s.sampleRate);
  if(s.sampleRate!==sr){const fresh=createState(sr);s.sampleRate=sr;s.channels=fresh.channels;s.echoPos=0;s.syncCounter=0;s.syncPeriodSamples=0;s.modPhase=0;s.modHold=0;s.modChaos=0;s.modEnvelope=0;s.result=fresh.result;s.syncHigh=false;s.randomHigh=false}
  const left=finite(i.left),right=i.right===null||i.right===undefined?left:finite(i.right);
  const sync=finite(i.sync)>=1,random=finite(i.random)>=1;
  if(sync&&!s.syncHigh){if(s.syncCounter>0)s.syncPeriodSamples=s.syncCounter;s.syncCounter=0;s.modPhase=0}
  s.syncHigh=sync;s.syncCounter++;
  if(random&&!s.randomHigh)s.randomValue=rngNext(s)*2-1;
  s.randomHigh=random;
  const modFreq=clamp(p.modFreq,.01,80,.2);s.modPhase+=modFreq/sr;
  if(s.modPhase>=1){s.modPhase-=Math.floor(s.modPhase);s.modHold=rngNext(s)*2-1}
  const inputEnv=(Math.abs(left)+Math.abs(right))*.5;
  s.modEnvelope+=(inputEnv-s.modEnvelope)*.002;
  s.modChaos=clamp(s.modChaos+(rngNext(s)-.5)*.04,-1,1);
  const wave=Math.round(clamp(p.modWave,0,6,1));
  let lfo=0;
  if(wave===0)lfo=s.modChaos;
  else if(wave===1)lfo=Math.sin(s.modPhase*Math.PI*2);
  else if(wave===2)lfo=s.modPhase*2-1;
  else if(wave===3)lfo=1-s.modPhase*2;
  else if(wave===4)lfo=s.modPhase<.5?1:-1;
  else if(wave===5)lfo=s.modHold;
  else lfo=clamp(s.modEnvelope*2-1,-1,1);
  const target=p.mapMode?Math.round(clamp(p.modTarget,0,4,0)):0,source=Math.round(clamp(p.modSource,0,2,0));
  const cvForTarget=target===1?i.filterCutoffCV:target===2?i.resonatorTuneCV:target===3?i.echoDensityCV:target===4?i.ambienceSpaceCV:null;
  const modSource=source===0?lfo:source===1?clamp(finite(cvForTarget)/10,-1,1):s.randomValue;
  const mod=modSource*clamp(p.modLevel,0,1,0);
  const cvCut=i.filterCutoffCV===null||i.filterCutoffCV===undefined?0:finite(i.filterCutoffCV)/10*clamp(p.filterCutoffAtt,0,1,0);
  const cvTune=i.resonatorTuneCV===null||i.resonatorTuneCV===undefined?0:finite(i.resonatorTuneCV)/10*clamp(p.resonatorTuneAtt,0,1,0);
  const cvEcho=i.echoDensityCV===null||i.echoDensityCV===undefined?0:finite(i.echoDensityCV)/10*clamp(p.echoDensityAtt,0,1,0);
  const cvSpace=i.ambienceSpaceCV===null||i.ambienceSpaceCV===undefined?0:finite(i.ambienceSpaceCV)/10*clamp(p.ambienceSpaceAtt,0,1,0);
  const cutoffNorm=clamp(p.cutoff+cvCut+(target===1?mod*.25:0),0,1,.7);
  const cutoff=20*Math.pow(2,cutoffNorm*10);
  const resTune=clamp(p.resTune+cvTune+(target===2?mod*.25:0),0,1,.5),resDissonance=clamp(p.resDissonance,0,1,0);
  const resFreq=60*Math.pow(2,resTune*6);
  const echoDensity=clamp(p.echoDensity+cvEcho+(target===3?mod*.25:0),0,1,.25);
  const space=clamp(p.space+cvSpace+(target===4?mod*.25:0),0,1,.35);
  const resonance=clamp(p.filterRes,0,1,.2),resFeedback=clamp(p.resFeedback,0,.99,.3);
  const vcaCV=i.vcaCV===null||i.vcaCV===undefined?null:clamp(finite(i.vcaCV)/5,0,1);
  const vca=clamp(p.vcaLevel,0,1,1)*(vcaCV===null?1:vcaCV);
  const resMix=clamp(p.resMix,0,1,0)*(i.resMixCV===null||i.resMixCV===undefined?1:clamp(finite(i.resMixCV)/5,0,1));
  const echoMix=clamp(p.echoMix,0,1,0)*(i.echoMixCV===null||i.echoMixCV===undefined?1:clamp(finite(i.echoMixCV)/5,0,1));
  const ambienceMix=clamp(p.ambienceMix,0,1,0)*(i.ambienceMixCV===null||i.ambienceMixCV===undefined?1:clamp(finite(i.ambienceMixCV)/5,0,1));
  const filterMode=Math.round(clamp(p.filterMode,0,3,0)),position=Math.round(clamp(p.filterPosition,0,3,0));
  let xL=left,xR=right;
  if(position===0){xL=filterVca(s.channels[0],xL,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1);xR=filterVca(s.channels[1],xR,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1)}
  const resL=resonator(s.channels[0],xL,resFreq,resFeedback,sr,resDissonance),resR=resonator(s.channels[1],xR,resFreq,resFeedback,sr,resDissonance);
  xL=xL*(1-resMix)+resL*resMix;xR=xR*(1-resMix)+resR*resMix;
  if(position===1){xL=filterVca(s.channels[0],xL,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1);xR=filterVca(s.channels[1],xR,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1)}
  let delaySeconds=.01+echoDensity*5.99;
  if(s.syncPeriodSamples>0){const ratio=Math.pow(2,Math.round((echoDensity-.5)*8));delaySeconds=(s.syncPeriodSamples/sr)/ratio}
  const delay=clamp(Math.round(delaySeconds*sr),2,s.channels[0].echoBuf.length-4);
  const echoL1=ringRead(s.channels[0].echoBuf,s.echoPos,delay),echoL2=ringRead(s.channels[0].echoBuf,s.echoPos,delay*1.5);
  const echoR1=ringRead(s.channels[1].echoBuf,s.echoPos,delay),echoR2=ringRead(s.channels[1].echoBuf,s.echoPos,delay*1.5);
  let echoL=echoL1*.65+echoL2*.35,echoR=echoR1*.65+echoR2*.35;const echoTone=clamp(p.echoTone,0,1,.5);s.channels[0].echoLP+=(echoL-s.channels[0].echoLP)*(.01+echoTone*.49);s.channels[1].echoLP+=(echoR-s.channels[1].echoLP)*(.01+echoTone*.49);echoL=s.channels[0].echoLP;echoR=s.channels[1].echoLP;const feedback=clamp(p.echoRepeats,0,.98,.2);
  s.channels[0].echoBuf[s.echoPos]=xL+echoR*feedback;s.channels[1].echoBuf[s.echoPos]=xR+echoL*feedback;
  s.echoPos++;if(s.echoPos>=s.channels[0].echoBuf.length)s.echoPos=0;
  xL=xL*(1-echoMix)+echoL*echoMix;xR=xR*(1-echoMix)+echoR*echoMix;
  if(position===2){xL=filterVca(s.channels[0],xL,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1);xR=filterVca(s.channels[1],xR,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1)}
  let revL=ambience(s.channels[0],xL,space,clamp(p.decay,0,1,.5)),revR=ambience(s.channels[1],xR,space,clamp(p.decay,0,1,.5));
  const pan=Math.sin(s.modPhase*Math.PI*2)*space*.25*(Math.round(clamp(p.reverbDirection,0,1,0))? -1:1),oldL=revL,oldR=revR;
  revL=oldL*(1-pan)+oldR*pan;revR=oldR*(1-pan)+oldL*pan;
  xL=xL*(1-ambienceMix)+revL*ambienceMix;xR=xR*(1-ambienceMix)+revR*ambienceMix;
  if(position===3){xL=filterVca(s.channels[0],xL,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1);xR=filterVca(s.channels[1],xR,cutoff,resonance,filterMode,vca,sr,rngNext(s)*2-1)}
  const peak=Math.max(Math.abs(xL),Math.abs(xR)),r=s.result;
  r.left=xL;r.right=xR;r.peak=peak;r.clipping=peak>1;r.mod=mod;r.modPhase=s.modPhase;
  return r;
 }
 return{createState,process};
});
