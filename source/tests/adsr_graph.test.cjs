const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"gate","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"trigger","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"attackCV","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"decayCV","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"sustainCV","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"releaseCV","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"env","direction":"output","signal":"cv","channels":1},{"id":"attackGate","direction":"output","signal":"gate","channels":1},{"id":"decayGate","direction":"output","signal":"gate","channels":1},{"id":"sustainGate","direction":"output","signal":"gate","channels":1},{"id":"releaseGate","direction":"output","signal":"gate","channels":1}];
const registry = createRegistry([
  { type: "adsr", ports },
  { type: "gate", ports: [{ id: "out", direction: "output", signal: "gate", channels: 1 }] },
  { type: "cv", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1 }] }
]);

test("ADSR accepts gate, trigger and four stage CV inputs", () => {
  for (const port of ["gate","trigger","attackCV","decayCV","sustainCV","releaseCV"]) {
    const source = port === "gate" || port === "trigger" ? "gate" : "cv";
    assert.equal(canConnect(registry, { type: source }, "out", { type: "adsr" }, port).ok, true);
  }
});

test("ADSR exposes envelope CV and four stage gate outputs", () => {
  for (const port of ["env","attackGate","decayGate","sustainGate","releaseGate"]) {
    assert.equal(canConnect(registry, { type: "adsr" }, port, { type: "sink" }, "in").ok, true);
  }
});

test("ADSR rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "adsr" }, "gate", { type: "gate" }, "out").code, "direction");
});
