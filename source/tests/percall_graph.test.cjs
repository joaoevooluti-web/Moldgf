const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"ch1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"trigger1","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"cv1","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"out1","direction":"output","signal":"audio","channels":1},{"id":"env1","direction":"output","signal":"cv","channels":1},{"id":"ch2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"trigger2","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"cv2","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"out2","direction":"output","signal":"audio","channels":1},{"id":"env2","direction":"output","signal":"cv","channels":1},{"id":"ch3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"trigger3","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"cv3","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"out3","direction":"output","signal":"audio","channels":1},{"id":"env3","direction":"output","signal":"cv","channels":1},{"id":"ch4","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"trigger4","direction":"input","signal":"gate","channels":1,"accepts":["gate","cv"]},{"id":"cv4","direction":"input","signal":"cv","channels":1,"accepts":["cv"]},{"id":"out4","direction":"output","signal":"audio","channels":1},{"id":"env4","direction":"output","signal":"cv","channels":1},{"id":"strength","direction":"input","signal":"cv","channels":1,"accepts":["cv"]}];
const registry = createRegistry([
  { type: "percall", ports },
  { type: "audio", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "cv", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "gate", ports: [{ id: "out", direction: "output", signal: "gate", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1, accepts: ["audio","cv"] }] }
]);

test("Percall exposes four audio, trigger and decay-CV inputs plus strength", () => {
  for (let i = 1; i <= 4; i++) {
    assert.equal(canConnect(registry, { type: "audio" }, "out", { type: "percall" }, "ch" + i).ok, true);
    assert.equal(canConnect(registry, { type: "gate" }, "out", { type: "percall" }, "trigger" + i).ok, true);
    assert.equal(canConnect(registry, { type: "cv" }, "out", { type: "percall" }, "cv" + i).ok, true);
  }
  assert.equal(canConnect(registry, { type: "cv" }, "out", { type: "percall" }, "strength").ok, true);
});

test("Percall exposes four channel outputs and four envelope outputs", () => {
  for (let i = 1; i <= 4; i++) {
    assert.equal(canConnect(registry, { type: "percall" }, "out" + i, { type: "sink" }, "in").ok, true);
    assert.equal(canConnect(registry, { type: "percall" }, "env" + i, { type: "sink" }, "in").ok, true);
  }
});

test("Percall rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "percall" }, "ch1", { type: "audio" }, "out").code, "direction");
});
