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
  { type: "abc", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1 }] }
]);

test("ABC exposes six CV inputs and two independently patchable outputs", () => {
  for (const port of ["a1", "b1", "c1", "a2", "b2", "c2"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "abc" }, port).ok, true);
  }
  assert.equal(canConnect(registry, { type: "abc" }, "out1", { type: "sink" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "abc" }, "out2", { type: "sink" }, "in").ok, true);
});

test("ABC graph ports reject reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "abc" }, "a1", { type: "source" }, "out").code, "direction");
});
