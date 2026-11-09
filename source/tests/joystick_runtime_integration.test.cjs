const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../app/src/main/assets/index.html"), "utf8");

test("Joystick DSP is loaded by the page and AudioWorklet bundle", () => {
  assert.match(html, /<script src="joystick_dsp\.js"><\/script>/);
  assert.match(html, /'joystick_dsp\.js'/);
});

test("Joystick has runtime state and is dispatched by the shared engine", () => {
  assert.match(html, /joystick:\s*\(\)\s*=>\s*MoldgfJoystickDSP\.createState\(\)/);
  assert.match(html, /function joystickF\(m\)/);
  assert.match(html, /A=byT\.joystick;for\(i=0;i<A\.length;i\+\+\)joystickF\(A\[i\]\)/);
});

test("Joystick faceplate exposes the six graph endpoint IDs", () => {
  for (const port of ["xIn", "yIn", "x", "y", "gateX", "gateY"]) {
    assert.ok(html.includes("id+'." + port + "'"), "missing jack " + port);
  }
  assert.match(html, /data-xy=/);
  assert.match(html, /function joySet\(e\)/);
});

test("inline engine script remains syntactically valid", () => {
  const match = html.match(/<script id="eng">([\s\S]*?)<\/script>/);
  assert.ok(match, "engine script missing");
  assert.doesNotThrow(() => new vm.Script(match[1]), "engine script syntax");
});
