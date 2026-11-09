(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfModuleGraph = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SIGNALS = new Set(["audio", "cv", "gate", "trigger", "clock", "midi"]);

  function fail(message) { throw new TypeError(message); }

  function normalizeDescriptor(input) {
    if (!input || typeof input !== "object") fail("descriptor must be an object");
    if (typeof input.type !== "string" || !input.type.trim()) fail("descriptor.type is required");
    const ports = Array.isArray(input.ports) ? input.ports : [];
    const seen = new Set();
    const normalizedPorts = ports.map((port) => {
      if (!port || typeof port.id !== "string" || !port.id.trim()) fail(input.type + ": port.id is required");
      if (seen.has(port.id)) fail(input.type + ": duplicate port " + port.id);
      seen.add(port.id);
      if (port.direction !== "input" && port.direction !== "output") fail(input.type + ": invalid direction for " + port.id);
      if (!SIGNALS.has(port.signal)) fail(input.type + ": unsupported signal for " + port.id);
      const channels = port.channels === undefined ? 1 : port.channels;
      if (channels !== "poly" && (!Number.isInteger(channels) || channels < 1)) fail(input.type + ": invalid channel count for " + port.id);
      const accepts = port.accepts === undefined ? [port.signal] : port.accepts.slice();
      if (!accepts.length || accepts.some((signal) => !SIGNALS.has(signal))) fail(input.type + ": invalid accepts list for " + port.id);
      return Object.freeze({ id: port.id, direction: port.direction, signal: port.signal, channels, accepts: Object.freeze(accepts) });
    });
    return Object.freeze({
      type: input.type,
      version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
      feedbackSafe: input.feedbackSafe === true,
      ports: Object.freeze(normalizedPorts)
    });
  }

  function createRegistry(initialDescriptors) {
    const descriptors = new Map();
    function register(input) {
      const descriptor = normalizeDescriptor(input);
      if (descriptors.has(descriptor.type)) fail("duplicate module type " + descriptor.type);
      descriptors.set(descriptor.type, descriptor);
      return descriptor;
    }
    (initialDescriptors || []).forEach(register);
    return Object.freeze({
      register,
      get: (type) => descriptors.get(type) || null,
      has: (type) => descriptors.has(type),
      list: () => Array.from(descriptors.values())
    });
  }

  function portOf(descriptor, id) {
    return descriptor.ports.find((port) => port.id === id) || null;
  }

  function canConnect(registry, sourceModule, sourcePortId, targetModule, targetPortId) {
    const sourceDescriptor = registry.get(sourceModule.type);
    const targetDescriptor = registry.get(targetModule.type);
    if (!sourceDescriptor || !targetDescriptor) return { ok: false, code: "unknown-module" };
    const source = portOf(sourceDescriptor, sourcePortId);
    const target = portOf(targetDescriptor, targetPortId);
    if (!source || !target) return { ok: false, code: "unknown-port" };
    if (source.direction !== "output" || target.direction !== "input") return { ok: false, code: "direction" };
    if (!target.accepts.includes(source.signal)) return { ok: false, code: "signal-type" };
    if (target.channels !== "poly" && source.channels !== "poly" && source.channels > target.channels) {
      return { ok: false, code: "channel-count" };
    }
    if (target.channels !== "poly" && source.channels === "poly") return { ok: false, code: "channel-count" };
    return { ok: true, source, target };
  }

  function validateGraph(registry, modules, cables) {
    const errors = [];
    const byId = new Map();
    const seenIds = new Set();
    (modules || []).forEach((module) => {
      if (!module || typeof module.id !== "string" || !module.id.trim()) {
        errors.push({ code: "invalid-module-id" }); return;
      }
      if (seenIds.has(module.id)) {
        errors.push({ code: "duplicate-module-id", module: module.id }); return;
      }
      seenIds.add(module.id);
      if (!registry.has(module.type)) {
        errors.push({ code: "unknown-module", module: module.id, type: module.type }); return;
      }
      byId.set(module.id, module);
    });

    const edges = [];
    const edgeKeys = new Set();
    (cables || []).forEach((cable) => {
      const from = cable && cable.from, to = cable && cable.to;
      const sourceModule = from && byId.get(from.module);
      const targetModule = to && byId.get(to.module);
      if (!sourceModule || !targetModule) {
        errors.push({ code: "unknown-endpoint" }); return;
      }
      const result = canConnect(registry, sourceModule, from.port, targetModule, to.port);
      if (!result.ok) {
        errors.push({ code: result.code, from, to }); return;
      }
      const key = [from.module, from.port, to.module, to.port].join("|");
      if (edgeKeys.has(key)) {
        errors.push({ code: "duplicate-cable", from, to }); return;
      }
      edgeKeys.add(key);
      const feedback = cable.feedback === true;
      if (feedback && !registry.get(sourceModule.type).feedbackSafe) {
        errors.push({ code: "unsafe-feedback", from, to }); return;
      }
      edges.push({ from: from.module, to: to.module, feedback });
    });

    const indegree = new Map(Array.from(byId.keys(), (id) => [id, 0]));
    const outgoing = new Map(Array.from(byId.keys(), (id) => [id, []]));
    edges.forEach((edge) => {
      if (edge.feedback) return;
      outgoing.get(edge.from).push(edge.to);
      indegree.set(edge.to, indegree.get(edge.to) + 1);
    });
    const ready = Array.from(indegree).filter((entry) => entry[1] === 0).map((entry) => entry[0]);
    const order = [];
    while (ready.length) {
      const id = ready.shift();
      order.push(id);
      outgoing.get(id).forEach((next) => {
        indegree.set(next, indegree.get(next) - 1);
        if (indegree.get(next) === 0) ready.push(next);
      });
    }
    if (order.length !== byId.size) errors.push({ code: "cycle-without-feedback-delay" });
    return { valid: errors.length === 0, errors, order: errors.length ? [] : order };
  }

  return Object.freeze({ createRegistry, normalizeDescriptor, canConnect, validateGraph, signals: Object.freeze(Array.from(SIGNALS)) });
});
