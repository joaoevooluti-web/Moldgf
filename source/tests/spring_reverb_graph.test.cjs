const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"springReverb",ports:[
 {id:"in1",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"cv1",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"in2",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"cv2",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"mixCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"mix",direction:"output",signal:"audio",channels:1},
 {id:"wet",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Spring Reverb exposes five input and two output jacks",()=>{
 const d=registry().get("springReverb");assert.equal(d.ports.filter(p=>p.direction==="input").length,5);assert.equal(d.ports.filter(p=>p.direction==="output").length,2);
});
test("audio and CV sources connect to the corresponding Spring Reverb inputs",()=>{
 const r=registry(),src={id:"s",type:"source"},fx={id:"fx",type:"springReverb"};
 assert.equal(Graph.canConnect(r,src,"audio",fx,"in1").ok,true);
 assert.equal(Graph.canConnect(r,src,"cv",fx,"cv2").ok,true);
 assert.equal(Graph.canConnect(r,src,"cv",fx,"mixCV").ok,true);
});
test("Spring Reverb audio outputs connect to downstream audio inputs",()=>{
 const r=registry(),fx={id:"fx",type:"springReverb"},sink={id:"sink",type:"sink"};
 assert.equal(Graph.canConnect(r,fx,"mix",sink,"audio").ok,true);
 assert.equal(Graph.canConnect(r,fx,"wet",sink,"audio").ok,true);
});
test("Spring Reverb rejects CV-to-audio output type confusion",()=>{
 const r=registry(),fx={id:"fx",type:"springReverb"},sink={id:"sink",type:"sink"};
 assert.equal(Graph.canConnect(r,fx,"wet",sink,"cv").ok,false);
});
test("Spring Reverb routes both input paths through a valid module graph",()=>{
 const r=registry(),mods=[{id:"a",type:"source"},{id:"b",type:"source"},{id:"fx",type:"springReverb"},{id:"out",type:"sink"}];
 const g=Graph.validateGraph(r,mods,[{from:{module:"a",port:"audio"},to:{module:"fx",port:"in1"}},{from:{module:"b",port:"audio"},to:{module:"fx",port:"in2"}},{from:{module:"fx",port:"mix"},to:{module:"out",port:"audio"}}]);
 assert.equal(g.valid,true);assert.deepEqual(g.order,["a","b","fx","out"]);
});
