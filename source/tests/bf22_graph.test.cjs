const test=require("node:test");
const assert=require("node:assert/strict");
const {createRegistry,canConnect,validateGraph}=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"bf22",version:1,ports:[
 {id:"inA",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"inB",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 ...["cv1A","cv2A","resCVA","cv1B","cv2B","resCVB"].map(id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 {id:"outA",direction:"output",signal:"audio",channels:1},
 {id:"outB",direction:"output",signal:"audio",channels:1}
]};
const sink={type:"audioSink",ports:[{id:"in",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]}]};
const source={type:"cvSource",ports:[{id:"out",direction:"output",signal:"cv",channels:1}]};
const r=()=>createRegistry([descriptor,sink,source]);

test("BF-22 exposes two audio inputs, six CV inputs and two independent audio outputs",()=>{
 const d=r().get("bf22");assert.equal(d.ports.length,10);
 assert.deepEqual(d.ports.filter(p=>p.direction==="output").map(p=>p.id),["outA","outB"]);
});
test("both filter audio inputs accept audio and CV sources",()=>{
 const g=r();assert.equal(canConnect(g,{type:"audioSink"},"in",{type:"bf22"},"inA").ok,false);
 assert.equal(canConnect(g,{type:"cvSource"},"out",{type:"bf22"},"inA").ok,true);
 assert.equal(canConnect(g,{type:"cvSource"},"out",{type:"bf22"},"inB").ok,true);
});
test("all six BF-22 CV inputs accept CV output connections",()=>{
 const g=r();for(const id of ["cv1A","cv2A","resCVA","cv1B","cv2B","resCVB"])assert.equal(canConnect(g,{type:"cvSource"},"out",{type:"bf22"},id).ok,true);
});
test("both BF-22 outputs can connect to audio destinations",()=>{
 const g=r();assert.equal(canConnect(g,{type:"bf22"},"outA",{type:"audioSink"},"in").ok,true);
 assert.equal(canConnect(g,{type:"bf22"},"outB",{type:"audioSink"},"in").ok,true);
});
test("graph validates two linked filter stages and rejects reversed direction",()=>{
 const g=r(),modules=[{id:"f",type:"bf22"},{id:"a",type:"audioSink"},{id:"b",type:"audioSink"}];
 const cables=[{from:{module:"f",port:"outA"},to:{module:"a",port:"in"}},{from:{module:"f",port:"outB"},to:{module:"b",port:"in"}}];
 const result=validateGraph(g,modules,cables);assert.equal(result.valid,true);
 assert.equal(canConnect(g,{type:"bf22"},"outA",{type:"bf22"},"inA").ok,true);
 assert.equal(canConnect(g,{type:"audioSink"},"in",{type:"bf22"},"outA").code,"direction");
});
