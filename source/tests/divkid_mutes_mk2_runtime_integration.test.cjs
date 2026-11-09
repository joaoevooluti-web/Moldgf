const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../app/src/main/assets/index.html"), "utf8");

test("DivKid Mutes DSP is loaded in the page and AudioWorklet bundle", () => {
  assert.match(html, /<script src="divkid_mutes_mk2_dsp\.js"><\/script>/);
  assert.match(html, /'divkid_mutes_mk2_dsp\.js'/);
});
test("four Mutes channels are dispatched through the shared audio engine", () => {
  assert.match(html, /divkidMutesMk2:\s*\(\)\s*=>\s*MoldgfDivKidMutesMK2DSP\.createState\(\)/);
  assert.match(html, /function divkidMutesMk2F\(m\)/);
  assert.match(html, /A=byT\.divkidMutesMk2;for\(i=0;i<A\.length;i\+\+\)divkidMutesMk2F\(A\[i\]\)/);
});
test("Mutes has four typed audio inputs and four audio outputs", () => {
  assert.match(html, /type:'divkidMutesMk2',ports:/);
  for (let i = 1; i <= 4; i++) {
    assert.ok(html.includes("id+'.in" + i + "'"), "missing input jack " + i);
    assert.ok(html.includes("id+'.out" + i + "'"), "missing output jack " + i);
  }
});
test("momentary hold releases on pointer up or cancellation", () => {
  assert.match(html, /data-mute-hold=/);
  assert.match(html, /function muteRelease\(e\)/);
  assert.match(html, /addEventListener\('pointercancel',muteRelease\)/);
});
test("inline engine script remains syntactically valid", () => {
  const match = html.match(/<script id="eng">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
