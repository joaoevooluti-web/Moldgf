const test=require("node:test");
const assert=require("node:assert/strict");
const Graph=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"random8",ports:[
 ...Array.from({length:8},(_,i)=>({id:"trigger"+(i+1),direction:"input",signal:"trigger",channels:1,accepts:["trigger","gate","clock","cv"]})),
 ...Array.from({length:8},(_,i)=>({id:"out"+(i+1),direction:"output",signal:"cv",channels:1}))
]};
function registry(){return Graph.createRegistry([descriptor,{type:"source",ports:[{id:"gate",direction:"output",signal:"gate",channels:1},{id:"clock",direction:"output",signal:"clock",channels:1}]},{type:"sink",ports:[{id:"cv",direction:"input",signal:"cv",channels:1,accepts:["cv"]}]}])}
test("Random8 exposes eight trigger inputs and eight independent CV outputs",()=>{const d=registry().get("random8");assert.equal(d.ports.filter(p=>p.direction==="input").length,8);assert.equal(d.ports.filter(p=>p.direction==="output").length,8)});
test("all trigger jacks accept clock, gate and trigger sources",()=>{const r=registry(),src={id:"s",type:"source"},m={id:"r",type:"random8"};for(let i=1;i<=8;i++)assert.equal(Graph.canConnect(r,src,"gate",m,"trigger"+i).ok,true)});
test("each channel CV output connects to a CV destination",()=>{const r=registry(),m={id:"r",type:"random8"},sink={id:"s",type:"sink"};for(let i=1;i<=8;i++)assert.equal(Graph.canConnect(r,m,"out"+i,sink,"cv").ok,true)});
test("Random8 rejects CV output connections to audio-only destinations",()=>{const r=Graph.createRegistry([descriptor,{type:"audioSink",ports:[{id:"in",direction:"input",signal:"audio",channels:1,accepts:["audio"]}]}]);assert.equal(Graph.canConnect(r,{id:"r",type:"random8"},"out1",{id:"s",type:"audioSink"},"in").ok,false)});
test("Random8 channel outputs remain independently addressable in a validated graph",()=>{const r=registry(),mods=[{id:"rnd",type:"random8"},{id:"sink",type:"sink"}],cables=Array.from({length:8},(_,i)=>({from:{module:"rnd",port:"out"+(i+1)},to:{module:"sink",port:"cv"}}));assert.equal(Graph.validateGraph(r,mods,cables).valid,true)});
