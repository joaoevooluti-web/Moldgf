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

test("all integrated modules ship their DSP assets and graph registrations", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const asset of [
    "atte_dsp.js",
    "dual_atenuverter_dsp.js",
    "voltio_dsp.js",
    "abc_dsp.js",
    "axbc_dsp.js",
    "bypass_dsp.js",
    "mixer2_dsp.js",
    "mixer_dsp.js",
    "stmix_dsp.js",
    "morphader_dsp.js",
    "hexmixvca_dsp.js",
    "motionmtr_dsp.js",
    "slewlimiter_dsp.js",
    "slew_dsp.js",
    "pony_vco_dsp.js",
    "adsr_dsp.js",
    "percall_dsp.js",
    "mudi_dsp.js",
    "burst_dsp.js",
    "sampling_modulator_dsp.js",
    "chopping_kinky_dsp.js"
  ]) {
    assert.ok(html.includes('src="' + asset + '"'), "missing page asset " + asset);
    assert.ok(html.includes("'" + asset + "'"), "missing worklet bundle asset " + asset);
  }
  for (const type of ["atte", "dualAt", "voltio", "abc", "axbc", "bypass", "mixer2", "mixer", "stmix", "morphader", "hexmixvca", "motionmtr", "slewlimiter", "slew", "ponyVco", "adsr", "percall", "mudi", "burst", "samplingModulator", "choppingKinky"]) {
    assert.ok(html.includes("type:'" + type + "'"), "missing graph descriptor " + type);
  }
});
