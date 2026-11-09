const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"cv1","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"a1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"b1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"out1","direction":"output","signal":"audio","channels":1},{"id":"cv2","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"a2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"b2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"out2","direction":"output","signal":"audio","channels":1},{"id":"cv3","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"a3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"b3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"out3","direction":"output","signal":"audio","channels":1},{"id":"cv4","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"a4","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"b4","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"out4","direction":"output","signal":"audio","channels":1}];
const registry = createRegistry([
  { type: "morphader", ports },
  { type: "audio", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "cv", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Morphader exposes four A/B signal pairs and four CV controls", () => {
  for (let i = 1; i <= 4; i++) {
    assert.equal(canConnect(registry, { type: "audio" }, "out", { type: "morphader" }, "a" + i).ok, true);
    assert.equal(canConnect(registry, { type: "audio" }, "out", { type: "morphader" }, "b" + i).ok, true);
    assert.equal(canConnect(registry, { type: "cv" }, "out", { type: "morphader" }, "cv" + i).ok, true);
    assert.equal(canConnect(registry, { type: "morphader" }, "out" + i, { type: "sink" }, "in").ok, true);
  }
});

test("Morphader rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "morphader" }, "a1", { type: "audio" }, "out").code, "direction");
});
