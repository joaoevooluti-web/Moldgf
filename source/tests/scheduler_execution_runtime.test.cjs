const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRegistry, validateGraph } = require("../app/src/main/assets/module_graph.js");
const AtteDSP = require("../app/src/main/assets/atte_dsp.js");
const Mixer2DSP = require("../app/src/main/assets/mixer2_dsp.js");
const MixerDSP = require("../app/src/main/assets/mixer_dsp.js");
const VoltioDSP = require("../app/src/main/assets/voltio_dsp.js");
const CVThingDSP = require("../app/src/main/assets/cv_thing_dsp.js");
const DivKidMutesDSP = require("../app/src/main/assets/divkid_mutes_mk2_dsp.js");
const JoystickDSP = require("../app/src/main/assets/joystick_dsp.js");
const STMixDSP = require("../app/src/main/assets/stmix_dsp.js");
const HexmixDSP = require("../app/src/main/assets/hexmix_dsp.js");

const html = fs.readFileSync(
  path.join(__dirname, "../app/src/main/assets/index.html"),
  "utf8"
);
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const engineSource = scripts.find(match => /\bid=["']eng["']/.test(match[1]))?.[2];
assert.ok(engineSource, "shared audio engine script must exist");

function createEngineHarness() {
  const context = {
    MoldgfAtteDSP: AtteDSP,
    MoldgfMixer2DSP: Mixer2DSP,
    MoldgfMixerDSP: MixerDSP,
    MoldgfVoltioDSP: VoltioDSP,
    MoldgfCVThingDSP: CVThingDSP,
    MoldgfDivKidMutesMK2DSP: DivKidMutesDSP,
    MoldgfJoystickDSP: JoystickDSP,
    MoldgfSTMixDSP: STMixDSP,
    MoldgfHexmixDSP: HexmixDSP
  };
  vm.createContext(context);
  vm.runInContext(engineSource + `
    globalThis.__MOLDGF_TEST = {
      mkInst, idxE, I, byT, cab, cs, V, sig, K, rebuild, step,
      setGraphExecutionOrder,
      output: () => [OL, OR],
      setInput: (port, value) => {
        const source = sig("fixture.source." + port);
        V[source] = value;
        cs[sig(port)] = [source];
      }
    };
  `, context, { timeout: 3000 });
  return context.__MOLDGF_TEST;
}

function makeGraphPlan() {
  const registry = createRegistry([
    { type: "voltio", ports: [
      { id: "sumIn", direction: "input", signal: "cv" },
      { id: "out", direction: "output", signal: "cv" }
    ] },
    { type: "mixer2", ports: [
      { id: "ch1", direction: "input", signal: "audio", accepts: ["audio", "cv"] },
      { id: "mix12", direction: "output", signal: "audio" }
    ] },
    { type: "mixer", ports: [
      { id: "ch1", direction: "input", signal: "audio", accepts: ["audio", "cv"] },
      { id: "main", direction: "output", signal: "audio" },
      { id: "inverted", direction: "output", signal: "audio" }
    ] },
    { type: "out", ports: [
      { id: "l", direction: "input", signal: "audio", accepts: ["audio", "cv"] },
      { id: "r", direction: "input", signal: "audio", accepts: ["audio", "cv"] }
    ] }
  ]);
  return validateGraph(registry,
    [{ id: "out1", type: "out" }, { id: "mixer1", type: "mixer" }, { id: "mixer21", type: "mixer2" }, { id: "voltio1", type: "voltio" }],
    [
      { from: { module: "voltio1", port: "out" }, to: { module: "mixer21", port: "ch1" } },
      { from: { module: "mixer21", port: "mix12" }, to: { module: "mixer1", port: "ch1" } },
      { from: { module: "mixer1", port: "main" }, to: { module: "out1", port: "l" } }
    ]);
}

function buildVoltioMixerRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [1, 0, 0, 0] });
  engine.mkInst("mixer21", "mixer2", { gain: [1, 1, 1, 1], clip: 0 });
  engine.mkInst("voltio1", "voltio", { octave: 5, semitone: 0, range: 0 });
  engine.idxE();
  engine.cab.push(
    { a: "voltio1.out", b: "mixer21.ch1" },
    { a: "mixer21.mix12", b: "mixer1.ch1" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
}

test("topological Voltio -> Mixer2 -> Mixer -> Audio Out processing preserves main/inverted polarity", () => {
  const engine = createEngineHarness();
  const plan = makeGraphPlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["voltio1", "mixer21", "mixer1", "out1"]);
  buildVoltioMixerRack(engine);
  assert.equal(engine.setGraphExecutionOrder(["out1", "mixer1", "mixer21", "voltio1"]), false,
    "a plan that violates cable direction/order must not be activated");
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  engine.step();
  const [left, right] = engine.output();
  assert.ok(Math.abs(left - Math.tanh(1)) < 1e-9, "left channel must include the Atte and Mixer2 output");
  assert.ok(Math.abs(right - Math.tanh(1)) < 1e-9, "unpatched right channel must follow the mono left input");
  assert.equal(engine.V[engine.sig("voltio1.out")], 5);
  assert.equal(engine.V[engine.sig("mixer1.main")], 5);
  assert.equal(engine.V[engine.sig("mixer1.inverted")], -5);
});

test("an unsupported legacy module disables topological mode and preserves legacy step output", () => {
  const engine = createEngineHarness();
  const plan = makeGraphPlan();
  buildVoltioMixerRack(engine);
  engine.mkInst("mid1", "mid", {});
  engine.idxE();
  assert.equal(engine.setGraphExecutionOrder(plan.order), false);
  engine.step();
  const [left, right] = engine.output();
  assert.ok(Math.abs(left - Math.tanh(1)) < 1e-9);
  assert.ok(Math.abs(right - Math.tanh(1)) < 1e-9);
});

test("legacy bucket inventory includes CV Thing, DivKid Mutes and Joystick processors", () => {
  const engine = createEngineHarness();
  engine.mkInst("cv1", "cvThing", {});
  engine.mkInst("mutes1", "divkidMutesMk2", {});
  engine.mkInst("joy1", "joystick", {});
  engine.idxE();
  assert.equal(engine.byT.cvThing.length, 1);
  assert.equal(engine.byT.divkidMutesMk2.length, 1);
  assert.equal(engine.byT.joystick.length, 1);
});


const hexmixParams = (overrides = {}) => Object.assign({
  volume:Array(6).fill(1),low:Array(6).fill(0),mid:Array(6).fill(0),
  high:Array(6).fill(0),pan:Array(6).fill(0),mute:Array(6).fill(0),
  masterVolume:1,masterLow:0,masterMid:0,masterHigh:0,outputLevel:0,
  vcaHost:0,stmixHost:0
},overrides);

function buildStmixHexmixRack(engine, hostIndex = 1) {
  engine.mkInst("hexmix1","hexmix",hexmixParams({stmixHost:hostIndex}));
  engine.mkInst("stmix1","stmix",{gain:[1,0,0,0]});
  engine.idxE();
  engine.setInput("stmix1.left1",.5);
  engine.setInput("stmix1.right1",.25);
}

test("selected STMix rear expansion feeds the Hexmix stereo master bus",()=>{
  const engine=createEngineHarness();
  buildStmixHexmixRack(engine,1);
  engine.step();
  assert.deepEqual(Array.from(engine.I.stmix1.r.out),[.5,.25]);
  assert.ok(Math.abs(engine.I.hexmix1.r.result.left-.5)<1e-9);
  assert.ok(Math.abs(engine.I.hexmix1.r.result.right-.25)<1e-9);
});

test("STMix remains an independent mixer when no Hexmix rear link is selected",()=>{
  const engine=createEngineHarness();
  buildStmixHexmixRack(engine,0);
  engine.step();
  assert.deepEqual(Array.from(engine.I.stmix1.r.out),[.5,.25]);
  assert.equal(engine.I.hexmix1.r.result.left,0);
  assert.equal(engine.I.hexmix1.r.result.right,0);
});

test("manual STMix output patch into the selected Hexmix suppresses the internal link to prevent double summing",()=>{
  const engine=createEngineHarness();
  buildStmixHexmixRack(engine,1);
  engine.cab.push(
    {a:"stmix1.outL",b:"hexmix1.in1"},
    {a:"stmix1.outR",b:"hexmix1.in2"}
  );
  engine.rebuild();
  engine.setInput("stmix1.left1",.5);
  engine.setInput("stmix1.right1",.25);
  engine.step();
  const expected=(.5+.25)*Math.SQRT1_2;
  assert.ok(Math.abs(engine.I.hexmix1.r.result.left-expected)<1e-9);
  assert.ok(Math.abs(engine.I.hexmix1.r.result.right-expected)<1e-9);
});
