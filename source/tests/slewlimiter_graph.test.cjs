const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");
const ports = [
  { id: "in", direction: "input", signal: "cv", channels: 1, accepts: ["cv", "audio"] },
  { id: "rise", direction: "input", signal: "cv", channels: 1, accepts: ["cv"] },
  { id: "fall", direction: "input", signal: "cv", channels: 1, accepts: ["cv"] },
  { id: "out", direction: "output", signal: "cv", channels: 1 }
];
const registry = createRegistry([
  { type: "slewlimiter", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "cv", channels: 1 }] }
]);

test("Slew Limiter exposes signal, rise CV and fall CV inputs", () => {
  for (const port of ["in","rise","fall"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "slewlimiter" }, port).ok, true);
  }
});

test("Slew Limiter exposes a CV output", () => {
  assert.equal(canConnect(registry, { type: "slewlimiter" }, "out", { type: "sink" }, "in").ok, true);
});

test("Slew Limiter rejects reverse cable direction", () => {
  assert.equal(canConnect(registry, { type: "slewlimiter" }, "in", { type: "source" }, "out").code, "direction");
});
