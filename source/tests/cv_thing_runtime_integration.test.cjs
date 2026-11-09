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
  assert.match(html, /cvThing:\s*\(\)\s*=>\(\{channel:1,threshold:\.005,maps:/);
  assert.match(html, /cvThing:\s*\(\)\s*=>\s*MoldgfCVThingDSP\.createState\(\)/);
  assert.match(html, /function cvThingF\(m\)/);
  assert.match(html, /A=byT\.cvThing;for\(i=0;i<A.length;i\+\+\)cvThingF\(A\[i\]\)/);
});
test("CV Thing exposes exactly eight physical CV jacks with gate-capable signal typing", () => {
  assert.match(html, /type:'cvThing',ports:Array\.from\(\{length:8\}/);
  const descriptor = html.slice(html.indexOf("PORT_REGISTRY.register({type:'cvThing'"), html.indexOf("PORT_REGISTRY.register({type:'divkidMutesMk2'"));
  const panel = html.slice(html.indexOf("cvThing:{n:'Befaco CV Thing"), html.indexOf("divkidMutesMk2:{n:'DivKid Mutes"));
  assert.match(descriptor, /id:'cv'\+\(i\+1\),direction:'input',signal:'cv',channels:1,accepts:\['cv','gate','trigger'\]/);
  assert.match(panel, /id\+'\.cv'\+\(i\+1\)/);
  assert.doesNotMatch(descriptor, /id:'gate'/);
  assert.doesNotMatch(panel, /id\+'\.gate/);
});
test("CV Thing maps CC, paired V/Oct Note, Program Change, Clock and Start/Stop to MIDI", () => {
  for (const status of ["176|(ch&15)", "144|(ch&15)", "128|(ch&15)", "192|(ch&15)", "mq(248", "mq(250", "mq(252"]) assert.ok(html.includes(status), "missing MIDI route " + status);
  assert.match(html, /function midiFlat\(a\)/);
  assert.match(html, /NAT\.midiOutBatch/);
  assert.match(html, /if\(st>=248\)o\.send\(\[st\]\)/);
});
test("CV Thing faceplate includes OLED performance display, encoder and eight mapping rows", () => {
  assert.match(html, /cvthing-oled/);
  assert.match(html, /PERFORMANCE \/ 8 INPUTS/);
  assert.match(html, /cvThing\(m\)\{/);
  assert.match(html, /row\.classList\.toggle\('paired-gate'/);
  assert.match(html, /◉ ENCODER/);
  assert.match(html, /Array\.from\(\{length:8\}/);
  assert.match(html, /Sel\('maps\.'\+i\+'\.mode'/);
  assert.match(html, /data-k="maps\.'\+i\+'\.cc"/);
  assert.match(html, /data-k="maps\.'\+i\+'\.note"/);
});
test("inline engine script parses after module integrations", () => {
  const match = html.match(/<script id="eng">([\s\S]*?)<\/script>/);
  assert.ok(match, "engine script missing");
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
