const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../app/src/main/assets/index.html"), "utf8");

test("CV Thing DSP loads in page and AudioWorklet source bundle", () => {
  assert.match(html, /<script src="cv_thing_dsp\.js"><\/script>/);
  assert.match(html, /'cv_thing_dsp\.js'/);
});
test("CV Thing is initialized and dispatched in the shared sample engine", () => {
  assert.match(html, /cvThing:\s*\(\)\s*=>\(\{channel:1,threshold:\.005,maps:/);\n  assert.match(html, /cvThing:\s*\(\)\s*=>\s*MoldgfCVThingDSP\.createState\(\)/);
  assert.match(html, /function cvThingF\(m\)/);
  assert.match(html, /A=byT\.cvThing;for\(i=0;i<A\.length;i\+\+\)cvThingF\(A\[i\]\)/);
});
test("CV Thing has eight typed CV inputs and eight typed gate inputs", () => {
  assert.match(html, /type:'cvThing',ports:/);
  for (let i = 1; i <= 8; i++) {
    assert.ok(html.includes("id:'cv" + i + "'"), "missing CV port " + i);
    assert.ok(html.includes("id:'gate" + i + "'"), "missing gate port " + i);
    assert.ok(html.includes("id+'.cv" + i + "'"), "missing CV jack " + i);
    assert.ok(html.includes("id+'.gate" + i + "'"), "missing gate jack " + i);
  }
});
test("CV Thing maps all supported MIDI event classes to the existing MIDI queue", () => {
  for (const status of ["176|(ch&15)", "144|(ch&15)", "128|(ch&15)", "192|(ch&15)", "mq(248", "mq(250", "mq(252"]) {
    assert.ok(html.includes(status), "missing MIDI route " + status);
  }
  assert.match(html, /function midiFlat\(a\)/);
  assert.match(html, /NAT\.midiOutBatch/);
});
test("CV Thing exposes channel, threshold, mode, CC and note controls", () => {
  assert.match(html, /Sel\('channel','MIDI CHANNEL'/);
  assert.match(html, /R\('threshold','CHANGE THRESHOLD'/);
  assert.match(html, /Sel\('maps '\+i\+'\.mode'/);
  assert.match(html, /data-k="maps\.'\+i\+'\.cc"/);
  assert.match(html, /data-k="maps\.'\+i\+'\.note"/);
});
test("inline engine script parses after module integrations", () => {
  const match = html.match(/<script id="eng">([\s\S]*?)<\/script>/);
  assert.ok(match, "engine script missing");
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
