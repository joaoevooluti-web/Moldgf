const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect, validateGraph } = require("../app/src/main/assets/module_graph.js");

const joystick = {
  type: "joystick",
  ports: [
    { id: "xIn", direction: "input", signal: "cv" },
    { id: "yIn", direction: "input", signal: "cv" },
    { id: "x", direction: "output", signal: "cv" },
    { id: "y", direction: "output", signal: "cv" },
    { id: "gateX", direction: "output", signal: "gate" },
    { id: "gateY", direction: "output", signal: "gate" }
  ]
};
const source = { type: "cvSource", ports: [{ id: "out", direction: "output", signal: "cv" }] };
const cvSink = { type: "cvSink", ports: [{ id: "in", direction: "input", signal: "cv" }] };
const gateSink = { type: "gateSink", ports: [{ id: "in", direction: "input", signal: "gate" }] };

test("Joystick accepts CV on both independent axis inputs", () => {
  const registry = createRegistry([source, joystick]);
  for (const port of ["xIn", "yIn"]) {
    assert.equal(canConnect(registry, { type: "cvSource" }, "out", { type: "joystick" }, port).ok, true);
  }
});

test("Joystick exposes two bipolar CV outputs and two gate outputs with strict signal types", () => {
  const registry = createRegistry([joystick, cvSink, gateSink]);
  for (const port of ["x", "y"]) {
    assert.equal(canConnect(registry, { type: "joystick" }, port, { type: "cvSink" }, "in").ok, true);
    assert.equal(canConnect(registry, { type: "joystick" }, port, { type: "gateSink" }, "in").code, "signal-type");
  }
  for (const port of ["gateX", "gateY"]) {
    assert.equal(canConnect(registry, { type: "joystick" }, port, { type: "gateSink" }, "in").ok, true);
    assert.equal(canConnect(registry, { type: "joystick" }, port, { type: "cvSink" }, "in").code, "signal-type");
  }
});

test("manual rack cable endpoints for Joystick validate and preserve processing order", () => {
  const registry = createRegistry([source, joystick, cvSink]);
  const modules = [
    { id: "cv1", t: "cvSource" },
    { id: "joy1", t: "joystick" },
    { id: "sink1", t: "cvSink" }
  ];
  const cables = [
    { from: { module: "cv1", port: "out" }, to: { module: "joy1", port: "xIn" } },
    { from: { module: "joy1", port: "x" }, to: { module: "sink1", port: "in" } }
  ];
  const result = validateGraph(registry, modules, cables);
  assert.equal(result.valid, true);
  assert.deepEqual(result.order, ["cv1", "joy1", "sink1"]);
});
