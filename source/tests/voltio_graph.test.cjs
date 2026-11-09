const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");

const registry = createRegistry([
  { type: "voltio", ports: [
    { id: "sumIn", direction: "input", signal: "cv", channels: 1 },
    { id: "out", direction: "output", signal: "cv", channels: 1 }
  ] },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1 }] }
]);

test("Voltio accepts an external CV at its precision summing input", () => {
  assert.equal(canConnect(registry, { type: "source" }, "out", { type: "voltio" }, "sumIn").ok, true);
});

test("Voltio exposes its summed voltage as a CV output", () => {
  assert.equal(canConnect(registry, { type: "voltio" }, "out", { type: "sink" }, "in").ok, true);
});

test("Voltio graph descriptor rejects reverse connection direction", () => {
  assert.equal(canConnect(registry, { type: "voltio" }, "sumIn", { type: "source" }, "out").code, "direction");
});
