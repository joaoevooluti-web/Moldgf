const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"ponyVcf",ports:[
 ...Array.from({length:3},(_,i)=>({id:"in"+(i+1),direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 ...["cv1","cv2","resCV","volumeCV"].map(id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 {id:"out",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Pony VCF exposes three audio inputs, four CV inputs and one audio output",()=>{const d=registry().get("ponyVcf");assert.equal(d.ports.filter(p=>p.direction==="input").length,7);assert.equal(d.ports.filter(p=>p.direction==="output").length,1)});
test("all three audio mixer inputs accept audio sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"ponyVcf"};for(let n=1;n<=3;n++)assert.equal(Graph.canConnect(r,src,"audio",m,"in"+n).ok,true)});
test("CV1 CV2 resonance and volume inputs accept CV sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"ponyVcf"};for(const port of ["cv1","cv2","resCV","volumeCV"])assert.equal(Graph.canConnect(r,src,"cv",m,port).ok,true)});
test("Pony VCF audio output connects to downstream audio inputs",()=>{const r=registry(),m={id:"m",type:"ponyVcf"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,m,"out",sink,"audio").ok,true)});
test("Pony VCF rejects reversed and incompatible output connections",()=>{const r=registry(),m={id:"m",type:"ponyVcf"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,sink,"audio",m,"in1").ok,false);assert.equal(Graph.canConnect(r,m,"out",sink,"cv").ok,false)});
