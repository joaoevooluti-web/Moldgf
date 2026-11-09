const test=require("node:test");
const assert=require("node:assert/strict");
const {createRegistry,canConnect}=require("../app/src/main/assets/module_graph.js");
const ports=[{"id":"a","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"b","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"gate","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"cvA","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"vcaA","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"cvB","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"vcaB","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"chopp","direction":"output","signal":"audio","channels":1},{"id":"outA","direction":"output","signal":"audio","channels":1},{"id":"outB","direction":"output","signal":"audio","channels":1}];
const registry=createRegistry([
 {type:"choppingKinky",ports},
 {type:"audio",ports:[{id:"out",direction:"output",signal:"audio",channels:1}]},
 {type:"cv",ports:[{id:"out",direction:"output",signal:"cv",channels:1}]},
 {type:"gate",ports:[{id:"out",direction:"output",signal:"gate",channels:1}]},
 {type:"sink",ports:[{id:"in",direction:"input",signal:"audio",channels:1}]}
]);

test("Chopping Kinky accepts audio, gate and four CV controls",()=>{
 for(const p of ["a","b"])assert.equal(canConnect(registry,{type:"audio"},"out",{type:"choppingKinky"},p).ok,true);
 assert.equal(canConnect(registry,{type:"gate"},"out",{type:"choppingKinky"},"gate").ok,true);
 for(const p of ["cvA","vcaA","cvB","vcaB"])assert.equal(canConnect(registry,{type:"cv"},"out",{type:"choppingKinky"},p).ok,true);
});

test("Chopping Kinky exposes A, B and chopper outputs",()=>{
 for(const p of ["outA","outB","chopp"])assert.equal(canConnect(registry,{type:"choppingKinky"},p,{type:"sink"},"in").ok,true);
});

test("Chopping Kinky rejects reverse cable direction",()=>{
 assert.equal(canConnect(registry,{type:"choppingKinky"},"a",{type:"audio"},"out").code,"direction");
});
