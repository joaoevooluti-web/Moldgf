const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"muxlicer",ports:[
 {id:"addressCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"reset",direction:"input",signal:"trigger",channels:1,accepts:["trigger","gate","clock","cv"]},
 {id:"clockIn",direction:"input",signal:"clock",channels:1,accepts:["clock","gate","trigger"]},
 {id:"gateModeCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"allIn",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"commonIn",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 ...Array.from({length:8},(_,i)=>({id:"stepIn"+(i+1),direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 {id:"commonOut",direction:"output",signal:"audio",channels:1},
 {id:"commonOutCV",direction:"output",signal:"cv",channels:1},
 {id:"clockOut",direction:"output",signal:"clock",channels:1},
 {id:"allGates",direction:"output",signal:"gate",channels:1},
 {id:"eoc",direction:"output",signal:"trigger",channels:1},
 ...Array.from({length:8},(_,i)=>({id:"gate"+(i+1),direction:"output",signal:"gate",channels:1})),
 ...Array.from({length:8},(_,i)=>({id:"stepOut"+(i+1),direction:"output",signal:"audio",channels:1})),
 ...Array.from({length:8},(_,i)=>({id:"stepOutCV"+(i+1),direction:"output",signal:"cv",channels:1}))
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1},{id:"gate",direction:"output",signal:"gate",channels:1},{id:"clock",direction:"output",signal:"clock",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]},{id:"gate",direction:"input",signal:"gate",channels:1,accepts:["gate"]},{id:"trigger",direction:"input",signal:"trigger",channels:1,accepts:["trigger"]}]}])}
test("Muxlicer exposes the bidirectional switch, clock, gate and EOC endpoint sets",()=>{
 const d=registry().get("muxlicer");assert.equal(d.ports.filter(p=>p.direction==="input").length,14);assert.equal(d.ports.filter(p=>p.direction==="output").length,29);
});
test("MUX inputs accept both audio and CV sources",()=>{
 const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"muxlicer"};
 assert.equal(Graph.canConnect(r,src,"audio",m,"stepIn1").ok,true);
 assert.equal(Graph.canConnect(r,src,"cv",m,"allIn").ok,true);
 assert.equal(Graph.canConnect(r,src,"audio",m,"commonIn").ok,true);
});
test("DEMUX exposes separate typed audio and CV output endpoints",()=>{
 const r=registry(),m={id:"m",type:"muxlicer"},sink={id:"s",type:"sink"};
 assert.equal(Graph.canConnect(r,m,"stepOut4",sink,"audio").ok,true);
 assert.equal(Graph.canConnect(r,m,"stepOutCV4",sink,"cv").ok,true);
 assert.equal(Graph.canConnect(r,m,"commonOut",sink,"audio").ok,true);
 assert.equal(Graph.canConnect(r,m,"commonOutCV",sink,"cv").ok,true);
});
test("clock, gate and EOC outputs retain their distinct signal types",()=>{
 const r=registry(),m={id:"m",type:"muxlicer"},sink={id:"s",type:"sink"};
 assert.equal(Graph.canConnect(r,m,"clockOut",sink,"trigger").ok,false);
 assert.equal(Graph.canConnect(r,m,"allGates",sink,"gate").ok,true);
 assert.equal(Graph.canConnect(r,m,"eoc",sink,"trigger").ok,true);
});
test("Muxlicer clock and gate CV inputs accept compatible sources",()=>{
 const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"muxlicer"};
 assert.equal(Graph.canConnect(r,src,"clock",m,"clockIn").ok,true);
 assert.equal(Graph.canConnect(r,src,"gate",m,"reset").ok,true);
 assert.equal(Graph.canConnect(r,src,"cv",m,"gateModeCV").ok,true);
});
test("Muxlicer supports a valid analog switch and gate routing graph",()=>{
 const r=registry(),mods=[{id:"src",type:"source"},{id:"mux",type:"muxlicer"},{id:"audio",type:"sink"},{id:"gate",type:"sink"}];
 const g=Graph.validateGraph(r,mods,[{from:{module:"src",port:"audio"},to:{module:"mux",port:"stepIn1"}},{from:{module:"mux",port:"commonOut"},to:{module:"audio",port:"audio"}},{from:{module:"mux",port:"allGates"},to:{module:"gate",port:"gate"}}]);
 assert.equal(g.valid,true);assert.deepEqual(g.order,["src","mux","audio","gate"]);
});
