const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"in1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"cv1","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"out1","direction":"output","signal":"audio","channels":1},{"id":"in2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"cv2","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"out2","direction":"output","signal":"audio","channels":1},{"id":"in3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"cv3","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"out3","direction":"output","signal":"audio","channels":1},{"id":"in4","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"cv4","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"out4","direction":"output","signal":"audio","channels":1},{"id":"in5","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"cv5","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"out5","direction":"output","signal":"audio","channels":1},{"id":"in6","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"cv6","direction":"input","signal":"cv","channels":1,"accepts":["cv","gate"]},{"id":"out6","direction":"output","signal":"audio","channels":1}];
const registry = createRegistry([
  { type: "hexmixvca", ports },
  { type: "audio", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "cv", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Hexmix VCA exposes six signal, six CV and six output ports", () => {
  for (let i = 1; i <= 6; i++) {
    assert.equal(canConnect(registry, { type: "audio" }, "out", { type: "hexmixvca" }, "in" + i).ok, true);
    assert.equal(canConnect(registry, { type: "cv" }, "out", { type: "hexmixvca" }, "cv" + i).ok, true);
    assert.equal(canConnect(registry, { type: "hexmixvca" }, "out" + i, { type: "sink" }, "in").ok, true);
  }
});

test("Hexmix VCA rejects reverse signal direction", () => {
  assert.equal(canConnect(registry, { type: "hexmixvca" }, "in1", { type: "audio" }, "out").code, "direction");
});
