(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MoldgfNoisePlethoraDSP=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const TAU=Math.PI*2,PRIMES=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53],FIB=[1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];
 const PROGRAMS=[
  ["RadioOhNo","Rwalk_SineFMFlange","xModRingSqr","xModRingSine","CrossModRing","Resonoise","GrainGlitch","GrainGlitchIII · XOR","GrainGlitchIII · Saw","Basurilla"],
  ["ClusterSaw","PwCluster","CrCluster2","SineFMcluster","TriFMcluster","Primecluster","PrimeCnoise","FibonacciCluster","PartialCluster","PhasingCluster"],
  ["BasuraTotal","Atari","WakingFilomena","P_S_H","ArrayOnTheRocks","ExistencelsPain","WhoKnows","SatanWorkout","Rwalk_BitCrushPW","Rwalk_LFree"]
 ];
 const clamp=(v,a,b,d=0)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:d));
 const finite=v=>Number.isFinite(v)?v:0;
 function makeGenerator(seed){return{phase:new Float64Array(16),walk:new Float64Array(16),bandLow:new Float64Array(4),bandBand:new Float64Array(4),bandFilters:Array.from({length:4},()=>({ic1:0,ic2:0})),delay:new Float32Array(2048),delayIndex:0,held:0,grainPhase:0,counter:0,seed:seed>>>0||1}}
 function createState(){return{a:makeGenerator(0x1234567),b:makeGenerator(0x7654321),c:makeGenerator(0x2468ace),filterA:{ic1:0,ic2:0},filterB:{ic1:0,ic2:0},filterC1:{ic1:0,ic2:0},filterC2:{ic1:0,ic2:0},gritEnvelope:0,gritCount:0,white:0,gritty:0,filtered:0,outA:0,outB:0,programA:0,programB:0}}
 function random(s){let x=s.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0||1;return (s.seed/2147483648)-1}
 function osc(s,index,freq,sr,type,pw){
  let phase=s.phase[index]||0;phase+=clamp(freq,0,sr*.45,0)/sr;phase-=Math.floor(phase);s.phase[index]=phase;
  if(type==="sine")return Math.sin(TAU*phase);
  if(type==="tri")return 1-4*Math.abs(phase-.5);
  if(type==="saw")return phase*2-1;
  return phase<(pw===undefined?.5:pw)?1:-1;
 }
 function delayMix(s,value,feedback){
  const line=s.delay,index=s.delayIndex,delayed=line[index];
  line[index]=clamp(value+delayed*feedback,-1.5,1.5,0);
  s.delayIndex=(index+1)%line.length;
  return (value+delayed)*.5;
 }
 function svf(input,cutoff,resonance,mode,state,sr){
  const g=Math.tan(Math.PI*clamp(cutoff,20,sr*.42,1000)/sr),k=2-1.92*clamp(resonance,0,.99,0);
  const a1=1/(1+g*(g+k)),a2=g*a1,a3=g*a2;
  const v3=input-state.ic2-k*state.ic1,v1=a1*state.ic1+a2*v3,v2=state.ic2+a2*state.ic1+a3*v3;
  state.ic1=2*v1-state.ic1;state.ic2=2*v2-state.ic2;
  return mode===1?v1:mode===2?v3:v2;
 }
 function algorithm(program,x,y,s,sr,dt){
  const bank=Math.floor(program/10),slot=program%10,base=35+x*x*8500,mod=8+y*y*3800;
  let out=0,i,f,v,m,grain;
  switch(bank*10+slot){
   case 0:
    for(i=0;i<4;i++){m=osc(s,i+4,base*(.19+i*.11),sr,"sine");out+=osc(s,i,base*(.35+i*.23)+m*mod*.22,sr,"square")*.25}return out;
   case 1:
    for(i=0;i<4;i++){s.walk[i]=clamp(s.walk[i]+random(s)*dt*(.5+x*3),-1,1);f=35+Math.abs(s.walk[i])*base;out+=osc(s,i,f+Math.sin(osc(s,i+4,mod*.1,sr,"sine"))*mod*.15,sr,"square")*.25}
    return delayMix(s,out,y*.85);
   case 2:
    v=osc(s,0,base,sr,"square");m=osc(s,1,base*1.37+v*mod,sr,"square");return v*m;
   case 3:
    v=osc(s,0,base,sr,"sine");m=osc(s,1,base*1.41+v*mod,sr,"sine");return v*m;
   case 4:
    v=osc(s,0,base,sr,"sine");for(i=1;i<4;i++){m=osc(s,i,base*(1+i*.31)+v*mod*.2,sr,i%2?"square":"sine");v*=m}return v;
   case 5:
    m=osc(s,1,mod*.25,sr,"sine");v=osc(s,0,base+m*mod,sr,"square");return Math.sin(v*(2+y*12))*Math.sign(v);
   case 6:case 7:case 8:
    s.grainPhase+=dt*(2+x*80);if(s.grainPhase>=1){s.grainPhase-=Math.floor(s.grainPhase);s.held=random(s)}
    v=osc(s,0,base*(slot===8?1.4:1),sr,slot===8?"saw":"square");
    grain=clamp(s.held+random(s)*y*.15,-1,1);
    return slot===6?(v>=0?1:-1)*(grain>=0?1:-1)*.65:slot===7?grain:v*.55+grain*.45;
   case 9:
    for(i=0;i<3;i++){f=1.5+i*2+x*18;v=osc(s,i,f,sr,"square",.08+y*.84);out+=v*(random(s)*.25+.25)}return out/1.5;
   case 10:
    for(i=0;i<16;i++)out+=osc(s,i,base*(.3+i*(.015+y*.12)),sr,"saw")/16;return out;
   case 11:
    for(i=0;i<6;i++)out+=osc(s,i,base*(.45+i*.035),sr,"square",.05+y*.9)/6;return out;
   case 12:
    for(i=0;i<6;i++){m=osc(s,i+8,1.1+i*.23,sr,"sine");out+=osc(s,i,base*(.5+i*.11)+m*mod*.35,sr,"sine")/6}return out;
   case 13:
    for(i=0;i<6;i++){m=osc(s,i+8,2+i*.73,sr,"sine");out+=osc(s,i,base*(.55+i*.09)+m*mod*.55,sr,"sine")/6}return out;
   case 14:
    for(i=0;i<6;i++){m=osc(s,i+8,1.5+i*.41,sr,"sine");out+=osc(s,i,base*(.5+i*.12)+m*mod*.4,sr,"tri")/6}return out;
   case 15:
    m=osc(s,8,mod*.12,sr,"sine");for(i=0;i<16;i++)out+=osc(s,i,base*(.2+PRIMES[i]*.006)+m*mod*.18,sr,"saw")/16;return out;
   case 16:
    m=random(s)*mod*.1;for(i=0;i<16;i++)out+=osc(s,i,base*(.2+PRIMES[i]*.006)+m,sr,"tri")/16;return out;
   case 17:
    for(i=0;i<16;i++)out+=osc(s,i,base*(.18+FIB[i]*.001*y),sr,"saw")/16;return out;
   case 18:
    m=osc(s,15,1.3+y*8,sr,"sine");for(i=0;i<16;i++)out+=osc(s,i,base*(.2+i*.025)+m*mod*.06,sr,"square")/16;return out;
   case 19:
    for(i=0;i<16;i++){m=osc(s,i+0,base*(.22+i*.027),sr,"square",.08+y*.84);out+=m/16}return out;
   case 20:
    v=random(s);m=osc(s,0,base*.1,sr,"sine");return delayMix(s,Math.tanh(v*2+m*mod*.2),.8);
   case 21:
    v=osc(s,0,base,sr,"square",.15+y*.7);m=osc(s,1,base*1.31+v*mod,sr,"square",.2+x*.6);return v*m;
   case 22:
    for(i=0;i<16;i++){if(random(s)>1-dt*(.2+x*3))s.walk[i]=random(s);f=30+Math.abs(s.walk[i])*base;out+=osc(s,i,f,sr,"square")/16}return out;
   case 23:
    s.counter++;if(s.counter%Math.max(1,Math.floor(2+y*300))===0)s.held=random(s);return delayMix(s.held*(.4+random(s)*.2),.7);
   case 24:
    m=osc(s,8,base*.07,sr,"sine");s.counter++;if(s.counter%Math.max(1,Math.floor(1+y*100))===0)s.held=random(s);
    v=osc(s,0,base+m*mod*.5,sr,"sine");return Math.tanh(v+(s.held*.4));
   case 25:case 26:
    v=slot===25?random(s):osc(s,0,base,sr,"square");
    for(i=0;i<4;i++){f=80+Math.abs(osc(s,i+8,1+i*.7,sr,"tri"))*(base*.5);out+=svf(v,f,.72,1,s.bandFilters[i],sr)*.25}return out;
   case 27:
    s.counter++;if(s.counter%Math.max(1,Math.floor(1+y*64))===0)s.held=random(s);m=osc(s,0,base*.2,sr,"sine");return Math.tanh(Math.round((s.held+m*mod*.15)*(4+x*60))/(4+x*60)*2);
   case 28:
    for(i=0;i<9;i++){s.walk[i]=clamp(s.walk[i]+random(s)*dt*(.2+x*2),-1,1);f=30+Math.abs(s.walk[i])*base;out+=osc(s,i,f,sr,"square",.1+y*.8)/9}return delayMix(Math.round(out*(4+y*80))/(4+y*80),.72);
   case 29:
    for(i=0;i<4;i++){m=osc(s,i+8,1+i*2+y*8,sr,"sine");out+=osc(s,i,base*(.3+i*.12),sr,"square",.1+(m+1)*.4)/4}return delayMix(out,.65);
   default:return random(s);
  }
 }
 function filterCutoff(knob,cv,atten){const norm=clamp(knob,0,1,.5)+clamp(cv,-5,5,0)/10*clamp(atten,0,1,0);return 20*Math.pow(1000,clamp(norm,0,1,.5))}
 function process(params,inputs,state,sampleRate){
  const p=params||{},i=inputs||{},s=state||createState(),sr=clamp(sampleRate,8000,192000,48000),dt=1/sr;
  const bankA=Math.round(clamp(p.bankA,0,2,0)),bankB=Math.round(clamp(p.bankB,0,2,0));
  const programA=i.programCVA===null||i.programCVA===undefined?Math.round(clamp(p.programA,0,9,0)):Math.floor(clamp(i.programCVA,0,9.999,0));
  const programB=i.programCVB===null||i.programCVB===undefined?Math.round(clamp(p.programB,0,9,0)):Math.floor(clamp(i.programCVB,0,9.999,0));
  const indexA=bankA*10+programA,indexB=bankB*10+programB;
  const xA=clamp(p.xA+finite(i.xCVA)/10,0,1,.5),yA=clamp(p.yA+finite(i.yCVA)/10,0,1,.5);
  const xB=clamp(p.xB+finite(i.xCVB)/10,0,1,.5),yB=clamp(p.yB+finite(i.yCVB)/10,0,1,.5);
  const rawA=algorithm(indexA,xA,yA,s.a,sr,dt),rawB=algorithm(indexB,xB,yB,s.b,sr,dt);
  const cutA=20*Math.pow(1000,clamp(p.cutoffA+finite(i.cutoffCVA)/10*clamp(p.cutoffAttA,0,1,0),0,1,.5));
  const cutB=20*Math.pow(1000,clamp(p.cutoffB+finite(i.cutoffCVB)/10*clamp(p.cutoffAttB,0,1,0),0,1,.5));
  const cutC=20*Math.pow(1000,clamp(p.cutoffC+finite(i.cutoffCVC)/10*clamp(p.cutoffAttC,0,1,0),0,1,.5));
  const outA=clamp(svf(rawA*5,cutA,p.resA,p.filterModeA,s.filterA,sr),-5,5,0);
  const outB=clamp(svf(rawB*5,cutB,p.resB,p.filterModeB,s.filterB,sr),-5,5,0);
  const white=random(s.c)*5;
  const grit=clamp(p.gritQty+finite(i.gritCV)/10,0,1,.5);
  if(random(s.c)>1-grit*dt*3600)s.gritEnvelope=1;
  s.gritEnvelope*=Math.exp(-dt/(.001+(1-grit)*.045));
  const gritty=s.gritEnvelope*random(s.c)*5;
  const source=p.sourceC?gritty:white;
  const c1=svf(source,cutC,p.resC,p.filterModeC,s.filterC1,sr);
  const filtered=clamp(svf(c1,cutC,p.resC,p.filterModeC,s.filterC2,sr),-5,5,0);
  s.outA=outA;s.outB=outB;s.white=white;s.gritty=gritty;s.filtered=filtered;s.programA=indexA;s.programB=indexB;
  return{outA,outB,white,gritty,filtered,programA:indexA,programB:indexB,programAName:PROGRAMS[bankA][programA],programBName:PROGRAMS[bankB][programB],xA,yA,xB,yB,cutA,cutB,cutC,grit,state:s};
 }
 return Object.freeze({PROGRAMS,clamp,createState,filterCutoff,svf,algorithm,process});
});
