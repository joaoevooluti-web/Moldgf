const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [
  { id: "in", direction: "input", signal: "cv", channels: 1, accepts: ["cv","audio"] },
  { id: "cv", direction: "input", signal: "cv", channels: 1, accepts: ["cv"] },
  { id: "out", direction: "output", signal: "cv", channels: 1 },
  { id: "rising", direction: "output", signal: "gate", channels: 1 },
  { id: "falling", direction: "output", signal: "gate", channels: 1 }
];
const registry = createRegistry([
  { type: "slew", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1, accepts: ["cv","gate"] }] }
]);

test("Slew accepts input and shared rise/fall CV", () => {
  assert.equal(canConnect(registry, { type: "source" }, "out", { type: "slew" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "source" }, "out", { type: "slew" }, "cv").ok, true);
});

test("Slew exposes output plus rising and falling gate signals", () => {
  for (const port of ["out","rising","falling"]) {
    assert.equal(canConnect(registry, { type: "slew" }, port, { type: "sink" }, "in").ok, true);
  }
});

test("Slew rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "slew" }, "in", { type: "source" }, "out").code, "direction");
});
