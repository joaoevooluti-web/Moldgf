const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"octaves",ports:[
 {id:"pitch1",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"pitch2",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"sync",direction:"input",signal:"gate",channels:1,accepts:["gate","trigger","clock","cv"]},
 {id:"pwmCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 ...Array.from({length:6},(_,i)=>({id:"levelCV"+(i+1),direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 ...Array.from({length:6},(_,i)=>({id:"out"+(i+1),direction:"output",signal:"audio",channels:1}))
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"cv",direction:"output",signal:"cv",channels:1},{id:"gate",direction:"output",signal:"gate",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Octaves exposes two pitch CV inputs, sync, PWM CV, six level CV inputs and six audio outputs",()=>{const d=registry().get("octaves");assert.equal(d.ports.filter(p=>p.direction==="input").length,10);assert.equal(d.ports.filter(p=>p.direction==="output").length,6)});
test("pitch, PWM and level CV jacks accept CV sources",()=>{const r=registry(),src={id:"s",type:"source"},o={id:"o",type:"octaves"};for(const p of ["pitch1","pitch2","pwmCV","levelCV1","levelCV6"])assert.equal(Graph.canConnect(r,src,"cv",o,p).ok,true,p)});
test("hard sync accepts gate sources",()=>{const r=registry(),src={id:"s",type:"source"},o={id:"o",type:"octaves"};assert.equal(Graph.canConnect(r,src,"gate",o,"sync").ok,true)});
test("all six octave outputs connect to downstream audio inputs",()=>{const r=registry(),o={id:"o",type:"octaves"},sink={id:"s",type:"sink"};for(let n=1;n<=6;n++)assert.equal(Graph.canConnect(r,o,"out"+n,sink,"audio").ok,true)});
test("Octaves audio outputs reject CV-only destinations",()=>{const r=registry(),o={id:"o",type:"octaves"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,o,"out1",sink,"cv").ok,false)});
