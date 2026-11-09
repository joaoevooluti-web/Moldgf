const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"stereoStrip",ports:[
 {id:"inL",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"inR",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"levelCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"panCV",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
 {id:"outL",direction:"output",signal:"audio",channels:1},
 {id:"outR",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Stereo Strip exposes stereo inputs outputs and two CV controls",()=>{const d=registry().get("stereoStrip");assert.equal(d.ports.filter(p=>p.direction==="input").length,4);assert.equal(d.ports.filter(p=>p.direction==="output").length,2)});
test("left and right audio inputs accept audio and CV sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"stereoStrip"};for(const port of ["inL","inR"])assert.equal(Graph.canConnect(r,src,"audio",m,port).ok,true)});
test("level and pan CV inputs accept CV sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"stereoStrip"};for(const port of ["levelCV","panCV"])assert.equal(Graph.canConnect(r,src,"cv",m,port).ok,true)});
test("left and right outputs connect independently to downstream audio inputs",()=>{const r=registry(),m={id:"m",type:"stereoStrip"},sink={id:"s",type:"sink"};for(const port of ["outL","outR"])assert.equal(Graph.canConnect(r,m,port,sink,"audio").ok,true)});
test("Stereo Strip rejects reversed and incompatible connections",()=>{const r=registry(),m={id:"m",type:"stereoStrip"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,sink,"audio",m,"inL").ok,false);assert.equal(Graph.canConnect(r,m,"outL",sink,"cv").ok,false)});
