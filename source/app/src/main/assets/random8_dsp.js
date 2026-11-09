(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfRandom8DSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 const SCALES=[
  null,[0,2,4,5,7,9,11],[0,2,3,5,7,8,10],[0,2,3,5,7,8,11],
  [0,2,3,5,7,9,11],[0,2,3,5,7,9,10],[0,1,3,5,7,8,10],
  [0,2,4,6,7,9,11],[0,2,4,5,7,9,10],[0,1,3,5,6,8,10],
  [0,2,4,7,9],[0,3,5,7,10],[0,3,5,6,7,10],
  [0,2,4,6,8,10],[0,1,4,5,7,8,11]
 ];
 function rngNext(c){let x=c.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;c.rng=x|0;return (x>>>0)/4294967296}
 function createChannel(seed){return{rng:(seed>>>0)||1,gate:0,dividerCount:0,phrase:new Float32Array(32),phraseLength:0,phrasePos:0,target:0,current:0,lastRaw:0,alternating:0,wander:0,initialized:false,triggerCount:0}}
 function createState(seed){
  seed=(Number.isFinite(seed)?seed:0x4d4f4c44)>>>0;
  return{channels:Array.from({length:8},(_,i)=>createChannel((seed+Math.imul(i+1,0x9e3779b9))>>>0)),sampleRate:48000}
 }
 function randomValue(c,distribution){
  const r=()=>rngNext(c);
  switch(Math.round(clamp(distribution,0,7,0))){
   case 1:return clamp((r()+r()+r())/3,0,1);
   case 2:return r()*r();
   case 3:return 1-r()*r();
   case 4:return c.alternating++%2===0?1:0;
   case 5:c.wander=clamp(c.wander+(r()-.5)*.34,0,1);return c.wander;
   case 6:c.wander=clamp(c.wander+(r()-.5)*.12,0,1);return c.wander;
   case 7:return clamp(.5+Math.sin(r()*Math.PI*2)*.48,0,1);
   default:return r();
  }
 }
 function quantize(v,scale){
  const index=Math.round(clamp(scale,0,15,0));
  if(index===0)return v;
  const volts=clamp(v,0,10)*12,base=Math.floor(volts/12),within=volts-base*12;
  if(index===15)return Math.round(volts/12)*1;
  const notes=SCALES[index]||SCALES[1];let best=notes[0],dist=99;
  for(const n of notes){const d=Math.abs(n-within);if(d<dist){dist=d;best=n}}
  if(within>notes[notes.length-1]&&12-within<dist)best=12;
  return clamp((base*12+best)/12,0,10);
 }
 function nextTarget(c,p){
  const mode=Math.round(clamp(p.mode,0,3,0)),length=Math.round(clamp(p.length,1,32,8));
  if(mode===3&&c.initialized)return c.target;
  if(mode===1&&c.phraseLength>=length){
   c.phrasePos=(c.phrasePos+1)%length;
   return c.phrase[c.phrasePos];
  }
  if(mode===2&&c.initialized){
   c.target=quantize(clamp(c.target+(rngNext(c)-.5)*1.6,0,10),p.scale);
   return c.target;
  }
  const raw=randomValue(c,p.distribution);
  c.lastRaw=raw;
  const v=quantize(raw*10,p.scale);
  if(mode===1){
   if(c.phraseLength<length){
    c.phrasePos=c.phraseLength;
    c.phrase[c.phraseLength]=v;
    c.phraseLength++;
   }else{
    c.phrasePos=(c.phrasePos+1)%length;
    c.phrase[c.phrasePos]=v;
   }
  }
  return v;
 }
 function process(params,inputs,state,sampleRate){
  const p=params||{},ins=inputs||{},s=state||createState(),sr=clamp(sampleRate,8000,192000,48000),dt=1/sr;
  const outputs=new Float32Array(8),channels=s.channels;
  let inherited=0;
  for(let i=0;i<8;i++){
   const c=channels[i],key='trigger'+(i+1);
   const raw=ins.triggers&&ins.triggers[i]!==undefined?ins.triggers[i]:ins[key];
   const gate=raw===null||raw===undefined?inherited:finite(raw);
   if(raw!==null&&raw!==undefined)inherited=gate;
   const high=gate>1.5,edge=high&&!c.gate;c.gate=high?1:0;
   const level=Array.isArray(p.level)?p.level[i]:p['level'+(i+1)];
   if(edge){
    c.triggerCount++;
    const divider=Math.round(clamp(Array.isArray(p.divider)?p.divider[i]:p.divider,1,8,1));
    c.dividerCount++;
    if(c.dividerCount>=divider){
     c.dividerCount=0;
     const probability=clamp(Array.isArray(p.probability)?p.probability[i]:p.probability,0,1,1);
     if(rngNext(c)<=probability){
      const cfg={mode:Array.isArray(p.mode)?p.mode[i]:p.mode,length:Array.isArray(p.length)?p.length[i]:p.length,distribution:Array.isArray(p.distribution)?p.distribution[i]:p.distribution,scale:Array.isArray(p.scale)?p.scale[i]:p.scale};
      c.target=nextTarget(c,cfg);c.initialized=true;
     }
    }
   }
   const slide=clamp(Array.isArray(p.slide)?p.slide[i]:p.slide,0,1,0);
   const alpha=slide<=1e-5?1:1-Math.exp(-dt/(.002+slide*1.8));
   c.current+= (c.target-c.current)*alpha;
   const offset=clamp(Array.isArray(p.offset)?p.offset[i]:p.offset,0,10,0);
   const gain=clamp(Array.isArray(p.level)?p.level[i]:level,0,1,1);
   outputs[i]=clamp(Math.min(10,c.current+offset)*gain,0,10);
  }
  return{outputs,channels:channels.map((c,i)=>({value:outputs[i],target:c.target,mode:Math.round(clamp(Array.isArray(p.mode)?p.mode[i]:p.mode,0,3,0)),phraseLength:c.phraseLength,phrasePos:c.phrasePos,triggerCount:c.triggerCount}))};
 }
 return{createState,process,quantize,randomValue};
});
