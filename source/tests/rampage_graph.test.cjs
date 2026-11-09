const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"rampage",ports:[
 ...["A","B"].flatMap(ch=>[
  {id:"in"+ch,direction:"input",signal:"cv",channels:1,accepts:["cv","audio"]},
  {id:"trig"+ch,direction:"input",signal:"gate",channels:1,accepts:["gate","trigger","clock","cv"]},
  {id:"riseCV"+ch,direction:"input",signal:"cv",channels:1,accepts:["cv"]},
  {id:"fallCV"+ch,direction:"input",signal:"cv",channels:1,accepts:["cv"]},
  {id:"expCV"+ch,direction:"input",signal:"cv",channels:1,accepts:["cv"]},
  {id:"cycleCV"+ch,direction:"input",signal:"gate",channels:1,accepts:["gate","cv"]},
  {id:"out"+ch,direction:"output",signal:"cv",channels:1},
  {id:"rising"+ch,direction:"output",signal:"gate",channels:1},
  {id:"falling"+ch,direction:"output",signal:"gate",channels:1},
  {id:"eoc"+ch,direction:"output",signal:"gate",channels:1}
 ]),
 {id:"compare",direction:"output",signal:"gate",channels:1},
 {id:"min",direction:"output",signal:"cv",channels:1},
 {id:"max",direction:"output",signal:"cv",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1},{id:"gate",direction:"output",signal:"gate",channels:1}]},{type:"sink",ports:[{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]},{id:"gate",direction:"input",signal:"gate",channels:1,accepts:["gate"]}]}])}
test("Rampage exposes dual signal, trigger, CV and logic ports",()=>{
 const r=registry(),d=r.get("rampage");
 for(const id of ["inA","inB","trigA","trigB","riseCVA","fallCVB","expCVA","cycleCVB","outA","outB","risingA","fallingB","eocA","eocB","compare","min","max"])assert.ok(d.ports.some(p=>p.id===id),id);
});
test("Rampage accepts audio and CV at both signal inputs",()=>{
 const r=registry(),source={id:"s",type:"source"},ramp={id:"r",type:"rampage"};
 assert.equal(Graph.canConnect(r,source,"audio",ramp,"inA").ok,true);
 assert.equal(Graph.canConnect(r,source,"cv",ramp,"inB").ok,true);
});
test("Rampage trigger accepts gate and trigger signals",()=>{
 const r=registry(),source={id:"s",type:"source"},ramp={id:"r",type:"rampage"};
 assert.equal(Graph.canConnect(r,source,"gate",ramp,"trigA").ok,true);
});
test("Rampage function and logic outputs route only to matching typed inputs",()=>{
 const r=registry(),ramp={id:"r",type:"rampage"},sink={id:"k",type:"sink"};
 assert.equal(Graph.canConnect(r,ramp,"outA",sink,"cv").ok,true);
 assert.equal(Graph.canConnect(r,ramp,"eocB",sink,"gate").ok,true);
 assert.equal(Graph.canConnect(r,ramp,"compare",sink,"gate").ok,true);
 assert.equal(Graph.canConnect(r,ramp,"compare",sink,"cv").ok,false);
});
test("graph validation accepts a connected Rampage signal chain",()=>{
 const r=registry(),mods=[{id:"s",type:"source"},{id:"r",type:"rampage"},{id:"k",type:"sink"}];
 const g=Graph.validateGraph(r,mods,[{from:{module:"s",port:"audio"},to:{module:"r",port:"inA"}},{from:{module:"r",port:"outA"},to:{module:"k",port:"cv"}}]);
 assert.equal(g.valid,true);assert.deepEqual(g.order,["s","r","k"]);
});
