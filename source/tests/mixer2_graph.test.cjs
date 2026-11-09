const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");

const ports = ["ch1", "ch2", "ch3", "ch4"].map(id => ({
  id, direction: "input", signal: "cv", channels: 1, accepts: ["cv", "audio"]
})).concat([
  { id: "mix12", direction: "output", signal: "audio", channels: 1 },
  { id: "mix34", direction: "output", signal: "audio", channels: 1 }
]);
const registry = createRegistry([
  { type: "mixer2", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Mixer2 exposes four CV inputs", () => {
  for (const port of ["ch1", "ch2", "ch3", "ch4"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "mixer2" }, port).ok, true);
  }
});

test("Mixer2 exposes the pair and master mix outputs", () => {
  assert.equal(canConnect(registry, { type: "mixer2" }, "mix12", { type: "sink" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "mixer2" }, "mix34", { type: "sink" }, "in").ok, true);
});

test("Mixer2 rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "mixer2" }, "ch1", { type: "source" }, "out").code, "direction");
});
