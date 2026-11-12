const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const MoldgfModuleGraph = require("../app/src/main/assets/module_graph.js");

const html = fs.readFileSync(
  path.join(__dirname, "../app/src/main/assets/index.html"),
  "utf8"
);

test("all 42 DSP module descriptors plus Audio Out match their generated faceplate jacks", () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const uiScript = scripts.find((match) => match[2].includes("const J="));
  assert.ok(uiScript, "rack UI script must exist");
  const ui = uiScript[2];

  const helperStart = ui.indexOf("const J=");
  const rackStart = ui.indexOf("const rk=$('#rack')", ui.indexOf("const TY={"));
  assert.ok(helperStart >= 0 && rackStart > helperStart, "faceplate template section must be extractable");
  const templateContext = { window: { PLAITS_WASM: null } };
  vm.runInNewContext(
    ui.slice(helperStart, rackStart) + "\nglobalThis.__MOLDGF_TY = TY;",
    templateContext,
    { timeout: 1000 }
  );
  const templates = templateContext.__MOLDGF_TY;

  const registryStart = ui.indexOf("const PORT_REGISTRY=MoldgfModuleGraph.createRegistry()");
  const registryEnd = ui.indexOf("const LEGACY_SIGNAL_TYPES", registryStart);
  assert.ok(registryStart >= 0 && registryEnd > registryStart, "typed module registry section must be extractable");
  const registryContext = { MoldgfModuleGraph };
  vm.runInNewContext(
    ui.slice(registryStart, registryEnd) + "\nglobalThis.__MOLDGF_PORTS = PORT_REGISTRY;",
    registryContext,
    { timeout: 1000 }
  );
  const descriptors = registryContext.__MOLDGF_PORTS.list();
  assert.equal(descriptors.length, 43, "all 42 DSP types plus the internal Audio Out endpoint must be audited");

  const moduleId = "__moldgf_audit__";
  const prefix = moduleId + ".";
  for (const descriptor of descriptors) {
    const template = templates[descriptor.type];
    assert.ok(template && typeof template.html === "function",
      descriptor.type + " must have a renderable faceplate template");
    const markup = template.html(moduleId);
    const rendered = [];
    for (const tag of markup.match(/<[^>]+>/g) || []) {
      const classMatch = tag.match(/\bclass="([^"]*)"/);
      const idMatch = tag.match(/\bdata-id="([^"]*)"/);
      if (!classMatch || !idMatch) continue;
      const classes = classMatch[1].split(/\s+/);
      if (!classes.includes("jk") || !idMatch[1].startsWith(prefix)) continue;
      rendered.push({
        id: idMatch[1].slice(prefix.length),
        direction: classes.includes("o") ? "output" : "input"
      });
    }
    const audit = MoldgfModuleGraph.auditRenderedPorts(descriptor, rendered);
    assert.equal(audit.valid, true,
      descriptor.type + " faceplate/descriptor mismatch: " + JSON.stringify(audit));
  }
});
