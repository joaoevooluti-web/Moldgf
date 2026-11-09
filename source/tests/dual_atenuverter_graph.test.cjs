const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");

function dualAtenuverterRegistry() {
  return createRegistry([
    { type: "dualAt", ports: [
      { id: "inA", direction: "input", signal: "cv", channels: 1 },
      { id: "inB", direction: "input", signal: "cv", channels: 1 },
      { id: "outA", direction: "output", signal: "cv", channels: 1 },
      { id: "outB", direction: "output", signal: "cv", channels: 1 }
    ] },
    { type: "cvSource", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
    { type: "cvSink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1 }] }
  ]);
}

test("Dual Atenuverter accepts CV source connections on both independent inputs", () => {
  const registry = dualAtenuverterRegistry();
  assert.equal(canConnect(registry, { type: "cvSource" }, "out", { type: "dualAt" }, "inA").ok, true);
  assert.equal(canConnect(registry, { type: "cvSource" }, "out", { type: "dualAt" }, "inB").ok, true);
});

test("Dual Atenuverter exposes two independently routable CV outputs", () => {
  const registry = dualAtenuverterRegistry();
  assert.equal(canConnect(registry, { type: "dualAt" }, "outA", { type: "cvSink" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "dualAt" }, "outB", { type: "cvSink" }, "in").ok, true);
});

test("Dual Atenuverter graph ports reject reversed cable direction", () => {
  const registry = dualAtenuverterRegistry();
  assert.equal(canConnect(registry, { type: "dualAt" }, "inA", { type: "cvSource" }, "out").code, "direction");
});
