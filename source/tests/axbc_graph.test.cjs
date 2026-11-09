const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");

const ports = ["a1", "b1", "c1", "a2", "b2", "c2"].map(id => ({
  id, direction: "input", signal: "cv", channels: 1
})).concat([
  { id: "out1", direction: "output", signal: "cv", channels: 1 },
  { id: "out2", direction: "output", signal: "cv", channels: 1 }
]);
const registry = createRegistry([
  { type: "axbc", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1 }] }
]);

test("AxBC exposes all six CV inputs", () => {
  for (const port of ["a1", "b1", "c1", "a2", "b2", "c2"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "axbc" }, port).ok, true);
  }
});

test("AxBC exposes both CV outputs", () => {
  assert.equal(canConnect(registry, { type: "axbc" }, "out1", { type: "sink" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "axbc" }, "out2", { type: "sink" }, "in").ok, true);
});

test("AxBC rejects reversed signal direction", () => {
  assert.equal(canConnect(registry, { type: "axbc" }, "a1", { type: "source" }, "out").code, "direction");
});
