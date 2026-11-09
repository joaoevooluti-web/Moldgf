(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfHexmixDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function coeff(type,freq,gain,sr){
  const A=Math.pow(10,clamp(gain,-12,12,0)/40),w=2*Math.PI*freq/sr,cs=Math.cos(w),sn=Math.sin(w),alpha=sn/(2*.707),rootA=Math.sqrt(A);
  let b0,b1,b2,a0,a1,a2;
  if(type==="low"){
   b0=A*((A+1)-(A-1)*cs+2*rootA*alpha);b1=2*A*((A-1)-(A+1)*cs);b2=A*((A+1)-(A-1)*cs-2*rootA*alpha);
   a0=(A+1)+(A-1)*cs+2*rootA*alpha;a1=-2*((A-1)+(A+1)*cs);a2=(A+1)+(A-1)*cs-2*rootA*alpha;
  }else if(type==="high"){
   b0=A*((A+1)+(A-1)*cs+2*rootA*alpha);b1=-2*A*((A-1)+(A+1)*cs);b2=A*((A+1)+(A-1)*cs-2*rootA*alpha);
   a0=(A+1)-(A-1)*cs+2*rootA*alpha;a1=2*((A-1)-(A+1)*cs);a2=(A+1)-(A-1)*cs-2*rootA*alpha;
  }else{
   b0=1+alpha*A;b1=-2*cs;b2=1-alpha*A;a0=1+alpha/A;a1=-2*cs;a2=1-alpha/A;
  }
  return{b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0};
 }
 function filter(){return{z1:0,z2:0,coeff:null,lastGain:999}}
 function channel(sr){return{low:filter(),mid:filter(),high:filter(),muteGain:1,previousMute:0,momentaryCount:0,pre:0,postEq:0,post:0,peak:0}}
 function createState(sampleRate){
  const sr=clamp(sampleRate,8000,192000,48000),channels=Array.from({length:6},()=>channel(sr)),master=[channel(sr),channel(sr)];
  const pre=new Float32Array(6),postEq=new Float32Array(6),post=new Float32Array(6),meters=new Float32Array(6),result={left:0,right:0,pre,postEq,post,meters,peak:0,clipping:false};
  return{sampleRate:sr,channels,master,pre,postEq,post,meters,result};
 }
 function biquad(f,x,type,freq,gain,sr){
  if(!f.coeff||Math.abs(f.lastGain-gain)>.01){f.coeff=coeff(type,freq,gain,sr);f.lastGain=gain}
  const c=f.coeff,y=c.b0*x+f.z1;f.z1=c.b1*x-c.a1*y+f.z2;f.z2=c.b2*x-c.a2*y;return y;
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(sampleRate),sr=clamp(sampleRate,8000,192000,s.sampleRate);
  if(s.sampleRate!==sr){const fresh=createState(sr);s.sampleRate=sr;s.channels=fresh.channels;s.master=fresh.master;s.pre=fresh.pre;s.postEq=fresh.postEq;s.post=fresh.post;s.meters=fresh.meters;s.result=fresh.result}
  let left=0,right=0;
  for(let n=0;n<6;n++){
   const c=s.channels[n],direct=i.inputs&&i.inputs[n]!==undefined?i.inputs[n]:i["in"+(n+1)],host=i.hostInputs&&i.hostInputs[n]!==undefined?i.hostInputs[n]:0;
   const x=direct===null||direct===undefined?finite(host):finite(direct);
   c.pre=x;s.pre[n]=x;
   let y=biquad(c.low,x,"low",100,clamp(p.low&&p.low[n],-12,12,0),sr);
   y=biquad(c.mid,y,"mid",1000,clamp(p.mid&&p.mid[n],-12,12,0),sr);
   y=biquad(c.high,y,"high",10000,clamp(p.high&&p.high[n],-12,12,0),sr);
   c.postEq=y;s.postEq[n]=y;
   const mute=Math.round(clamp(p.mute&&p.mute[n],0,2,0));
   if(mute===2&&c.previousMute!==2)c.momentaryCount=Math.round(sr*.12);
   c.previousMute=mute;
   let target=1;
   if(mute===1)target=0;
   else if(mute===2){if(c.momentaryCount>0){target=1;c.momentaryCount--}else target=0}
   c.muteGain+=(target-c.muteGain)*(target>c.muteGain?.002:.0007);
   const volume=clamp(p.volume&&p.volume[n],0,2,1),z=y*volume*c.muteGain;
   c.post=z;s.post[n]=z;
   const pan=clamp(p.pan&&p.pan[n],-1,1,0),angle=(pan+1)*Math.PI*.25;
   left+=z*Math.cos(angle);right+=z*Math.sin(angle);
   c.peak=Math.abs(z);s.meters[n]=c.peak;
  }
  const masterLow=clamp(p.masterLow,-6,6,0),masterMid=clamp(p.masterMid,-6,6,0),masterHigh=clamp(p.masterHigh,-6,6,0);
  const ml=s.master[0],mr=s.master[1];
  left=biquad(ml.low,left,"low",100,masterLow,sr);left=biquad(ml.mid,left,"mid",1000,masterMid,sr);left=biquad(ml.high,left,"high",10000,masterHigh,sr);
  right=biquad(mr.low,right,"low",100,masterLow,sr);right=biquad(mr.mid,right,"mid",1000,masterMid,sr);right=biquad(mr.high,right,"high",10000,masterHigh,sr);
  const master=clamp(p.masterVolume,0,2,1)*(Math.round(clamp(p.outputLevel,0,1,0))?0.2:1);
  left*=master;right*=master;
  const peak=Math.max(Math.abs(left),Math.abs(right)),r=s.result;
  r.left=left;r.right=right;r.peak=peak;r.clipping=peak>1;
  return r;
 }
 return{BAND_INFO:{low:100,mid:1000,high:10000},coefficients:coeff,createState,process};
});
