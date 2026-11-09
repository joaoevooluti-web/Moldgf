const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"mex",ports:[
 {id:"gateIn",direction:"input",signal:"gate",channels:1,accepts:["gate","trigger","clock","cv","audio"]},
 {id:"out",direction:"output",signal:"gate",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1},{id:"gate",direction:"output",signal:"gate",channels:1},{id:"clock",direction:"output",signal:"clock",channels:1}]},{type:"sink",ports:[{id:"gate",direction:"input",signal:"gate",channels:1,accepts:["gate"]},{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]}]}])}
test("MEX exposes Gate In and one main Gate Out",()=>{const d=registry().get("mex");assert.equal(d.ports.length,2);assert.equal(d.ports[0].id,"gateIn");assert.equal(d.ports[1].id,"out")});
test("Gate In accepts audio, CV, gate, trigger and clock sources",()=>{const r=registry(),src={id:"s",type:"source"},mex={id:"m",type:"mex"};for(const signal of ["audio","cv","gate","clock"])assert.equal(Graph.canConnect(r,src,signal,mex,"gateIn").ok,true,signal)});
test("MEX Gate Out connects only to gate-compatible destinations",()=>{const r=registry(),mex={id:"m",type:"mex"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,mex,"out",sink,"gate").ok,true);assert.equal(Graph.canConnect(r,mex,"out",sink,"audio").ok,false)});
test("MEX gate processing can be routed into a downstream gate input",()=>{const r=registry(),mods=[{id:"src",type:"source"},{id:"mex",type:"mex"},{id:"sink",type:"sink"}],g=Graph.validateGraph(r,mods,[{from:{module:"src",port:"clock"},to:{module:"mex",port:"gateIn"}},{from:{module:"mex",port:"out"},to:{module:"sink",port:"gate"}}]);assert.equal(g.valid,true);assert.deepEqual(g.order,["src","mex","sink"])});
test("MEX rejects reversed cable direction",()=>{const r=registry(),mex={id:"m",type:"mex"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,sink,"gate",mex,"gateIn").ok,false)});
