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
    "muxlicer_dsp.js",
    "random8_dsp.js",
    "mex_dsp.js",
    "octaves_dsp.js",
    "iroi_dsp.js",
    "bandit_dsp.js",
    "hexmix_dsp.js",
    "hexpander_dsp.js",
    "pony_vcf_dsp.js",
    "stereo_strip_dsp.js",
    "crush_delay_v3_dsp.js",
    "bf22_dsp.js",
    "midi_thing_v2_dsp.js"
  ]) {
    assert.ok(html.includes('src="' + asset + '"'), "missing page asset " + asset);
    assert.ok(html.includes("'" + asset + "'"), "missing worklet bundle asset " + asset);
  }
  for (const type of ["atte", "dualAt", "voltio", "abc", "axbc", "bypass", "mixer2", "mixer", "stmix", "morphader", "hexmixvca", "motionmtr", "slewlimiter", "slew", "ponyVco", "adsr", "percall", "mudi", "burst", "samplingModulator", "choppingKinky", "evenVco", "rampage", "springReverb", "kickall", "noisePlethora", "muxlicer", "random8", "mex", "octaves", "iroi", "bandit", "hexmix", "hexpander", "ponyVcf", "stereoStrip", "midiThingV2", "bf22", "crushDelayV3"]) {
    assert.ok(html.includes("type:'" + type + "'"), "missing graph descriptor " + type);
  }
});

test("DSP assets and graph descriptors are unique across the complete port set", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const pageAssets = [...html.matchAll(/<script src="([^"]+_dsp\.js)"><\/script>/g)].map((match) => match[1]);
  const descriptors = [...html.matchAll(/PORT_REGISTRY\.register\(\{type:'([^']+)'/g)].map((match) => match[1]);
  assert.equal(pageAssets.length, 39, "expected 39 module DSP assets in the page");
  assert.equal(new Set(pageAssets).size, 39, "DSP page assets must be unique");
  assert.equal(descriptors.length, 39, "expected 39 explicit graph descriptors");
  assert.equal(new Set(descriptors).size, 39, "graph descriptor types must be unique");
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

test("Muxlicer engine preserves zero-based state while displaying one-based steps",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  assert.ok(html.includes("m.r.displayStep=o.step"));
  assert.ok(!html.includes("m.r.step=o.step"));
  assert.ok(html.includes("m.r.step===n-1"));
  assert.ok(html.includes("STEP '+((m.r.step||0)+1)"));
});

test("Random8 panel exposes eight hardware-style channels and the documented menu functions",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("random8:{n:"),html.indexOf("atte:{n:"));
  assert.match(panel,/RANDOM8/);
  assert.match(panel,/8 HP/);
  assert.match(panel,/trigger/);
  assert.match(panel,/CV OUT/);
  assert.match(panel,/LOOP LENGTH/);
  assert.match(panel,/PROBABILITY/);
  assert.match(panel,/TRIGGER DIV/);
  assert.match(panel,/SLIDE/);
  assert.match(panel,/QUANTIZER/);
  assert.match(panel,/RANDOM TYPE/);
  assert.match(panel,/data-a="random8-mode"/);
  assert.match(panel,/data-a="random8-edit"/);
  assert.match(panel,/data-r8-setting="scale"/);
  assert.match(panel,/data-r8-setting="distribution"/);
});

test("MEX panel exposes the eight three-position gate switches and Muxlicer host link",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("mex:{n:"),html.indexOf("random8:{n:"));
  assert.match(panel,/MEX/);
  assert.match(panel,/8 STEP GATE EXPANDER/);
  assert.match(panel,/MUXLICER HOST/);
  assert.match(panel,/PASS IN/);
  assert.match(panel,/NO GATES/);
  assert.match(panel,/ALL GATES/);
  assert.match(panel,/GATE IN/);
  assert.match(panel,/GATE OUT/);
  assert.match(html,/byT\.muxlicer\[\(P\.host\|0\)-1\]/);
  assert.match(html,/gateInput===null\?clock:gateInput/);
});

test("Octaves VCO panel exposes six octave VCAs, CV jacks and cascade mix outputs",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("octaves:{n:"),html.indexOf("mex:{n:"));
  assert.match(panel,/OCTAVES VCO/);
  assert.match(panel,/12 HP/);
  assert.match(panel,/TUNE RANGE/);
  assert.match(panel,/BASE OCTAVE/);
  assert.match(panel,/PULSE WIDTH/);
  assert.match(panel,/HARD SYNC/);
  assert.match(panel,/PITCH CV 1/);
  assert.match(panel,/LEVEL CV/);
  assert.match(panel,/CASCADED MULTI-MIX OUTPUTS/);
  assert.match(html,/MoldgfOctavesDSP\.process/);
  assert.match(html,/SU\[K\(m,'out6'\)\]/);
});

test("IROI panel exposes the stereo FX chain, CV mapping, modulation and randomizer controls",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("iroi:{n:"),html.indexOf("octaves:{n:"));
  for(const label of ["IROI","18 HP","INPUT L","INPUT R","OUTPUT L","OUTPUT R","FILTER MODE","FILTER POSITION","RESONATOR","2 TAP PING PONG","AMBIENCE","MODULATION & MAPPING","MAP","SHIFT","RANDOMIZE","UNDO","REDO","RESONATOR DISSONANCE"])assert.ok(panel.includes(label),"missing IROI control "+label);
  assert.match(html,/MoldgfIroiDSP\.process/);
  assert.match(html,/randomUndo/);
  assert.match(html,/randomRedo/);
  assert.match(html,/m\.s\.mapMode=!m\.s\.mapMode/);
});

test("Bandit panel exposes four hardware bands, individual inserts, CV faders and limited mix",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("bandit:{n:"),html.indexOf("iroi:{n:"));
  for(const label of ["BANDIT","8 HP","ALL AUDIO IN","ALL CV IN","LOW 300 Hz","MID LOW 700 Hz","MID HIGH 1.5 kHz","HIGH 5 kHz","BAND IN","LEVEL CV","BAND OUT","RETURN","MIX OUT"])assert.ok(panel.includes(label),"missing Bandit control "+label);
  assert.match(html,/MoldgfBanditDSP\.process/);
  assert.match(html,/SU\[K\(m,'bandOut1'\)\]/);
  assert.match(html,/V\[K\(m,'mixOut'\)\]=o\.mixOut/);
});

test("Hexmix panel exposes six channel strips, VCA host normalization and stereo master",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("hexmix:{n:"),html.indexOf("bandit:{n:"));
  for(const label of ["HEXMIX","28 HP","VCA EXPANDER","length:6","CH ","HIGH","MID","LOW","PAN","VOLUME","MASTER LEVEL","MODULAR","LINE","LEFT OUT","RIGHT OUT"])assert.ok(panel.includes(label),"missing Hexmix control "+label);
  assert.match(html,/\['ON','MUTE','MOM'\]/);
  assert.match(html,/MoldgfHexmixDSP\.process/);
  assert.match(html,/byT\.hexmixvca/);
  assert.match(html,/A=byT\.hexmix;for/);
});

test("Hexpander panel exposes three pre/post aux buses, stereo returns, PFL and direct outs",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("hexpander:{n:"),html.indexOf("hexmix:{n:"));
  for(const label of ["HEXPANDER","28 HP","HEXMIX HOST","AUX 1","AUX 2","AUX 3","PRE OUT","POST OUT","STEREO RETURN","RETURN L","RETURN R","PFL","DIRECT OUT","BALANCED L","BALANCED R","HEADPHONE L","HEADPHONE R"])assert.ok(panel.includes(label),"missing Hexpander control "+label);
  assert.match(html,/MoldgfHexpanderDSP\.process/);
  assert.match(html,/byT\.hexmix/);
  assert.match(html,/A=byT\.hexpander;for/);
});

test("Pony VCF panel exposes the four-pole filter, three-input mixer and CV1/VCA routing",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("ponyVcf:{n:"),html.indexOf("hexpander:{n:"));
  for(const label of ["PONY VCF","6 HP","CUT-OFF","RESONANCE","CV1 ATT","FILTER INPUT","length:3","CV1","CV2","RES CV","VOLUME CV","CV1 MODE","10V NORMAL","CV1 TO VCA","AUDIO OUT","IN3 NORMALLED FROM OUT"])assert.ok(panel.includes(label),"missing Pony VCF control "+label);
  assert.match(html,/MoldgfPonyVCFDSP\.process/);
  assert.match(html,/A=byT\.ponyVcf;for/);
});

test("Stereo Strip panel exposes mono/stereo I/O, 3-band EQ, pan/VCA CV and level switches",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("stereoStrip:{n:"),html.indexOf("ponyVcf:{n:"));
  for(const label of ["STEREO STRIP","6 HP","INPUT L","INPUT R","OUTPUT L","OUTPUT R","LOW","MID","HIGH","PAN","PAN CV ATT","PAN CV","LEVEL / VCA","LEVEL CV","INPUT LEVEL","OUTPUT LEVEL","EURORACK","LINE","SOFT CLIP LIMITER"])assert.ok(panel.includes(label),"missing Stereo Strip control "+label);
  assert.match(html,/MoldgfStereoStripDSP\.process/);
  assert.match(html,/m\.s\.mute=\(\(m\.s\.mute\|0\)\+1\)%3/);
  assert.match(html,/A=byT\.stereoStrip;for/);
});

test("MIDI Thing V2 panel exposes twelve assignable outputs, voice controls and MIDI event routing",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("midiThingV2:{n:"),html.indexOf("stereoStrip:{n:"));
  for(const label of ["MIDI THING V2","12 ASSIGNABLE PORTS","MIDI CH","VOICES","PRIORITY","CV RANGE","GLIDE","VOICE GENERATORS","NEW VOICE","ALL NOTES OFF","NOTE CV","DRUM TRIGGER","NOTE","PITCH BEND","CHANNEL PRESSURE","PROGRAM CHANGE","CLOCK","OSCILLATOR","RPN","NRPN"])assert.ok(panel.includes(label),"missing MIDI Thing V2 control "+label);
  assert.match(panel,/data-k="ports\.'\+i\+'\.note"/);
  assert.match(html,/MIDI_THING_RANGES=\['0–5 V','−5\/\+5 V','0–10 V','0–8 V'\]/);
  assert.match(panel,/Array\.from\(\{length:12\}/);
  assert.match(html,/MoldgfMidiThingV2DSP\.process/);
  assert.match(html,/MoldgfMidiThingV2DSP\.handleMidi/);
  assert.match(html,/case'midiThingEvent'/);
  assert.match(html,/case'midiThingAllOff'/);
  assert.match(html,/midi_thing_v2_dsp\.js/);
  assert.match(html,/type:'midiThingV2'/);
});

test("BF-22 panel exposes both Sallen-Key-inspired filter channels, CV tracking and A-to-B link",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("bf22:{n:"),html.indexOf("midiThingV2:{n:"));
  for(const label of ["BF-22","DUAL HI / LOW-PASS FILTER","LINK","A → B","CUTOFF","RESONANCE","CV1 ATTENUVERTER","LOW PASS","HIGH PASS","6 dB","12 dB","CUTOFF CV","V/OCT","RESONANCE CV","FILTER OUT","SALLEN-KEY INSPIRED"])assert.ok(panel.includes(label),"missing BF-22 panel feature "+label);
  assert.match(panel,/\[\x27A\x27,\x27B\x27\]\.map/);
  assert.match(panel,/FILTER '\+ch/);
  assert.match(html,/MoldgfBF22DSP\.process/);
  assert.match(html,/function bf22F\(m\)/);
  assert.match(html,/type:'bf22'/);
  assert.match(html,/bf22_dsp\.js/);
  assert.match(html,/A=byT\.bf22/);
});

test("Crush Delay V3 panel exposes time, feedback, VCA, three crush modifiers and ten jacks",()=>{
  const htmlPath=path.join(__dirname,"../app/src/main/assets/index.html");
  const html=fs.readFileSync(htmlPath,"utf8");
  const panel=html.slice(html.indexOf("crushDelayV3:{n:"),html.indexOf("bf22:{n:"));
  for(const label of ["CRUSH DELAY","PT2399 INSPIRED","TIME","FEEDBACK","IN VOL","DRY / WET","RETURN VOL","CRUSH MODIFIERS","BIT REDUCTION","SAMPLE RATE","WAVE FOLD","IN","OUT","RETURN","SEND","TIME CV","FEEDBACK CV","IN VOL CV","DRY / WET CV","RETURN VOL CV","CRUSH GATE","3 V","SEND IS FULLY WET"])assert.ok(panel.includes(label),"missing Crush Delay V3 panel feature "+label);
  assert.match(html,/MoldgfCrushDelayV3DSP\.process/);
  assert.match(html,/function crushDelayV3F\(m\)/);
  assert.match(html,/type:'crushDelayV3'/);
  assert.match(html,/crush_delay_v3_dsp\.js/);
  assert.match(html,/A=byT\.crushDelayV3/);
});

test("manual jack patching uses live rack IDs, typed BF-22 ports and persists cable endpoints", () => {
  const htmlPath = path.join(__dirname, "../app/src/main/assets/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const graphPath = path.join(__dirname, "../app/src/main/assets/module_graph.js");
  const graph = fs.readFileSync(graphPath, "utf8");
  assert.match(graph, /typeof module\.t === "string" \? module\.t/);
  assert.match(html, /function endpointOfJack\(jackId\)/);
  assert.match(html, /MoldgfModuleGraph\.canConnect\(PORT_REGISTRY,from\.module,from\.port,to\.module,to\.port\)/);
  assert.match(html, /function connect\(x,y\)/);
  assert.match(html, /cab\.push\(\{a,b\}\);rb\(\);return true/);
  assert.match(html, /post\(\{t:'cab',cab:cab\.map\(c=>\[c\.a,c\.b\]\)\}\)/);
  const descriptor = html.slice(html.indexOf("PORT_REGISTRY.register({type:'bf22'"), html.indexOf("PORT_REGISTRY.register({type:'midiThingV2'"));
  for (const id of ["in", "cv1", "cv2", "resCV", "out"]) assert.ok(descriptor.includes("id:'" + id + "'"), "BF-22 descriptor missing " + id);
  assert.doesNotMatch(descriptor, /id:'(?:inA|inB|outA|outB|cv1A|cv2A|resCVA|cv1B|cv2B|resCVB)'/);
});
