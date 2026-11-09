const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"bandit",ports:[
 {id:"allIn",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"allCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 ...Array.from({length:4},(_,i)=>({id:"bandIn"+(i+1),direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 ...Array.from({length:4},(_,i)=>({id:"bandCV"+(i+1),direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 ...Array.from({length:4},(_,i)=>({id:"return"+(i+1),direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 ...Array.from({length:4},(_,i)=>({id:"bandOut"+(i+1),direction:"output",signal:"audio",channels:1})),
 {id:"mixOut",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Bandit exposes ALL IN, ALL CV, four band inputs, four CV inputs, four returns and five outputs",()=>{const d=registry().get("bandit");assert.equal(d.ports.filter(p=>p.direction==="input").length,14);assert.equal(d.ports.filter(p=>p.direction==="output").length,5)});
test("ALL AUDIO and individual band inputs accept audio sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"bandit"};for(const port of ["allIn","bandIn1","bandIn4"])assert.equal(Graph.canConnect(r,src,"audio",m,port).ok,true)});
test("ALL CV and individual band CV inputs accept CV sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"bandit"};for(const port of ["allCV","bandCV1","bandCV4"])assert.equal(Graph.canConnect(r,src,"cv",m,port).ok,true)});
test("four band outputs and MIX OUT connect to downstream audio",()=>{const r=registry(),m={id:"m",type:"bandit"},sink={id:"s",type:"sink"};for(const port of ["bandOut1","bandOut2","bandOut3","bandOut4","mixOut"])assert.equal(Graph.canConnect(r,m,port,sink,"audio").ok,true)});
test("Bandit rejects reversed connections and CV-to-audio-only outputs",()=>{const r=registry(),m={id:"m",type:"bandit"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,sink,"audio",m,"allIn").ok,false);assert.equal(Graph.canConnect(r,m,"mixOut",sink,"cv").ok,false)});
