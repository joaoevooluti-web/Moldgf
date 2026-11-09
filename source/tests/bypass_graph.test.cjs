const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect } = require("../app/src/main/assets/module_graph.js");

const ports = [
  { id: "inL", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
  { id: "inR", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
  { id: "fxL", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
  { id: "fxR", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
  { id: "launch", direction: "input", signal: "gate", channels: 1, accepts: ["gate", "cv"] },
  { id: "sendL", direction: "output", signal: "audio", channels: 1 },
  { id: "sendR", direction: "output", signal: "audio", channels: 1 },
  { id: "outL", direction: "output", signal: "audio", channels: 1 },
  { id: "outR", direction: "output", signal: "audio", channels: 1 }
];
const registry = createRegistry([
  { type: "bypass", ports },
  { type: "source", ports: [{ id: "out", direction: "output", signal: "audio", channels: 1 }] },
  { type: "gate", ports: [{ id: "out", direction: "output", signal: "gate", channels: 1 }] },
  { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

test("Molten Bypass accepts stereo audio and gate control connections", () => {
  for (const port of ["inL", "inR", "fxL", "fxR"]) {
    assert.equal(canConnect(registry, { type: "source" }, "out", { type: "bypass" }, port).ok, true);
  }
  assert.equal(canConnect(registry, { type: "gate" }, "out", { type: "bypass" }, "launch").ok, true);
});

test("Molten Bypass exposes stereo send and main output pairs", () => {
  for (const port of ["sendL", "sendR", "outL", "outR"]) {
    assert.equal(canConnect(registry, { type: "bypass" }, port, { type: "sink" }, "in").ok, true);
  }
});

test("Molten Bypass graph rejects reverse signal direction", () => {
  assert.equal(canConnect(registry, { type: "bypass" }, "inL", { type: "source" }, "out").code, "direction");
});
