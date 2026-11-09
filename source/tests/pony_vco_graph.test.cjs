const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"tzfm","direction":"input","signal":"cv","channels":1,"accepts":["cv","audio"]},{"id":"timbre","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"voct","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"sync","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"vca","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"out","direction":"output","signal":"audio","channels":1}];
const registry = createRegistry([
  { type: "ponyVco", ports },
  { type: "audio", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "cv", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "gate", ports: [{ id: "out", direction: "output", signal: "gate", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Pony VCO exposes all five modulation inputs and its waveform output", () => {
  for (const port of ["tzfm","timbre","voct","sync","vca"]) {
    const source = port === "sync" ? "gate" : port === "tzfm" ? "audio" : "cv";
    assert.equal(canConnect(registry, { type: source }, "out", { type: "ponyVco" }, port).ok, true);
  }
  assert.equal(canConnect(registry, { type: "ponyVco" }, "out", { type: "sink" }, "in").ok, true);
});

test("Pony VCO rejects reverse signal direction", () => {
  assert.equal(canConnect(registry, { type: "ponyVco" }, "voct", { type: "cv" }, "out").code, "direction");
});
