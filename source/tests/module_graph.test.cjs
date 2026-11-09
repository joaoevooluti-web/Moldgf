const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, canConnect, validateGraph } = require("../app/src/main/assets/module_graph.js");

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
