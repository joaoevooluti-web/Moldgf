const test=require("node:test");
const assert=require("node:assert/strict");
const {createRegistry,canConnect,validateGraph}=require("../app/src/main/assets/module_graph.js");

const descriptor={type:"midiThingV2",version:1,ports:Array.from({length:12},(_,i)=>({id:"out"+(i+1),direction:"output",signal:"cv",channels:1}))};
function registry(){return createRegistry([descriptor,
 {type:"cvSink",ports:[{id:"in",direction:"input",signal:"cv",channels:1}]},
 {type:"audioSink",ports:[{id:"in",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]}]},
 {type:"gateSink",ports:[{id:"in",direction:"input",signal:"gate",channels:1,accepts:["gate","cv"]}]}
]);}

test("MIDI Thing V2 exposes twelve independently addressable CV output ports",()=>{
 const r=registry(),d=r.get("midiThingV2");assert.equal(d.ports.length,12);
 assert.deepEqual(d.ports.map(p=>p.id),Array.from({length:12},(_,i)=>"out"+(i+1)));
});
test("each MIDI Thing V2 output connects to CV destinations",()=>{
 const r=registry();for(let i=1;i<=12;i++)assert.equal(canConnect(r,{type:"midiThingV2"},"out"+i,{type:"cvSink"},"in").ok,true);
});
test("assignable CV outputs can drive audio and gate destinations that accept CV",()=>{
 const r=registry();assert.equal(canConnect(r,{type:"midiThingV2"},"out1",{type:"audioSink"},"in").ok,true);
 assert.equal(canConnect(r,{type:"midiThingV2"},"out12",{type:"gateSink"},"in").ok,true);
});
test("graph validates a twelve-port MIDI voice patch without collapsing ports",()=>{
 const r=registry(),modules=[{id:"mt",type:"midiThingV2"},...Array.from({length:12},(_,i)=>({id:"sink"+i,type:"cvSink"}))];
 const cables=Array.from({length:12},(_,i)=>({from:{module:"mt",port:"out"+(i+1)},to:{module:"sink"+i,port:"in"}}));
 const result=validateGraph(r,modules,cables);assert.equal(result.valid,true);assert.equal(result.errors.length,0);
});
test("unknown port and reversed cable direction are rejected",()=>{
 const r=registry();assert.equal(canConnect(r,{type:"midiThingV2"},"out13",{type:"cvSink"},"in").code,"unknown-port");
 assert.equal(canConnect(r,{type:"cvSink"},"in",{type:"midiThingV2"},"out1").code,"direction");
});
