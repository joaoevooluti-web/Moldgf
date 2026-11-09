const test=require("node:test");
const assert=require("node:assert/strict");
const {createRegistry,canConnect}=require("../app/src/main/assets/module_graph.js");
const ports=[{"id":"pitch1","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"pitch2","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"fm","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"pwm","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"sync","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"triangle","direction":"output","signal":"audio","channels":1},{"id":"sine","direction":"output","signal":"audio","channels":1},{"id":"even","direction":"output","signal":"audio","channels":1},{"id":"saw","direction":"output","signal":"audio","channels":1},{"id":"square","direction":"output","signal":"audio","channels":1}];
const registry=createRegistry([
 {type:"evenVco",ports},
 {type:"cv",ports:[{id:"out",direction:"output",signal:"cv",channels:1}]},
 {type:"gate",ports:[{id:"out",direction:"output",signal:"gate",channels:1}]},
 {type:"audio",ports:[{id:"in",direction:"input",signal:"audio",channels:1}]}
]);

test("Even VCO accepts two pitch, FM, sync and PWM inputs",()=>{
 for(const p of ["pitch1","pitch2","fm","pwm"])assert.equal(canConnect(registry,{type:"cv"},"out",{type:"evenVco"},p).ok,true);
 assert.equal(canConnect(registry,{type:"gate"},"out",{type:"evenVco"},"sync").ok,true);
});

test("Even VCO exposes triangle, sine, even, saw and square outputs",()=>{
 for(const p of ["triangle","sine","even","saw","square"])assert.equal(canConnect(registry,{type:"evenVco"},p,{type:"audio"},"in").ok,true);
});

test("Even VCO rejects reverse cable direction",()=>{
 assert.equal(canConnect(registry,{type:"evenVco"},"pitch1",{type:"cv"},"out").code,"direction");
});
