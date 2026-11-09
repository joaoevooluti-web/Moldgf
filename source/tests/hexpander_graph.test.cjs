const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"hexpander",ports:[
 ...Array.from({length:3},(_,i)=>({id:"return"+(i+1)+"L",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 ...Array.from({length:3},(_,i)=>({id:"return"+(i+1)+"R",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 ...["send1Pre","send1Post","send2Pre","send2Post","send3Pre","send3Post"].map(id=>({id,direction:"output",signal:"audio",channels:1})),
 ...Array.from({length:6},(_,i)=>({id:"direct"+(i+1),direction:"output",signal:"audio",channels:1})),
 ...["mainL","mainR","headL","headR"].map(id=>({id,direction:"output",signal:"audio",channels:1}))
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]}]}])}
test("Hexpander exposes six stereo return inputs and sixteen audio outputs",()=>{const d=registry().get("hexpander");assert.equal(d.ports.filter(p=>p.direction==="input").length,6);assert.equal(d.ports.filter(p=>p.direction==="output").length,16)});
test("all stereo return inputs accept audio sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"hexpander"};for(const port of ["return1L","return1R","return3L","return3R"])assert.equal(Graph.canConnect(r,src,"audio",m,port).ok,true)});
test("pre/post aux sends and six direct outs connect to audio destinations",()=>{const r=registry(),m={id:"m",type:"hexpander"},sink={id:"s",type:"sink"};for(const port of ["send1Pre","send1Post","send2Pre","send2Post","send3Pre","send3Post","direct1","direct6"])assert.equal(Graph.canConnect(r,m,port,sink,"audio").ok,true)});
test("balanced main and headphone stereo outputs connect independently",()=>{const r=registry(),m={id:"m",type:"hexpander"},sink={id:"s",type:"sink"};for(const port of ["mainL","mainR","headL","headR"])assert.equal(Graph.canConnect(r,m,port,sink,"audio").ok,true)});
test("Hexpander rejects reversed and incompatible connections",()=>{const r=registry(),m={id:"m",type:"hexpander"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,sink,"audio",m,"return1L").ok,false);assert.equal(Graph.canConnect(r,m,"mainL",sink,"cv").ok,false)});
