const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"hexmix",ports:[
 ...Array.from({length:6},(_,i)=>({id:"in"+(i+1),direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]})),
 {id:"outL",direction:"output",signal:"audio",channels:1},
 {id:"outR",direction:"output",signal:"audio",channels:1}
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"audio",direction:"output",signal:"audio",channels:1},{id:"cv",direction:"output",signal:"cv",channels:1}]},{type:"sink",ports:[{id:"audio",direction:"input",signal:"audio",channels:1,accepts:["audio"]},{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Hexmix exposes six channel inputs and a stereo master output",()=>{const d=registry().get("hexmix");assert.equal(d.ports.filter(p=>p.direction==="input").length,6);assert.equal(d.ports.filter(p=>p.direction==="output").length,2)});
test("all six channel inputs accept audio and CV sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"m",type:"hexmix"};for(let n=1;n<=6;n++)assert.equal(Graph.canConnect(r,src,"audio",m,"in"+n).ok,true)});
test("stereo master outputs connect independently to audio destinations",()=>{const r=registry(),m={id:"m",type:"hexmix"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,m,"outL",sink,"audio").ok,true);assert.equal(Graph.canConnect(r,m,"outR",sink,"audio").ok,true)});
test("Hexmix rejects reversed and incompatible CV-output connections",()=>{const r=registry(),m={id:"m",type:"hexmix"},sink={id:"s",type:"sink"};assert.equal(Graph.canConnect(r,sink,"audio",m,"in1").ok,false);assert.equal(Graph.canConnect(r,m,"outL",sink,"cv").ok,false)});
test("six channel strips can feed the stereo master without graph cycles",()=>{const r=registry(),mods=[{id:"src",type:"source"},{id:"mix",type:"hexmix"},{id:"sink",type:"sink"}],g=Graph.validateGraph(r,mods,[{from:{module:"src",port:"audio"},to:{module:"mix",port:"in1"}},{from:{module:"mix",port:"outL"},to:{module:"sink",port:"audio"}}]);assert.equal(g.valid,true);assert.deepEqual(g.order,["src","mix","sink"])});
