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

  function moduleTypeOf(module) {
    return module && (typeof module.type === "string" ? module.type :
      (typeof module.t === "string" ? module.t : null));
  }

  function canConnect(registry, sourceModule, sourcePortId, targetModule, targetPortId) {
    const sourceType = moduleTypeOf(sourceModule);
    const targetType = moduleTypeOf(targetModule);
    const sourceDescriptor = sourceType && registry.get(sourceType);
    const targetDescriptor = targetType && registry.get(targetType);
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

  function resolveIndexedHostDependencies(modules, links) {
    const instances = Array.isArray(modules) ? modules : [];
    const byType = new Map();
    instances.forEach((module) => {
      const type = moduleTypeOf(module);
      if (!type) return;
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type).push(module);
    });
    const dependencies = [];
    (Array.isArray(links) ? links : []).forEach((link) => {
      if (!link || typeof link.sourceType !== "string" || !link.sourceType.trim() ||
          typeof link.targetType !== "string" || !link.targetType.trim() ||
          typeof link.stateKey !== "string" || !link.stateKey.trim() ||
          typeof link.kind !== "string" || !link.kind.trim()) {
        fail("host link requires sourceType, targetType, stateKey and kind");
      }
      instances.forEach((target) => {
        if (moduleTypeOf(target) !== link.targetType) return;
        const state = target && target.state && typeof target.state === "object" ? target.state :
          (target && target.s && typeof target.s === "object" ? target.s : {});
        const rawIndex = state[link.stateKey];
        const index = rawIndex === undefined || rawIndex === null ? 0 : Number(rawIndex);
        const dependency = {
          from: null, to: target.id, kind: link.kind,
          sourceType: link.sourceType, targetType: link.targetType,
          requestedIndex: rawIndex === undefined || rawIndex === null ? 0 : rawIndex
        };
        if (!Number.isInteger(index) || index < 0) {
          dependency.error = "invalid-host-index";
          dependencies.push(dependency);
          return;
        }
        if (index === 0) return;
        const source = (byType.get(link.sourceType) || [])[index - 1];
        if (!source) dependency.error = "missing-host-module";
        else dependency.from = source.id;
        dependency.requestedIndex = index;
        dependencies.push(dependency);
      });
    });
    return dependencies;
  }

  function validateGraph(registry, modules, cables, dependencies) {
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
      const type = moduleTypeOf(module);
      if (!type || !registry.has(type)) {
        errors.push({ code: "unknown-module", module: module.id, type }); return;
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
      if (feedback && !registry.get(moduleTypeOf(sourceModule)).feedbackSafe) {
        errors.push({ code: "unsafe-feedback", from, to }); return;
      }
      edges.push({ from: from.module, to: to.module, feedback });
    });

    const resolvedDependencies = [];
    const dependencyKeys = new Set();
    if (dependencies !== undefined && !Array.isArray(dependencies)) errors.push({ code: "invalid-dependencies" });
    (Array.isArray(dependencies) ? dependencies : []).forEach((dependency) => {
      if (!dependency || typeof dependency !== "object") {
        errors.push({ code: "invalid-dependency" }); return;
      }
      if (dependency.error) {
        errors.push({ code: dependency.error, from: dependency.from, to: dependency.to,
          kind: dependency.kind, sourceType: dependency.sourceType, targetType: dependency.targetType,
          requestedIndex: dependency.requestedIndex });
        return;
      }
      const from = dependency.from, to = dependency.to;
      const sourceModule = typeof from === "string" ? byId.get(from) : null;
      const targetModule = typeof to === "string" ? byId.get(to) : null;
      if (!sourceModule || !targetModule) {
        errors.push({ code: "unknown-dependency-endpoint", from, to, kind: dependency.kind }); return;
      }
      if (from === to) {
        errors.push({ code: "self-dependency", from, to, kind: dependency.kind }); return;
      }
      if (typeof dependency.kind !== "string" || !dependency.kind.trim()) {
        errors.push({ code: "invalid-dependency-kind", from, to }); return;
      }
      const sourceType = moduleTypeOf(sourceModule), targetType = moduleTypeOf(targetModule);
      if ((dependency.sourceType && dependency.sourceType !== sourceType) ||
          (dependency.targetType && dependency.targetType !== targetType)) {
        errors.push({ code: "dependency-type-mismatch", from, to, kind: dependency.kind,
          sourceType, targetType }); return;
      }
      const key = [from, to, dependency.kind].join("|");
      if (dependencyKeys.has(key)) {
        errors.push({ code: "duplicate-dependency", from, to, kind: dependency.kind }); return;
      }
      dependencyKeys.add(key);
      const resolved = { from, to, kind: dependency.kind, sourceType, targetType };
      if (Number.isInteger(dependency.requestedIndex)) resolved.requestedIndex = dependency.requestedIndex;
      resolvedDependencies.push(resolved);
      edges.push({ from, to, feedback: false, dependency: true, kind: dependency.kind });
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
    return { valid: errors.length === 0, errors, order: errors.length ? [] : order, dependencies: resolvedDependencies };
  }

  function auditRenderedPorts(descriptorInput, renderedPorts) {
    const descriptor = descriptorInput && descriptorInput.ports ? descriptorInput : normalizeDescriptor(descriptorInput);
    const rendered = Array.isArray(renderedPorts) ? renderedPorts : [];
    const expected = new Map(descriptor.ports.map((port) => [port.id, port]));
    const seen = new Set();
    const duplicates = [];
    const unregistered = [];
    const directionMismatches = [];
    rendered.forEach((port) => {
      if (!port || typeof port.id !== "string" || !port.id.trim()) return;
      if (seen.has(port.id)) duplicates.push(port.id);
      seen.add(port.id);
      const declared = expected.get(port.id);
      if (!declared) {
        if (!unregistered.includes(port.id)) unregistered.push(port.id);
      } else if (port.direction && port.direction !== declared.direction) {
        directionMismatches.push({ id: port.id, declared: declared.direction, rendered: port.direction });
      }
    });
    const missingRendered = descriptor.ports.filter((port) => !seen.has(port.id)).map((port) => port.id);
    return {
      type: descriptor.type,
      valid: duplicates.length === 0 && unregistered.length === 0 &&
        directionMismatches.length === 0 && missingRendered.length === 0,
      missingRendered,
      unregistered,
      duplicates,
      directionMismatches
    };
  }

  return Object.freeze({ createRegistry, normalizeDescriptor, canConnect, validateGraph, resolveIndexedHostDependencies, auditRenderedPorts, signals: Object.freeze(Array.from(SIGNALS)) });
});
