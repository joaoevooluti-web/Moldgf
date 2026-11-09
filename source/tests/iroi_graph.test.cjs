const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"iroi",ports:[
 {id:"inL",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"inR",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 ...["vcaCV","resMixCV","echoMixCV","ambienceMixCV","filterCutoffCV","resonatorTuneCV","echoDensityCV","ambienceSpaceCV"].map(id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 {id:"sync",direction:"input",signal:"clock",channels:1,accepts:["clock","gate","trigger","cv"]},
 {id:"random",direction:"input",signal:"gate",channels:1,accepts:["gate","trigger","cv"]},
 {id:"outL",direction:"output",signal:"audio",channels:1},
 {id:"outR",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1},{id:"gate",direction:"output",signal:"gate",channels:1},{id:"clock",direction:"output",signal:"clock",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("IROI exposes stereo audio pairs, eight CV inputs, sync and random gate",()=>{const d=registry().get("iroi");assert.equal(d.ports.filter(p=>p.direction==="input").length,12);assert.equal(d.ports.filter(p=>p.direction==="output").length,2)});
test("both stereo inputs accept audio and CV sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"iroi"};for(const port of ["inL","inR"])assert.equal(Graph.canConnect(r,src,"audio",m,port).ok,true)});
test("all eight CV jacks accept CV modulation sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"iroi"};for(const port of ["vcaCV","resMixCV","echoMixCV","ambienceMixCV","filterCutoffCV","resonatorTuneCV","echoDensityCV","ambienceSpaceCV"])assert.equal(Graph.canConnect(r,src,"cv",m,port).ok,true,port)});
test("sync and random inputs accept their documented trigger signal types",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"iroi"};assert.equal(Graph.canConnect(r,src,"clock",m,"sync").ok,true);assert.equal(Graph.canConnect(r,src,"gate",m,"random").ok,true)});
test("stereo outputs connect independently to downstream audio inputs",()=>{const r=registry(),m={id:"m",type:"iroi"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,m,"outL",sink,"audio").ok,true);assert.equal(Graph.canConnect(r,m,"outR",sink,"audio").ok,true)});
