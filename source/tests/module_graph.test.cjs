const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect, validateGraph, resolveIndexedHostDependencies } = require("../app/src/main/assets/module_graph.js");

function fixture() {
  return createRegistry([
    { type: "source", ports: [{ id: "out", direction: "output", signal: "cv" }] },
    { type: "processor", ports: [
      { id: "in", direction: "input", signal: "cv" },
      { id: "out", direction: "output", signal: "cv" }
    ] },
    { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", accepts: ["audio", "cv"] }] },
    { type: "audioProcessor", ports: [
      { id: "in", direction: "input", signal: "audio" },
      { id: "out", direction: "output", signal: "audio" }
    ] },
    { type: "delay", feedbackSafe: true, ports: [
      { id: "in", direction: "input", signal: "audio" },
      { id: "out", direction: "output", signal: "audio" }
    ] }
  ]);
}

test("registry rejects duplicate module and port identifiers", () => {
  const registry = fixture();
  assert.throws(() => registry.register({ type: "source", ports: [] }), /duplicate module type/);
  assert.throws(() => registry.register({ type: "bad", ports: [
    { id: "x", direction: "input", signal: "cv" },
    { id: "x", direction: "output", signal: "cv" }
  ] }), /duplicate port/);
});

test("connection enforces output-to-input direction and signal compatibility", () => {
  const registry = fixture();
  assert.equal(canConnect(registry, { type: "source" }, "out", { type: "processor" }, "in").ok, true);
  assert.equal(canConnect(registry, { type: "processor" }, "in", { type: "sink" }, "in").code, "direction");
  assert.equal(canConnect(registry, { type: "source" }, "out", { type: "delay" }, "in").code, "signal-type");
});

test("live rack module instances using the runtime t field connect through typed jack validation", () => {
  const registry = fixture();
  const source = { id: "cv1", t: "source" };
  const processor = { id: "proc1", t: "processor" };
  const result = canConnect(registry, source, "out", processor, "in");
  assert.equal(result.ok, true);
  assert.equal(result.source.id, "out");
  assert.equal(result.target.id, "in");
});

test("connection rejects incompatible channel counts", () => {
  const registry = createRegistry([
    { type: "poly", ports: [{ id: "out", direction: "output", signal: "audio", channels: "poly" }] },
    { type: "mono", ports: [{ id: "in", direction: "input", signal: "audio", channels: 1 }] }
  ]);
  assert.equal(canConnect(registry, { type: "poly" }, "out", { type: "mono" }, "in").code, "channel-count");
});

test("graph returns a deterministic topological processing order", () => {
  const registry = fixture();
  const result = validateGraph(registry,
    [{ id: "a", type: "source" }, { id: "b", type: "processor" }, { id: "c", type: "sink" }],
    [
      { from: { module: "a", port: "out" }, to: { module: "b", port: "in" } },
      { from: { module: "b", port: "out" }, to: { module: "c", port: "in" } }
    ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.order, ["a", "b", "c"]);
});

test("graph rejects cycles unless an explicit feedback-safe edge breaks the cycle", () => {
  const registry = fixture();
  const modules = [{ id: "a", type: "processor" }, { id: "b", type: "processor" }];
  const edge = (from, to) => ({ from: { module: from, port: "out" }, to: { module: to, port: "in" } });
  assert.equal(validateGraph(registry, modules, [edge("a", "b"), edge("b", "a")]).errors[0].code,
    "cycle-without-feedback-delay");
  const delayed = validateGraph(registry,
    [{ id: "a", type: "audioProcessor" }, { id: "d", type: "delay" }],
    [
      { from: { module: "a", port: "out" }, to: { module: "d", port: "in" } },
      { from: { module: "d", port: "out" }, to: { module: "a", port: "in" }, feedback: true }
    ]);
  assert.equal(delayed.valid, true);
});

test("graph validation accepts live rack instances using the runtime t field", () => {
  const registry = fixture();
  const result = validateGraph(registry,
    [{ id: "cv1", t: "source" }, { id: "proc1", t: "processor" }],
    [{ from: { module: "cv1", port: "out" }, to: { module: "proc1", port: "in" } }]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.order, ["cv1", "proc1"]);

  const feedback = validateGraph(registry,
    [{ id: "proc", t: "audioProcessor" }, { id: "delay", t: "delay" }],
    [
      { from: { module: "proc", port: "out" }, to: { module: "delay", port: "in" } },
      { from: { module: "delay", port: "out" }, to: { module: "proc", port: "in" }, feedback: true }
    ]);
  assert.equal(feedback.valid, true);
  assert.deepEqual(feedback.order, ["proc", "delay"]);
});

test("graph reports missing endpoints, unknown modules and duplicate cables", () => {
  const registry = fixture();
  const result = validateGraph(registry,
    [{ id: "a", type: "missing" }, { id: "a", type: "source" }],
    [{ from: { module: "x", port: "out" }, to: { module: "a", port: "in" } }]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "unknown-module"));
  assert.ok(result.errors.some((error) => error.code === "duplicate-module-id"));
  assert.ok(result.errors.some((error) => error.code === "unknown-endpoint"));
  const duplicates = validateGraph(registry,
    [{ id: "s", type: "source" }, { id: "p", type: "processor" }],
    [
      { from: { module: "s", port: "out" }, to: { module: "p", port: "in" } },
      { from: { module: "s", port: "out" }, to: { module: "p", port: "in" } }
    ]);
  assert.ok(duplicates.errors.some((error) => error.code === "duplicate-cable"));
});

test("BF-22 runtime jack IDs match the typed graph descriptor used by manual patching", () => {
  const registry = createRegistry([
    { type: "source", ports: [{ id: "out", direction: "output", signal: "cv" }] },
    { type: "bf22",
    ports: [
      { id: "in", direction: "input", signal: "audio", accepts: ["audio", "cv"] },
      { id: "cv1", direction: "input", signal: "cv" },
      { id: "cv2", direction: "input", signal: "cv" },
      { id: "resCV", direction: "input", signal: "cv" },
      { id: "out", direction: "output", signal: "audio" }
    ] },
    { type: "sink", ports: [{ id: "in", direction: "input", signal: "audio", accepts: ["audio", "cv"] }] }
  ]);
  const module = { id: "bf22-1", t: "bf22" };
  for (const port of ["cv1", "cv2", "resCV"]) {
    assert.equal(canConnect(registry, { id: "source", t: "source" }, "out",
      { id: module.id, t: module.t }, port).ok, true);
  }
  assert.equal(canConnect(registry, module, "out",
    { id: "sink", t: "sink" }, "in").ok, true);
});


test("rendered jack audit reports missing, unregistered, duplicate and wrong-direction ports", () => {
  const { auditRenderedPorts } = require("../app/src/main/assets/module_graph.js");
  const descriptor = { type: "fixture", ports: [
    { id: "in", direction: "input", signal: "cv" },
    { id: "out", direction: "output", signal: "cv" },
    { id: "gate", direction: "input", signal: "gate" }
  ] };
  const result = auditRenderedPorts(descriptor, [
    { id: "in", direction: "output" },
    { id: "out", direction: "output" },
    { id: "extra", direction: "input" },
    { id: "extra", direction: "input" }
  ]);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missingRendered, ["gate"]);
  assert.deepEqual(result.unregistered, ["extra"]);
  assert.deepEqual(result.duplicates, ["extra"]);
  assert.deepEqual(result.directionMismatches, [{ id: "in", declared: "input", rendered: "output" }]);
});

test("rendered jack audit accepts matching descriptor and faceplate endpoints", () => {
  const { auditRenderedPorts } = require("../app/src/main/assets/module_graph.js");
  const result = auditRenderedPorts({ type: "fixture", ports: [
    { id: "audioIn", direction: "input", signal: "audio" },
    { id: "cvOut", direction: "output", signal: "cv" }
  ] }, [
    { id: "audioIn", direction: "input" },
    { id: "cvOut", direction: "output" }
  ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missingRendered, []);
  assert.deepEqual(result.unregistered, []);
});


test("indexed rear-panel hosts become deterministic topological dependencies", () => {
  const registry = createRegistry([
    { type: "hexmix", ports: [] },
    { type: "hexmixvca", ports: [] },
    { type: "stmix", ports: [] },
    { type: "hexpander", ports: [] }
  ]);
  const modules = [
    { id: "hexmix1", t: "hexmix", s: { vcaHost: 1, stmixHost: 1 } },
    { id: "stmix1", t: "stmix", s: {} },
    { id: "vca1", t: "hexmixvca", s: {} },
    { id: "hexpander1", t: "hexpander", s: { hexmixHost: 1 } }
  ];
  const dependencies = resolveIndexedHostDependencies(modules, [
    { sourceType: "hexmixvca", targetType: "hexmix", stateKey: "vcaHost", kind: "hexmix-vca-expansion" },
    { sourceType: "stmix", targetType: "hexmix", stateKey: "stmixHost", kind: "stmix-rear-expansion" },
    { sourceType: "hexmix", targetType: "hexpander", stateKey: "hexmixHost", kind: "hexpander-host" }
  ]);
  assert.deepEqual(dependencies.map(({ from, to, kind }) => [from, to, kind]), [
    ["vca1", "hexmix1", "hexmix-vca-expansion"],
    ["stmix1", "hexmix1", "stmix-rear-expansion"],
    ["hexmix1", "hexpander1", "hexpander-host"]
  ]);
  const result = validateGraph(registry, modules, [], dependencies);
  assert.equal(result.valid, true);
  assert.deepEqual(result.order, ["stmix1", "vca1", "hexmix1", "hexpander1"]);
  assert.equal(result.dependencies.length, 3);
});

test("an unavailable selected rear-panel host invalidates the execution plan", () => {
  const registry = createRegistry([
    { type: "hexmix", ports: [] },
    { type: "stmix", ports: [] }
  ]);
  const modules = [
    { id: "hexmix1", t: "hexmix", s: { stmixHost: 2 } },
    { id: "stmix1", t: "stmix", s: {} }
  ];
  const dependencies = resolveIndexedHostDependencies(modules, [
    { sourceType: "stmix", targetType: "hexmix", stateKey: "stmixHost", kind: "stmix-rear-expansion" }
  ]);
  const result = validateGraph(registry, modules, [], dependencies);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === "missing-host-module" && error.requestedIndex === 2));
});

test("host dependencies participate in cycle and duplicate-edge validation", () => {
  const registry = createRegistry([
    { type: "host", ports: [{ id: "in", direction: "input", signal: "cv" }] },
    { type: "expander", ports: [
      { id: "in", direction: "input", signal: "cv" },
      { id: "out", direction: "output", signal: "cv" }
    ] }
  ]);
  const modules = [
    { id: "host1", t: "host" },
    { id: "expander1", t: "expander", s: { host: 1 } }
  ];
  const link = { sourceType: "host", targetType: "expander", stateKey: "host", kind: "internal-host" };
  const dependencies = resolveIndexedHostDependencies(modules, [link]);
  const cycle = validateGraph(registry, modules, [
    { from: { module: "expander1", port: "out" }, to: { module: "host1", port: "in" } }
  ], dependencies);
  assert.ok(cycle.errors.some(error => error.code === "cycle-without-feedback-delay"));
  const duplicate = validateGraph(registry, modules, [], dependencies.concat(dependencies));
  assert.ok(duplicate.errors.some(error => error.code === "duplicate-dependency"));
});
