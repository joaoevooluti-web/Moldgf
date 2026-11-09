const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [{"id":"left1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"right1","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"left2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"right2","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"left3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"right3","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"left4","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"right4","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"auxL","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"auxR","direction":"input","signal":"audio","channels":1,"accepts":["audio","cv"]},{"id":"outL","direction":"output","signal":"audio","channels":1},{"id":"outR","direction":"output","signal":"audio","channels":1}];
const registry = createRegistry([
  { type: "stmix", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("STMix exposes four stereo channels and a stereo auxiliary input", () => {
  for (const port of ["left1","right1","left2","right2","left3","right3","left4","right4","auxL","auxR"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "stmix" }, port).ok, true);
  }
});

test("STMix exposes independent left and right outputs", () => {
  assert.equal(canConnect(registry, { type: "stmix" }, "outL", { type: "sink" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "stmix" }, "outR", { type: "sink" }, "in").ok, true);
});

test("STMix rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "stmix" }, "left1", { type: "source" }, "out").code, "direction");
});
