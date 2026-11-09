const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [
  ...["trigger","ping"].map(id=>({id,direction:"input",signal:"gate",channels:1,accepts:["gate","cv"]})),
  ...["quantityCV","distribution","time","probability"].map(id=>({id,direction:"input",signal:"cv",channels:1,accepts:["cv"]})),
  ...["tempo","eoc","burst"].map(id=>({id,direction:"output",signal:"gate",channels:1}))
];
const registry = createRegistry([
  { type: "burst", ports },
  { type: "gate", ports: [{ id: "out", direction: "output", signal: "gate", channels: 1 }] },
  { type: "cv", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "gate", channels: 1 }] }
]);

test("Burst accepts trigger, ping and four modulation inputs", () => {
  for (const port of ["trigger","ping"]) assert.equal(canConnect(registry,{type:"gate"},"out",{type:"burst"},port).ok,true);
  for (const port of ["quantityCV","distribution","time","probability"]) assert.equal(canConnect(registry,{type:"cv"},"out",{type:"burst"},port).ok,true);
});

test("Burst exposes tempo, end-of-cycle and burst gate outputs", () => {
  for (const port of ["tempo","eoc","burst"]) assert.equal(canConnect(registry,{type:"burst"},port,{type:"sink"},"in").ok,true);
});

test("Burst rejects reverse cable direction", () => {
  assert.equal(canConnect(registry,{type:"burst"},"trigger",{type:"gate"},"out").code,"direction");
});
