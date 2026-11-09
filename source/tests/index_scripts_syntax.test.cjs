const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("all inline rack scripts parse before they are shipped to WebView or AudioWorklet", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[1]) && match[2].trim().length > 0);
  assert.ok(scripts.length >= 2, "expected the shared engine and UI scripts");
  scripts.forEach((match, index) => {
    assert.doesNotThrow(() => new vm.Script(match[2], { filename: "index.html:inline-script-" + index }),
      "inline script " + index + " must be valid JavaScript");
  });
});

test("the five-module batch ships every DSP asset and registers each module type", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const asset of [
    "atte_dsp.js",
    "dual_atenuverter_dsp.js",
    "voltio_dsp.js",
    "abc_dsp.js",
    "axbc_dsp.js",
    "bypass_dsp.js"
  ]) {
    assert.ok(html.includes('src="' + asset + '"'), "missing page asset " + asset);
    assert.ok(html.includes("'" + asset + "'"), "missing worklet bundle asset " + asset);
  }
  for (const type of ["atte", "dualAt", "voltio", "abc", "axbc", "bypass"]) {
    assert.ok(html.includes("type:'" + type + "'"), "missing graph descriptor " + type);
  }
});
