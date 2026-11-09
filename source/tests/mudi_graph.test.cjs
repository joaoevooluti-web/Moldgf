const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [
  { id: "clock", direction: "input", signal: "gate", channels: 1, accepts: ["gate","cv"] },
  { id: "reset", direction: "input", signal: "gate", channels: 1, accepts: ["gate","cv"] },
  ...["f1","f2","f4","f8","f16"].map(id => ({ id, direction: "output", signal: "gate", channels: 1 }))
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

test("MuDi exposes base and four divided clock outputs", () => {
  for (const port of ["f1","f2","f4","f8","f16"]) {
    assert.equal(canConnect(registry, { type: "mudi" }, port, { type: "sink" }, "in").ok, true);
  }
});

test("MuDi rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "mudi" }, "clock", { type: "gate" }, "out").code, "direction");
});
