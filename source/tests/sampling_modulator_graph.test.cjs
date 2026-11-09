const test=require("node:test");
const assert=require("node:assert/strict");
const {createRegistry,canConnect}=require("../app/src/main/assets/module_graph.js");
const ports=[
{id:"sync",direction:"input",signal:"gate",channels:1,accepts:["gate","cv"]},
{id:"voct",direction:"input",signal:"cv",channels:1,accepts:["cv"]},
{id:"hold",direction:"input",signal:"gate",channels:1,accepts:["gate","cv"]},
{id:"raw",direction:"input",signal:"cv",channels:1,accepts:["cv","audio"]},
{id:"clock",direction:"output",signal:"gate",channels:1},
{id:"trigger",direction:"output",signal:"gate",channels:1},
{id:"sampled",direction:"output",signal:"cv",channels:1}
];
const registry=createRegistry([
{type:"samplingModulator",ports},
{type:"gate",ports:[{id:"out",direction:"output",signal:"gate",channels:1}]},
{type:"cv",ports:[{id:"out",direction:"output",signal:"cv",channels:1}]},
{type:"sink",ports:[{id:"in",direction:"input",signal:"cv",channels:1,accepts:["cv","gate"]}]}
]);

test("Sampling Modulator accepts sync, V/oct, hold and raw inputs",()=>{
 for(const port of ["sync","hold"])assert.equal(canConnect(registry,{type:"gate"},"out",{type:"samplingModulator"},port).ok,true);
 for(const port of ["voct","raw"])assert.equal(canConnect(registry,{type:"cv"},"out",{type:"samplingModulator"},port).ok,true);
});

test("Sampling Modulator exposes clock, trigger and sampled outputs",()=>{
 for(const port of ["clock","trigger","sampled"])assert.equal(canConnect(registry,{type:"samplingModulator"},port,{type:"sink"},"in").ok,true);
});

test("Sampling Modulator rejects reverse cable direction",()=>{
 assert.equal(canConnect(registry,{type:"samplingModulator"},"sync",{type:"gate"},"out").code,"direction");
});
