const test=require("node:test");
const assert=require("node:assert/strict");
const {createRegistry,canConnect,validateGraph}=require("../app/src/main/assets/module_graph.js");
const descriptor={type:"crushDelayV3",version:1,ports:[
 {id:"in",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 {id:"return",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]},
 ...["timeCV","feedbackCV","inVolCV","dryWetCV","returnVolCV"].map(id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
 {id:"crushGate",direction:"input",signal:"gate",channels:1,accepts:["gate","trigger","cv"]},
 {id:"out",direction:"output",signal:"audio",channels:1},
 {id:"send",direction:"output",signal:"audio",channels:1}
]};
const audio={type:"audioSink",ports:[{id:"in",direction:"input",signal:"audio",channels:1,accepts:["audio","cv"]}]};
const cv={type:"cvSource",ports:[{id:"out",direction:"output",signal:"cv",channels:1}]};
const gate={type:"gateSource",ports:[{id:"out",direction:"output",signal:"gate",channels:1}]};
const registry=()=>createRegistry([descriptor,audio,cv,gate]);

test("Crush Delay V3 exposes two audio inputs, five CV inputs, one crush gate and two outputs",()=>{
 const d=registry().get("crushDelayV3");assert.equal(d.ports.length,10);
 assert.deepEqual(d.ports.filter(p=>p.direction==="output").map(p=>p.id),["out","send"]);
});
test("main IN and RETURN accept audio and CV sources",()=>{
 const r=registry();for(const id of ["in","return"])assert.equal(canConnect(r,{type:"audioSink"},"in",{type:"crushDelayV3"},id).ok,false);
 assert.equal(canConnect(r,{type:"cvSource"},"out",{type:"crushDelayV3"},"in").ok,true);
 assert.equal(canConnect(r,{type:"cvSource"},"out",{type:"crushDelayV3"},"return").ok,true);
});
test("all five CV controls accept CV source outputs",()=>{
 const r=registry();for(const id of ["timeCV","feedbackCV","inVolCV","dryWetCV","returnVolCV"])assert.equal(canConnect(r,{type:"cvSource"},"out",{type:"crushDelayV3"},id).ok,true);
});
test("crush gate accepts gate, trigger and CV pulses",()=>{
 const r=registry();assert.equal(canConnect(r,{type:"gateSource"},"out",{type:"crushDelayV3"},"crushGate").ok,true);
 assert.equal(canConnect(r,{type:"cvSource"},"out",{type:"crushDelayV3"},"crushGate").ok,true);
});
test("OUT and SEND are independently connectable audio outputs",()=>{
 const r=registry();for(const id of ["out","send"])assert.equal(canConnect(r,{type:"crushDelayV3"},id,{type:"audioSink"},"in").ok,true);
 const modules=[{id:"fx",type:"crushDelayV3"},{id:"main",type:"audioSink"},{id:"wet",type:"audioSink"}];
 const result=validateGraph(r,modules,[{from:{module:"fx",port:"out"},to:{module:"main",port:"in"}},{from:{module:"fx",port:"send"},to:{module:"wet",port:"in"}}]);
 assert.equal(result.valid,true);assert.equal(result.errors.length,0);
});
