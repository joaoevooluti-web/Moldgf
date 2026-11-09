const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");

const ports = ["ch1", "ch2", "ch3", "ch4"].map(id => ({
  id, direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"]
})).concat([
  { id: "main", direction: "output", signal: "audio", channels: 1 },
  { id: "inverted", direction: "output", signal: "audio", channels: 1 }
]);
const registry = createRegistry([
  { type: "mixer", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Befaco Mixer accepts four independent audio inputs", () => {
  for (const port of ["ch1", "ch2", "ch3", "ch4"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "mixer" }, port).ok, true);
  }
});

test("Befaco Mixer exposes main and inverted audio outputs", () => {
  assert.equal(canConnect(registry, { type: "mixer" }, "main", { type: "sink" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "mixer" }, "inverted", { type: "sink" }, "in").ok, true);
});

test("Befaco Mixer rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "mixer" }, "ch1", { type: "source" }, "out").code, "direction");
});
