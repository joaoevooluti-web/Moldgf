const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function scripts() {
  const html = fs.readFileSync(path.join(__dirname, "../app/src/main/assets/index.html"), "utf8");
  const all = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const engine = all.find((m) => /\bid=["']eng["']/.test(m[1]));
  const ui = all.find((m) => /\bid=["']ui["']/.test(m[1])) || all[all.length - 1];
  assert.ok(engine, "shared DSP engine script #eng must exist");
  assert.ok(ui, "WebView UI script must exist");
  return { html, engine: engine[2], ui: ui[2] };
}

test("AudioWorklet and ScriptProcessor fallback execute the same DSP step per output sample", () => {
  const { html, engine, ui } = scripts();
  const workletMatch = ui.match(/const WK=\x60([\s\S]*?)\x60;/);
  assert.ok(workletMatch, "AudioWorklet processor source must be embedded in WK");
  const worklet = workletMatch[1];

  const pumpStart = ui.indexOf("function pump(){");
  const fallbackStart = ui.indexOf("sp.onaudioprocess=e=>{");
  const fallbackEnd = ui.indexOf("sp.connect(ac.destination)", fallbackStart);
  assert.ok(pumpStart >= 0 && fallbackStart > pumpStart && fallbackEnd > fallbackStart);
  const pump = ui.slice(pumpStart, fallbackStart);
  const callback = ui.slice(fallbackStart, fallbackEnd);

  assert.equal((engine.match(/function step\(\)\{/g) || []).length, 1,
    "there must be one shared per-sample DSP step implementation");
  for (const adapter of ["dualAtenuverterF", "abcF", "axbcF", "bypassF"]) {
    assert.ok(engine.includes(adapter + "(m)"), "shared topological scheduler must dispatch " + adapter);
  }
  assert.match(engine, /if\(graphExecutionOrder&&processTopologicalRack\(\)\)/,
    "both audio paths must enter the same guarded topological scheduler through step()");
  assert.match(worklet, /process\(i,o\)\{const L=o\[0\]\[0\],R=o\[0\]\[1\];for\(let n=0;n<L\.length;n\+\+\)\{step\(\);L\[n\]=OL;R\[n\]=OR\}/,
    "Worklet must call shared step once and write left/right in order");
  assert.match(pump, /for\(let i=0;i<128;i\+\+\)\{step\(\);RL_\[wr&16383\]=OL;RR_\[wr&16383\]=OR;wr\+\+\}/,
    "fallback producer must call the same step once and write the same channel order");
  assert.match(callback, /L\[n\]=RL_\[rd&16383\];R2\[n\]=RR_\[rd&16383\];rd\+\+/,
    "ScriptProcessor callback must consume the fallback ring buffer in left/right order");
  assert.doesNotMatch(callback, /\bstep\(\)/,
    "ScriptProcessor callback must not run a second DSP engine");
  assert.match(worklet, /if\(MQ\.length\)\{this\.port\.postMessage\(\{mo:MQ\}\);MQ=\[\]\}/);
  assert.match(pump, /if\(MQ\.length\)\{midiFlat\(MQ\);MQ=\[\]\}/);
  assert.match(ui, /document\.getElementById\('eng'\)\.textContent\+'\\n'\+WK/,
    "AudioWorklet bundle must include the same shared engine script");
  assert.ok(html.includes("createScriptProcessor(512,0,2)"),
    "legacy fallback must remain available");
});

test("both real-time paths retain the same stereo output contract and silence on fallback underrun", () => {
  const { engine, ui } = scripts();
  const worklet = ui.match(/const WK=\x60([\s\S]*?)\x60;/)?.[1] || "";
  const callbackStart = ui.indexOf("sp.onaudioprocess=e=>{");
  const callbackEnd = ui.indexOf("sp.connect(ac.destination)", callbackStart);
  const callback = ui.slice(callbackStart, callbackEnd);

  assert.match(engine, /OL=|OL\s*=/);
  assert.match(engine, /OR=|OR\s*=/);
  assert.match(worklet, /const L=o\[0\]\[0\],R=o\[0\]\[1\]/);
  assert.match(callback, /getChannelData\(0\)/);
  assert.match(callback, /getChannelData\(1\)/);
  assert.match(callback, /L\[n\]=0;R2\[n\]=0;un=1/,
    "underrun must be silent rather than replaying stale ring-buffer data");
});
