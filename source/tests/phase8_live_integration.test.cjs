const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../app/src/main/assets/index.html"), "utf8");

test("all five Phase 8 DSP files load in the page and AudioWorklet", () => {
  for (const file of ["joystick_dsp.js", "divkid_mutes_mk2_dsp.js", "cv_thing_dsp.js", "crush_delay_v3_dsp.js", "bf22_dsp.js"]) {
    assert.ok(html.includes('<script src="' + file + '"></script>'), "page missing " + file);
    assert.ok(html.includes("'" + file + "'"), "AudioWorklet missing " + file);
  }
});
test("all five modules have persistent DSP state and live sample dispatch", () => {
  for (const [type, dsp] of [["joystick","MoldgfJoystickDSP"],["divkidMutesMk2","MoldgfDivKidMutesMK2DSP"],["cvThing","MoldgfCVThingDSP"],["crushDelayV3","MoldgfCrushDelayV3DSP"],["bf22","MoldgfBF22DSP"]]) {
    assert.ok(html.includes(type + ":()=>"), "missing defaults " + type);
    assert.ok(html.includes(type + ":()=>"+dsp+".createState"), "missing state " + type);
    assert.ok(html.includes("A=byT."+type+";for(i=0;i<A.length;i++"), "missing dispatch " + type);
  }
});
test("BF-22 live descriptor matches the dual-channel panel endpoint scheme", () => {
  for (const port of ["inA","inB","outA","outB"]) assert.ok(html.includes("id:'" + port + "'"), "missing BF-22 graph port " + port);
  assert.ok(html.includes("['cv1A','cv2A','resCVA','cv1B','cv2B','resCVB'].map(id=>"), "missing six mapped BF-22 CV ports");
  assert.match(html, /J\(id\+'\.in'\+ch/);
  assert.match(html, /J\(id\+'\.out'\+ch/);
});
test("Crush Delay V3 descriptor, panel and processor expose the same ten endpoints", () => {
  for (const port of ["in","return","crushGate","out","send"]) {
    assert.ok(html.includes("id:'" + port + "'"), "missing Crush Delay graph port " + port);
    assert.ok(html.includes("id+'." + port + "'"), "missing Crush Delay panel jack " + port);
  }
  assert.ok(html.includes("['timeCV','feedbackCV','inVolCV','dryWetCV','returnVolCV'].map(id=>"), "missing five mapped Crush Delay CV ports");
  for (const port of ["timeCV","feedbackCV","inVolCV","dryWetCV","returnVolCV"]) assert.ok(html.includes("id+'." + port + "'"), "missing Crush Delay panel jack " + port);
  assert.match(html, /function crushDelayV3F\(m\)/);
});
test("Joystick and Mutes controls are connected to state transitions", () => {
  assert.match(html, /case'gateX':s\.gateX\^=1;break;case'gateY':s\.gateY\^=1;break;/);
  assert.match(html, /function joySet\(e\)/);
  assert.match(html, /function muteRelease\(e\)/);
  assert.match(html, /type:'divkidMutesMk2',ports:/);
});
test("shared inline engine script parses with all Phase 8 modules", () => {
  const match = html.match(/<script id="eng">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
