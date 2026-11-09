const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect, validateGraph, signals } =
  require("../app/src/main/assets/module_graph.js");
const Atte = require("../app/src/main/assets/atte_dsp.js");
const Mixer = require("../app/src/main/assets/mixer_dsp.js");

const registry = () => createRegistry([
  { type: "cvSource", ports: [{ id: "out", direction: "output", signal: "cv", channels: 1 }] },
  { type: "atte", ports: [
    { id: "inA", direction: "input", signal: "cv", channels: 1, accepts: signals },
    { id: "a", direction: "output", signal: "cv", channels: 1 }
  ] },
  { type: "mixer", ports: [
    { id: "ch1", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
    { id: "ch2", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
    { id: "ch3", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
    { id: "ch4", direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] },
    { id: "main", direction: "output", signal: "audio", channels: 1 },
    { id: "inverted", direction: "output", signal: "audio", channels: 1 }
  ] },
  { type: "audioSink", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
]);

const cable = (from, fromPort, to, toPort) => ({
  from: { module: from, port: fromPort },
  to: { module: to, port: toPort }
});

test("CV source -> Atte -> audio mixer -> output is a valid deterministic graph", () => {
  const r = registry();
  const modules = [
    { id: "cv", type: "cvSource" },
    { id: "atten", type: "atte" },
    { id: "mix", type: "mixer" },
    { id: "out", type: "audioSink" }
  ];
  const cables = [
    cable("cv", "out", "atten", "inA"),
    cable("atten", "a", "mix", "ch1"),
    cable("mix", "main", "out", "in")
  ];
  const graph = validateGraph(r, modules, cables);

  assert.equal(graph.valid, true);
  assert.deepEqual(graph.order, ["cv", "atten", "mix", "out"]);
  assert.equal(canConnect(r, { type: "cvSource" }, "out", { type: "atte" }, "inA").ok, true);
  assert.equal(canConnect(r, { type: "atte" }, "a", { type: "mixer" }, "ch1").ok, true);
});

test("the routed DSP produces the expected voltage and complementary mixer outputs", () => {
  const sourceVoltage = 5;
  const attenuated = Atte.applyGain(sourceVoltage, 0.5, true);
  const [main, inverted] = Mixer.process([attenuated, 0, 0, 0], [0.5, 1, 1, 1]);

  assert.equal(attenuated, 2.5);
  assert.equal(main, 1.25);
  assert.equal(inverted, -1.25);
});

test("Atte +10 V normaling is deterministic and an explicit cable overrides it", () => {
  const normalled = Atte.normalledVoltage(2);
  assert.equal(Atte.resolveInput(null, normalled), 10);
  assert.equal(Atte.applyGain(Atte.resolveInput(null, normalled), 0.5, true), 5);
  assert.equal(Atte.resolveInput(3.25, normalled), 3.25);
});

test("routing rejects reversed and incompatible signal endpoints", () => {
  const r = registry();
  assert.equal(canConnect(r, { type: "atte" }, "a", { type: "cvSource" }, "out").code, "direction");
  assert.equal(canConnect(r, { type: "cvSource" }, "out", { type: "audioSink" }, "in").code, "signal-type");
});
