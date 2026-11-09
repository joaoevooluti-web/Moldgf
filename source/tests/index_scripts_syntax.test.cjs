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
    "chopping_kinky_dsp.js",
    "even_vco_dsp.js",
    "rampage_dsp.js",
    "spring_reverb_dsp.js",
    "kickall_dsp.js",
    "noise_plethora_dsp.js",
    "muxlicer_dsp.js"
  ]) {
    assert.ok(html.includes('src="' + asset + '"'), "missing page asset " + asset);
    assert.ok(html.includes("'" + asset + "'"), "missing worklet bundle asset " + asset);
  }
  for (const type of ["atte", "dualAt", "voltio", "abc", "axbc", "bypass", "mixer2", "mixer", "stmix", "morphader", "hexmixvca", "motionmtr", "slewlimiter", "slew", "ponyVco", "adsr", "percall", "mudi", "burst", "samplingModulator", "choppingKinky", "evenVco", "rampage", "springReverb", "kickall", "noisePlethora", "muxlicer"]) {
    assert.ok(html.includes("type:'" + type + "'"), "missing graph descriptor " + type);
  }
});

test("DSP assets and graph descriptors are unique across the complete port set", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const pageAssets = [...html.matchAll(/<script src="([^"]+_dsp\.js)"><\/script>/g)].map((match) => match[1]);
  const descriptors = [...html.matchAll(/PORT_REGISTRY\.register\(\{type:'([^']+)'/g)].map((match) => match[1]);
  assert.equal(pageAssets.length, 27, "expected 27 module DSP assets in the page");
  assert.equal(new Set(pageAssets).size, 27, "DSP page assets must be unique");
  assert.equal(descriptors.length, 27, "expected 27 explicit graph descriptors");
  assert.equal(new Set(descriptors).size, 27, "graph descriptor types must be unique");
});


test("hardware-faithful panels expose the correct Atte, A*B+C and Voltio controls", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const atte = html.slice(html.indexOf("atte:{n:"), html.indexOf("dualAt:{n:"));
  const currentAbc = html.slice(html.indexOf("axbc:{n:"), html.indexOf("abc:{n:"));
  const legacyAbc = html.slice(html.indexOf("abc:{n:"), html.indexOf("bypass:{n:"));
  const voltio = html.slice(html.indexOf("voltio:{n:"), html.indexOf("axbc:{n:"));
  assert.match(atte, /ATTE/);
  assert.match(atte, /CASCADED INPUTS/);
  assert.match(atte, /\+10 V NORMAL/);
  assert.match(atte, /POLARITY',\['−','\+'\]/);
  assert.doesNotMatch(atte, /normalledVoltage/);
  assert.match(currentAbc, /CURRENT REVISION/);
  assert.match(currentAbc, /CHANNEL /);
  assert.match(currentAbc, /MULT · A1/);
  assert.match(currentAbc, /B AND C INPUTS NORMALLED TO \+5 V/);
  assert.match(legacyAbc, /C NORMALLED \+10 V/);
  assert.match(legacyAbc, /OUT1 → OUT2 MIX/);
  assert.match(legacyAbc, /B'\+ch\+' ATTENUVERTER/);
  assert.match(voltio, /SK\('octave'/);
  assert.match(voltio, /SK\('semitone'/);
  assert.match(voltio, /SUM IN/);
  assert.match(voltio, /DMM TEST/);
});

test("five-module Befaco batch exposes dedicated hardware-inspired panels and live controls",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const rampage=html.slice(html.indexOf("rampage:{n:"),html.indexOf("springReverb:{n:"));
  const spring=html.slice(html.indexOf("springReverb:{n:"),html.indexOf("kickall:{n:"));
  const kickall=html.slice(html.indexOf("kickall:{n:"),html.indexOf("noisePlethora:{n:"));
  const noise=html.slice(html.indexOf("noisePlethora:{n:"),html.indexOf("muxlicer:{n:"));
  const mux=html.slice(html.indexOf("muxlicer:{n:"),html.indexOf("mid:{n:"));
  assert.match(rampage,/RISE \/ FALL|RISE \/ FALL INTEGRATOR|RISE \/ FALL INTEGRATORS/);
  assert.match(rampage,/TRIG/);assert.match(rampage,/EOC/);assert.match(rampage,/BALANCE/);
  assert.match(spring,/SPRING REVERB/);assert.match(spring,/WET/);assert.match(spring,/DRY \/ WET/);assert.match(spring,/HPF/);
  assert.match(kickall,/KICKALL/);assert.match(kickall,/SHAPE/);assert.match(kickall,/TUNE CV/);assert.match(kickall,/DECAY/);
  assert.match(noise,/NOISE PLETHORA/);assert.match(noise,/GENERATOR C/);assert.match(noise,/GRITTY/);assert.match(noise,/FILTERED/);
  assert.match(mux,/MUXLICER/);assert.match(mux,/mux-in-group/);assert.match(mux,/mux-out-group/);assert.match(mux,/ALL GATES/);assert.match(mux,/TAP TEMPO/);
});
