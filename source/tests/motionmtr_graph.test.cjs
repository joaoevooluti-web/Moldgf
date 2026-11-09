const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"in1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"in2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"in3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"out1","direction":"output","signal":"audio","channels":1},{"id":"out2","direction":"output","signal":"audio","channels":1},{"id":"out3","direction":"output","signal":"audio","channels":1}];
const registry = createRegistry([
  { type: "motionmtr", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Motion MTR exposes three independent signal inputs", () => {
  for (const port of ["in1","in2","in3"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "motionmtr" }, port).ok, true);
  }
});

test("Motion MTR exposes two individual outputs and one mix output", () => {
  for (const port of ["out1","out2","out3"]) {
    assert.equal(canConnect(registry, { type: "motionmtr" }, port, { type: "sink" }, "in").ok, true);
  }
});

test("Motion MTR rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "motionmtr" }, "in1", { type: "source" }, "out").code, "direction");
});
