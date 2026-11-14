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
  const ui = scripts.find((m) => /\bid=["']ui["']/.test(m[1])) || scripts[scripts.length - 1];
  assert.ok(engine, "shared audio engine script must exist");
  assert.ok(ui, "rack UI script must exist");
  return { engine: engine[2], ui: ui[2] };
}

test("rack inventory changes refresh the validated topological graph plan before dispatch", () => {
  const { ui } = readScripts();
  assert.match(ui, /function\s+runtimeHostDependencies\s*\(\s*modules\s*\)\s*\{\s*return\s+MoldgfModuleGraph\s*\.\s*resolveIndexedHostDependencies\s*\(\s*modules\s*,\s*HOST_LINKS\s*\)\s*;\s*\}/);
  assert.match(ui, /function\s+refreshGraphPlan\s*\(\s*\)\s*\{[\s\S]*?MoldgfModuleGraph\s*\.\s*validateGraph\s*\(\s*PORT_REGISTRY\s*,\s*modules\s*,\s*cables\s*,\s*runtimeHostDependencies\s*\(\s*modules\s*\)\s*\)/);
  assert.match(ui, /function idx\(\)\{idxE\(\);reg\(\);refreshGraphPlan\(\);postCab\(\)\}/);
  assert.match(ui, /const rb=\(\)=>\{rebuild\(\);refreshGraphPlan\(\);postCab\(\);needDr=1\}/);
  assert.match(ui, /window\.MoldgfGraphPlan=\(\)=>/);
});

test("legacy jack descriptors are registered only when real jack endpoints exist", () => {
  const { ui } = readScripts();
  assert.match(ui, /if\(!ports\.length\)return;[\s\S]*?PORT_REGISTRY\.register\(\{type:module\.t,ports\}\)/);
});

test("active scheduler admits only verified utility/mixer adapters and keeps the legacy fallback", () => {
  const { engine, ui } = readScripts();
  const stepAt = engine.indexOf("function step(){");
  assert.ok(stepAt >= 0, "shared DSP step must remain present");
  const stepEnd = engine.indexOf("\n", stepAt);
  const step = engine.slice(stepAt, stepEnd < 0 ? engine.length : stepEnd);
  assert.match(engine, /function setGraphExecutionOrder\(order\)/);
  assert.match(engine, /function processTopologicalRack\(\)/);
  assert.match(engine, /fromIndex>=toIndex/);
  assert.match(engine, /!\['voltio','atte','dualAt','abc','axbc','bypass','mixer2','mixer','out'\]\.includes\(m\.t\)/);
  assert.match(engine, /if\(m\.t==='voltio'\)voltioF\(m\)/);
  assert.match(engine, /else if\(m\.t==='dualAt'\)dualAtenuverterF\(m\)/);
  assert.match(engine, /else if\(m\.t==='abc'\)abcF\(m\)/);
  assert.match(engine, /else if\(m\.t==='axbc'\)axbcF\(m\)/);
  assert.match(engine, /else if\(m\.t==='bypass'\)bypassF\(m\)/);
  assert.match(engine, /else if\(m\.t==='mixer'\)mixerF\(m\)/);
  assert.match(step, /graphExecutionOrder&&processTopologicalRack\(\)/);
  assert.match(step, /A=byT\.atte/);
  assert.match(step, /A=byT\.out/);
  assert.match(ui, /const ACTIVE_SCHEDULER_TYPES=new Set\(\['voltio','atte','dualAt','abc','axbc','bypass','mixer2','mixer','out'\]\)/);
  assert.match(ui, /executionMode:executionOrder\?'topological':'legacy'/);
  assert.match(ui, /fromIndex>=toIndex/);
  assert.match(ui, /function postCab\(\)\{const order=activeSchedulerOrder\(\);if\(typeof globalThis\.MoldgfSetExecutionOrder==='function'\)globalThis\.MoldgfSetExecutionOrder\(order\);post\(\{t:'cab'/);
  assert.match(ui, /setGraphExecutionOrder\(d\.order\)/);
  assert.match(ui, /setGraphExecutionOrder\(pendingGraphExecutionOrder\)/);
  assert.match(ui, /postM\(\);flush\(\);postCab\(\)/);
  assert.match(ui, /process\(i,o\)\{const L=o\[0\]\[0\],R=o\[0\]\[1\];for\(let n=0;n<L.length;n\+\+\)\{step\(\)/);
  assert.match(ui, /for\(let i=0;i<128;i\+\+\)\{step\(\)/);
});


test("runtime exposes rendered-jack audit while preserving the legacy fallback", () => {
  const { ui, engine } = readScripts();
  assert.match(ui, /window\.MoldgfJackAudit=\(\)=>/);
  assert.match(ui, /MoldgfModuleGraph\.auditRenderedPorts\(descriptor,rendered\)/);
  assert.match(ui, /document\.querySelectorAll\(/);
  assert.match(ui, /summary:\{modules:reports\.length,valid:reports\.filter\(report=>report\.valid\)\.length/);
  assert.match(engine, /function step\(\)/);
  assert.doesNotMatch(engine, /MoldgfJackAudit/);
});


test("every module bucket referenced by the shared step is declared for idxE and legacy fallback", () => {
  const { engine } = readScripts();
  const start = engine.indexOf("byT={");
  const end = engine.indexOf("},M={", start);
  const declaration = engine.slice(start, end);
  const declared = new Set([...declaration.matchAll(/([A-Za-z0-9_]+):\[\]/g)].map(match => match[1]));
  const step = engine.slice(engine.indexOf("function step(){"));
  const referenced = new Set([...step.matchAll(/A=byT\.([A-Za-z0-9_]+)/g)].map(match => match[1]));
  const missing = [...referenced].filter(type => !declared.has(type));
  assert.deepEqual(missing, []);
});
