const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const Even=require("../app/src/main/assets/even_vco_dsp.js");
const Mixer2=require("../app/src/main/assets/mixer2_dsp.js");
const Mixer=require("../app/src/main/assets/mixer_dsp.js");
const Graph=require("../app/src/main/assets/module_graph.js");

const html=fs.readFileSync(path.join(__dirname,"../app/src/main/assets/index.html"),"utf8");
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const engineSource=scripts.find(m=>/\bid=["']eng["']/.test(m[1]))?.[2];
assert.ok(engineSource,"shared audio engine script must exist");

function createEngine(){
 const context={MoldgfEvenVCODSP:Even,MoldgfMixer2DSP:Mixer2,MoldgfMixerDSP:Mixer};
 context.window=context;
 vm.createContext(context);
 vm.runInContext(engineSource+`
  globalThis.__MOLDGF_TEST={
   mkInst,idxE,I,byT,cab,cs,V,sig,K,rebuild,step,setGraphExecutionOrder,
   output:()=>[OL,OR],
   setInput:(port,value)=>{const source=sig("fixture.source."+port);V[source]=value;cs[sig(port)]=[source]}
  };
 `,context,{timeout:3000});
 return context.__MOLDGF_TEST;
}
const audioInput=id=>({id,direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]});
const cvInput=id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]});
const ports=[
 {type:"evenVco",ports:[...["pitch1","pitch2","fm","pwm"].map(cvInput),{id:"sync",direction:"input",signal:"gate",channels:1,accepts:["gate","cv"]},...["triangle","sine","even","saw","square"].map(id=>({id,direction:"output",signal:"audio",channels:1}))]},
 {type:"mixer2",ports:[...["ch1","ch2","ch3","ch4"].map(audioInput),{id:"mix12",direction:"output",signal:"audio",channels:1},{id:"mix34",direction:"output",signal:"audio",channels:1}]},
 {type:"mixer",ports:[...["ch1","ch2","ch3","ch4"].map(audioInput),{id:"main",direction:"output",signal:"audio",channels:1},{id:"inverted",direction:"output",signal:"audio",channels:1}]},
 {type:"out",ports:[audioInput("l"),audioInput("r")]}
];
const registry=Graph.createRegistry(ports);
const modules=[{id:"vco1",type:"evenVco"},{id:"mix2",type:"mixer2"},{id:"mix1",type:"mixer"},{id:"out1",type:"out"}];
const cables=[
 {from:{module:"vco1",port:"sine"},to:{module:"mix2",port:"ch1"}},
 {from:{module:"mix2",port:"mix12"},to:{module:"mix1",port:"ch1"}},
 {from:{module:"mix1",port:"main"},to:{module:"out1",port:"l"}}
];
const plan=Graph.validateGraph(registry,modules,cables);
assert.equal(plan.valid,true);
assert.deepEqual(plan.order,["vco1","mix2","mix1","out1"]);

function buildRack(engine){
 engine.mkInst("out1","out",{lv:1,mu:0});
 engine.mkInst("mix1","mixer",{gain:[1,0,0,0]});
 engine.mkInst("mix2","mixer2",{gain:[1,0,0,0],clip:0});
 engine.mkInst("vco1","evenVco",{octave:-5,tune:0,pwm:0,limitPW:1,removePulseDC:1});
 engine.idxE();
 engine.cab.push(...cables.map(c=>({a:c.from.module+"."+c.from.port,b:c.to.module+"."+c.to.port})));
 engine.rebuild();
 engine.setInput("vco1.pitch1",0);
 engine.setInput("vco1.pitch2",0);
 engine.setInput("vco1.fm",0);
 engine.setInput("vco1.sync",0);
 engine.setInput("vco1.pwm",0);
}

test("Even VCO executes through a typed topological chain to Audio Out",()=>{
 const engine=createEngine();
 buildRack(engine);
 assert.equal(engine.setGraphExecutionOrder(["out1","mix1","mix2","vco1"]),false);
 assert.equal(engine.setGraphExecutionOrder(plan.order),true);
 for(let n=0;n<240;n++)engine.step();
 const state=engine.I.vco1.r;
 const sine=engine.V[engine.sig("vco1.sine")];
 assert.ok(state.frequency>0);
 assert.ok(Number.isFinite(sine)&&sine>0);
 const [left,right]=engine.output();
 assert.ok(left>0&&right>0);
});

test("Even VCO remains functional when the scheduler falls back to legacy step",()=>{
 const engine=createEngine();
 buildRack(engine);
 assert.equal(engine.setGraphExecutionOrder(["out1","mix1","mix2","vco1"]),false);
 for(let n=0;n<16;n++)engine.step();
 const state=engine.I.vco1.r;
 const sine=engine.V[engine.sig("vco1.sine")];
 assert.ok(state.frequency>0);
 assert.ok(Number.isFinite(sine));
 const [left,right]=engine.output();
 assert.ok(left>0&&right>0);
});

test("Even VCO faceplate retains the typed CV and waveform endpoints",()=>{
 const panel=html.slice(html.indexOf("evenVco:{n:"),html.indexOf("rampage:{n:"));
 for(const label of ["OCTAVE","TUNE","PWM","PULSE WIDTH","PULSE DC","PITCH 1","PITCH 2","FM","SYNC","PWM CV","TRI","SINE","EVEN","SAW","SQUARE"])assert.ok(panel.includes(label),"missing Even VCO control "+label);
 assert.match(html,/PORT_REGISTRY\.register\(\{type:'evenVco'/);
});
