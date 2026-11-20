const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [
  { id: "clock", direction: "input", signal: "gate", channels: 1, accepts: ["gate","cv"] },
  { id: "reset", direction: "input", signal: "gate", channels: 1, accepts: ["gate","cv"] },
  ...["f1","f1b","f1c","f2","f4","f8","f16"].map(id => ({ id, direction: "output", signal: "gate", channels: 1 }))
];
const registry = createRegistry([
  { type: "mudi", ports },
  { type: "gate", ports: [{ id: "out", direction: "output", signal: "gate", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "gate", channels: 1 }] }
]);

test("MuDi accepts clock and reset gate inputs", () => {
  assert.equal(canConnect(registry, { type: "gate" }, "out", { type: "mudi" }, "clock").ok, true);
  assert.equal(canConnect(registry, { type: "gate" }, "out", { type: "mudi" }, "reset").ok, true);
});

test("MuDi exposes three base clocks and four divided clock outputs", () => {
  for (const port of ["f1","f1b","f1c","f2","f4","f8","f16"]) {
    assert.equal(canConnect(registry, { type: "mudi" }, port, { type: "sink" }, "in").ok, true);
  }
});

test("MuDi rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "mudi" }, "clock", { type: "gate" }, "out").code, "direction");
});

test("MuDi faceplate and live descriptor expose seven output jacks",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../app/src/main/assets/index.html"),"utf8");
  const panel=html.slice(html.indexOf("mudi:{n:"),html.indexOf("slew:{n:"));
  const descriptor=html.slice(html.indexOf("PORT_REGISTRY.register({type:'mudi'"),html.indexOf("PORT_REGISTRY.register({type:'percall'"));
  for(const id of ["f1","f1b","f1c","f2","f4","f8","f16"]) {
    assert.ok(panel.includes("J(id+'."+id+"',"),"missing rendered jack "+id);
    assert.ok(descriptor.includes("id:'"+id+"'"),"missing descriptor port "+id);
  }
  assert.match(panel,/CLOCK MULTIPLE/);
  assert.match(panel,/1/16 F/);
});
