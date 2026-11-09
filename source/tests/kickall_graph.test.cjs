const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"kickall",ports:[
 {id:"volume",direction:"input",signal:"cv",channels:1,accepts:["cv","audio"]},
 {id:"trigger",direction:"input",signal:"gate",channels:1,accepts:["gate","trigger","clock","cv"]},
 {id:"tune",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"shape",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"decay",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"out",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1},{id:"gate",direction:"output",signal:"gate",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Kickall exposes the five documented inputs and one audio output",()=>{
 const d=registry().get("kickall");assert.equal(d.ports.filter(p=>p.direction==="input").length,5);assert.equal(d.ports.filter(p=>p.direction==="output").length,1);
});
test("Kickall accepts gate, trigger, clock and CV at its trigger input",()=>{
 const r=registry(),src={id:"s",type:"source"},k={id:"k",type:"kickall"};
 assert.equal(Graph.canConnect(r,src,"gate",k,"trigger").ok,true);
});
test("Kickall accepts audio-rate modulation at its general volume VCA",()=>{
 const r=registry(),src={id:"s",type:"source"},k={id:"k",type:"kickall"};
 assert.equal(Graph.canConnect(r,src,"audio",k,"volume").ok,true);
});
test("Kickall output routes to audio but not CV-only inputs",()=>{
 const r=registry(),k={id:"k",type:"kickall"},sink={id:"s",type:"sink"};
 assert.equal(Graph.canConnect(r,k,"out",sink,"audio").ok,true);
 assert.equal(Graph.canConnect(r,k,"out",sink,"cv").ok,false);
});
test("Kickall forms a valid trigger and audio output chain",()=>{
 const r=registry(),mods=[{id:"gate",type:"source"},{id:"voice",type:"kickall"},{id:"out",type:"sink"}];
 const g=Graph.validateGraph(r,mods,[{from:{module:"gate",port:"gate"},to:{module:"voice",port:"trigger"}},{from:{module:"voice",port:"out"},to:{module:"out",port:"audio"}}]);
 assert.equal(g.valid,true);assert.deepEqual(g.order,["gate","voice","out"]);
});
