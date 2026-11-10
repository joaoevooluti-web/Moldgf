const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readScripts() {
  const html = fs.readFileSync(
    path.join(__dirname, "../app/src/main/assets/index.html"),
    "utf8"
  );
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const engine = scripts.find((m) => /\bid=["']eng["']/.test(m[1]));
  const ui = scripts.find((m) => /\bid=["']ui["']/.test(m[1]));
  assert.ok(engine, "shared audio engine script must exist");
  assert.ok(ui, "rack UI script must exist");
  return { engine: engine[2], ui: ui[2] };
}

test("rack inventory changes refresh the shadow topological graph plan", () => {
  const { ui } = readScripts();
  assert.match(ui, /function refreshGraphPlan\(\)[\s\S]*?MoldgfModuleGraph\.validateGraph\(PORT_REGISTRY,modules,cables\)/);
  assert.match(ui, /function idx\(\)\{idxE\(\);reg\(\);refreshGraphPlan\(\)\}/);
  assert.match(ui, /const rb=\(\)=>\{rebuild\(\);postCab\(\);refreshGraphPlan\(\);needDr=1\}/);
  assert.match(ui, /window\.MoldgfGraphPlan=\(\)=>/);
});

test("legacy jack descriptors are registered only when real jack endpoints exist", () => {
  const { ui } = readScripts();
  assert.match(ui, /if\(!ports\.length\)return;[\s\S]*?PORT_REGISTRY\.register\(\{type:module\.t,ports\}\)/);
});

test("shadow planning does not reorder the real-time sample processor", () => {
  const { engine, ui } = readScripts();
  const stepAt = engine.indexOf("function step(){");
  assert.ok(stepAt >= 0, "legacy shared DSP step must remain present");
  const stepEnd = engine.indexOf("\n", stepAt);
  const step = engine.slice(stepAt, stepEnd < 0 ? engine.length : stepEnd);
  assert.match(step, /A=byT\.atte/);
  assert.match(step, /A=byT\.out/);
  assert.doesNotMatch(step, /graphPlan|MoldgfGraphPlan/);
  assert.match(ui, /Shadow graph scheduler/);
});
