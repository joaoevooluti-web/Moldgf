const test=require("node:test");
const assert=require("node:assert/strict");
const Noise=require("../app/src/main/assets/noise_plethora_dsp.js");

test("Noise Plethora exposes three banks of ten documented programs",()=>{
 assert.equal(Noise.PROGRAMS.length,3);for(const bank of Noise.PROGRAMS)assert.equal(bank.length,10);
 assert.equal(Noise.PROGRAMS[0][0],"RadioOhNo");assert.equal(Noise.PROGRAMS[1][0],"ClusterSaw");assert.equal(Noise.PROGRAMS[2][0],"BasuraTotal");
});
test("A and B generators select banks and programs independently",()=>{
 const s=Noise.createState(),r=Noise.process({bankA:1,programA:3,bankB:2,programB:8},{},s,48000);
 assert.equal(r.programA,13);assert.equal(r.programB,28);assert.equal(r.programAName,"SineFMcluster");assert.equal(r.programBName,"Rwalk_BitCrushPW");
});
test("program CV selects a program in the active bank",()=>{
 const s=Noise.createState(),r=Noise.process({bankA:0,programA:1,bankB:1,programB:1},{programCVA:7.2,programCVB:3.8},s,48000);
 assert.equal(r.programA,7);assert.equal(r.programB,13);
});
test("X and Y CV inputs are summed with manual controls and bounded",()=>{
 const a=Noise.process({bankA:0,programA:0,xA:.1,yA:.1},{xCVA:5,yCVA:5},Noise.createState(),48000);
 const b=Noise.process({bankA:0,programA:0,xA:.1,yA:.1},{xCVA:-5,yCVA:-5},Noise.createState(),48000);
 assert.ok(a.xA>b.xA&&a.yA>b.yA);assert.ok(a.xA<=1&&b.xA>=0);
});
test("A and B generators maintain independent algorithm and filter states",()=>{
 const s=Noise.createState(),r=Noise.process({bankA:0,programA:0,bankB:1,programB:0},{},s,48000);
 assert.notEqual(r.outA,r.outB);assert.notEqual(s.a.seed,s.b.seed);
});
test("all thirty algorithm slots produce finite bounded audio",()=>{
 for(let program=0;program<30;program++){const s=Noise.createState(),r=Noise.process({bankA:Math.floor(program/10),programA:program%10,xA:.43,yA:.67,cutoffA:.8,resA:.4},{},s,48000);
 for(const key of ["outA","outB","white","gritty","filtered"])assert.ok(Number.isFinite(r[key])&&Math.abs(r[key])<=5,program+":"+key)}
});
test("multimode filters produce distinct low-pass, band-pass and high-pass responses",()=>{
 const p={bankA:0,programA:0,xA:.4,yA:.6,cutoffA:.5,resA:.3};
 const lp=Noise.process({...p,filterModeA:0},{},Noise.createState(),48000).outA;
 const bp=Noise.process({...p,filterModeA:1},{},Noise.createState(),48000).outA;
 const hp=Noise.process({...p,filterModeA:2},{},Noise.createState(),48000).outA;
 assert.ok(new Set([lp,bp,hp]).size>1);
});
test("cutoff CV and attenuator change the filter cutoff",()=>{
 const s=Noise.createState(),p={bankA:0,programA:0,cutoffA:.4,cutoffAttA:1};
 const a=Noise.process(p,{cutoffCVA:-5},s,48000),b=Noise.process(p,{cutoffCVA:5},Noise.createState(),48000);
 assert.ok(b.cutA>a.cutA);
 const c=Noise.process({...p,cutoffAttA:0},{cutoffCVA:5},Noise.createState(),48000);
 assert.ok(c.cutA>a.cutA);assert.ok(Math.abs(c.cutA-20*Math.pow(1000,.4))<1e-8);
});
test("resonance is bounded and affects the multimode filter response",()=>{
 const p={bankA:0,programA:0,cutoffA:.35,filterModeA:1};
 const low=Noise.createState(),high=Noise.createState();let a,b;
 for(let n=0;n<1000;n++){a=Noise.process({...p,resA:0},{},low,48000);b=Noise.process({...p,resA:.95},{},high,48000)}
 assert.ok(Number.isFinite(a.outA)&&Number.isFinite(b.outA));assert.notEqual(a.outA,b.outA);
});
test("white and gritty outputs are independent and grit quantity changes density",()=>{
 const low=Noise.createState(),high=Noise.createState();let lowSum=0,highSum=0;
 for(let n=0;n<12000;n++){const a=Noise.process({gritQty:0},{},low,48000),b=Noise.process({gritQty:1},{},high,48000);lowSum+=Math.abs(a.gritty);highSum+=Math.abs(b.gritty);assert.ok(Number.isFinite(a.white))}
 assert.ok(highSum>lowSum);
});
test("filtered C output selects white or gritty source independently",()=>{
 const a=Noise.createState(),b=Noise.createState();let ra,rb;
 for(let n=0;n<1000;n++){ra=Noise.process({sourceC:0,cutoffC:.8},{},a,48000);rb=Noise.process({sourceC:1,cutoffC:.8},{},b,48000)}
 assert.notEqual(ra.filtered,rb.filtered);
});
test("program, CV and grit controls clamp out-of-range values safely",()=>{
 const r=Noise.process({bankA:99,programA:99,bankB:-4,programB:-4,xA:99,yA:-9,gritQty:99},{programCVA:99,xCVA:99,cutoffCVA:-99,gritCV:99},Noise.createState(),44100);
 assert.equal(r.programA,29);assert.equal(r.programB,0);assert.ok(Number.isFinite(r.outA)&&Number.isFinite(r.gritty));
});
test("identically seeded states produce deterministic program output",()=>{
 const p={bankA:2,programA:7,xA:.4,yA:.7,cutoffA:.6,resA:.3},a=Noise.createState(),b=Noise.createState();let ra,rb;
 for(let n=0;n<500;n++){ra=Noise.process(p,{},a,48000);rb=Noise.process(p,{},b,48000)}
 assert.equal(ra.outA,rb.outA);assert.equal(ra.white,rb.white);assert.equal(ra.gritty,rb.gritty);
});
test("sample-rate changes and long processing remain finite",()=>{
 const s=Noise.createState();let r;
 for(let n=0;n<12000;n++)r=Noise.process({bankA:2,programA:8,bankB:1,programB:4,gritQty:.9,cutoffA:.9,cutoffB:.8,cutoffC:.7,resA:.8,resB:.8,resC:.8},{},s,n<6000?48000:96000);
 for(const key of ["outA","outB","white","gritty","filtered"])assert.ok(Number.isFinite(r[key]));
});
