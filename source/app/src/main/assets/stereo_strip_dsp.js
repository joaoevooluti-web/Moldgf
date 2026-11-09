(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfStereoStripDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function coeff(type,freq,gain,sr){
  const A=Math.pow(10,clamp(gain,-12,12,0)/40),w=2*Math.PI*freq/sr,cs=Math.cos(w),sn=Math.sin(w),alpha=sn/(2*.707),ra=Math.sqrt(A);
  let b0,b1,b2,a0,a1,a2;
  if(type==="low"){
   b0=A*((A+1)-(A-1)*cs+2*ra*alpha);b1=2*A*((A-1)-(A+1)*cs);b2=A*((A+1)-(A-1)*cs-2*ra*alpha);a0=(A+1)+(A-1)*cs+2*ra*alpha;a1=-2*((A-1)+(A+1)*cs);a2=(A+1)+(A-1)*cs-2*ra*alpha;
  }else if(type==="high"){
   b0=A*((A+1)+(A-1)*cs+2*ra*alpha);b1=-2*A*((A-1)+(A+1)*cs);b2=A*((A+1)+(A-1)*cs-2*ra*alpha);a0=(A+1)-(A-1)*cs+2*ra*alpha;a1=2*((A-1)-(A+1)*cs);a2=(A+1)-(A-1)*cs-2*ra*alpha;
  }else{b0=1+alpha*A;b1=-2*cs;b2=1-alpha*A;a0=1+alpha/A;a1=-2*cs;a2=1-alpha/A}
  return{b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0};
 }
 function filter(){return{z1:0,z2:0,coeff:null,lastGain:999}}
 function channel(){return{low:filter(),mid:filter(),high:filter(),levelCv:1,muteGain:1,previousMute:0,momentaryCount:0}}
 function createState(sampleRate){const sr=clamp(sampleRate,8000,192000,48000),channels=[channel(),channel()],result={left:0,right:0,peak:0,clipping:false,pan:0,level:1};return{sampleRate:sr,channels,result}}
 function biquad(f,x,type,freq,gain,sr){if(!f.coeff||Math.abs(f.lastGain-gain)>.01){f.coeff=coeff(type,freq,gain,sr);f.lastGain=gain}const c=f.coeff,y=c.b0*x+f.z1;f.z1=c.b1*x-c.a1*y+f.z2;f.z2=c.b2*x-c.a2*y;return y}
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(sampleRate),sr=clamp(sampleRate,8000,192000,s.sampleRate);
  if(s.sampleRate!==sr){const fresh=createState(sr);s.sampleRate=sr;s.channels=fresh.channels;s.result=fresh.result}
  const mono=i.inR===null||i.inR===undefined;
  let left=i.inL===null||i.inL===undefined?0:finite(i.inL),right=mono?left:finite(i.inR);
  const inputGain=Math.round(clamp(p.inputLevel,0,1,0))?5:1;
  left*=inputGain;right*=inputGain;
  const low=clamp(p.low,-12,12,0),mid=clamp(p.mid,-12,12,0),high=clamp(p.high,-12,12,0);
  left=biquad(s.channels[0].low,left,"low",120,low,sr);left=biquad(s.channels[0].mid,left,"mid",1000,mid,sr);left=biquad(s.channels[0].high,left,"high",9000,high,sr);
  right=biquad(s.channels[1].low,right,"low",120,low,sr);right=biquad(s.channels[1].mid,right,"mid",1000,mid,sr);right=biquad(s.channels[1].high,right,"high",9000,high,sr);
  const levelCv=i.levelCV===null||i.levelCV===undefined?null:clamp(finite(i.levelCV)/5,0,2);
  const level=clamp(p.level,0,2,1);
  for(let n=0;n<2;n++){const target=levelCv===null?1:levelCv;s.channels[n].levelCv+=(target-s.channels[n].levelCv)*.02}
  const mute=Math.round(clamp(p.mute,0,2,0)),c=s.channels[0];
  if(mute===2&&c.previousMute!==2)c.momentaryCount=Math.round(sr*.12);
  c.previousMute=mute;
  let muteTarget=1;if(mute===1)muteTarget=0;else if(mute===2){if(c.momentaryCount>0){muteTarget=1;c.momentaryCount--}else muteTarget=0}
  c.muteGain+=(muteTarget-c.muteGain)*(muteTarget>c.muteGain?.002:.0007);
  const vca=level*(levelCv===null?1:c.levelCv)*c.muteGain;
  left*=vca;right*=vca;
  const pan=clamp(p.pan+(finite(i.panCV)/5)*clamp(p.panAtt,0,1,0),-1,1,0);
  let outL,outR;
  if(mono){const angle=(pan+1)*Math.PI*.25;outL=left*Math.cos(angle);outR=left*Math.sin(angle)}
  else if(pan>=0){outL=left*Math.cos(pan*Math.PI*.5);outR=right}
  else{outL=left;outR=right*Math.cos(-pan*Math.PI*.5)}
  const rawPeak=Math.max(Math.abs(outL),Math.abs(outR)),limiter=x=>Math.tanh(x*1.15);
  const outputGain=Math.round(clamp(p.outputLevel,0,1,0))?.2:1;
  outL=limiter(outL)*outputGain;outR=limiter(outR)*outputGain;
  const r=s.result;r.left=outL;r.right=outR;r.peak=rawPeak;r.clipping=rawPeak>1;r.pan=pan;r.level=vca;
  return r;
 }
 return{coefficients:coeff,createState,process};
});
