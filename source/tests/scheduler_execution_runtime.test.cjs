const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRegistry, validateGraph } = require("../app/src/main/assets/module_graph.js");
const AtteDSP = require("../app/src/main/assets/atte_dsp.js");
const DualAtenuverterDSP = require("../app/src/main/assets/dual_atenuverter_dsp.js");
const ABCDSP = require("../app/src/main/assets/abc_dsp.js");
const AxBCDSP = require("../app/src/main/assets/axbc_dsp.js");
const BypassDSP = require("../app/src/main/assets/bypass_dsp.js");
const Mixer2DSP = require("../app/src/main/assets/mixer2_dsp.js");
const MixerDSP = require("../app/src/main/assets/mixer_dsp.js");
const VoltioDSP = require("../app/src/main/assets/voltio_dsp.js");
const CVThingDSP = require("../app/src/main/assets/cv_thing_dsp.js");
const DivKidMutesDSP = require("../app/src/main/assets/divkid_mutes_mk2_dsp.js");
const JoystickDSP = require("../app/src/main/assets/joystick_dsp.js");
const STMixDSP = require("../app/src/main/assets/stmix_dsp.js");
const HexmixDSP = require("../app/src/main/assets/hexmix_dsp.js");
const MotionMTRDSP = require("../app/src/main/assets/motionmtr_dsp.js");
const SlewLimiterDSP = require("../app/src/main/assets/slewlimiter_dsp.js");
const SlewDSP = require("../app/src/main/assets/slew_dsp.js");
const ADSRDSP = require("../app/src/main/assets/adsr_dsp.js");

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
    MoldgfDualAtenuverterDSP: DualAtenuverterDSP,
    MoldgfABCDSP: ABCDSP,
    MoldgfAxBCDSP: AxBCDSP,
    MoldgfBypassDSP: BypassDSP,
    MoldgfMixer2DSP: Mixer2DSP,
    MoldgfMixerDSP: MixerDSP,
    MoldgfVoltioDSP: VoltioDSP,
    MoldgfCVThingDSP: CVThingDSP,
    MoldgfDivKidMutesMK2DSP: DivKidMutesDSP,
    MoldgfJoystickDSP: JoystickDSP,
    MoldgfSTMixDSP: STMixDSP,
    MoldgfHexmixDSP: HexmixDSP,
    MoldgfMotionMTRDSP: MotionMTRDSP,
    MoldgfSlewLimiterDSP: SlewLimiterDSP,
    MoldgfSlewDSP: SlewDSP,
    MoldgfADSRDSP: ADSRDSP
  };
  vm.createContext(context);
  vm.runInContext(engineSource + `
    globalThis.__MOLDGF_TEST = {
      mkInst, idxE, I, byT, cab, cs, V, sig, K, rebuild, step,
      setGraphExecutionOrder,
      setSampleRate: value => { if (Number.isFinite(value) && value > 0) sr = value; },
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


function makeExpandedUtilityPlan() {
  const cvIn = id => ({ id, direction: "input", signal: "cv", channels: 1, accepts: ["audio", "cv", "gate", "trigger", "clock", "midi"] });
  const audioIn = id => ({ id, direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] });
  const registry = createRegistry([
    { type: "dualAt", ports: [cvIn("inA"), cvIn("inB"), { id: "outA", direction: "output", signal: "cv" }, { id: "outB", direction: "output", signal: "cv" }] },
    { type: "abc", ports: ["a1", "b1", "c1", "a2", "b2", "c2"].map(cvIn).concat([{ id: "out1", direction: "output", signal: "cv" }, { id: "out2", direction: "output", signal: "cv" }]) },
    { type: "axbc", ports: ["a1", "b1", "c1", "a2", "b2", "c2"].map(cvIn).concat([{ id: "out1", direction: "output", signal: "cv" }, { id: "out2", direction: "output", signal: "cv" }]) },
    { type: "bypass", ports: [audioIn("inL"), audioIn("inR"), audioIn("fxL"), audioIn("fxR"),
      { id: "launch", direction: "input", signal: "gate", accepts: ["gate", "cv"] },
      { id: "sendL", direction: "output", signal: "audio" }, { id: "sendR", direction: "output", signal: "audio" },
      { id: "outL", direction: "output", signal: "audio" }, { id: "outR", direction: "output", signal: "audio" }] },
    { type: "mixer2", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn).concat([{ id: "mix12", direction: "output", signal: "audio" }, { id: "mix34", direction: "output", signal: "audio" }]) },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn).concat([{ id: "main", direction: "output", signal: "audio" }, { id: "inverted", direction: "output", signal: "audio" }]) },
    { type: "out", ports: [audioIn("l"), audioIn("r")] }
  ]);
  const modules = [
    { id: "out1", type: "out" }, { id: "mixer1", type: "mixer" },
    { id: "mixer21", type: "mixer2" }, { id: "bypass1", type: "bypass" },
    { id: "axbc1", type: "axbc" }, { id: "abc1", type: "abc" }, { id: "dual1", type: "dualAt" }
  ];
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  return validateGraph(registry, modules, [
    cable("dual1", "outA", "abc1", "a1"),
    cable("abc1", "out1", "axbc1", "a1"),
    cable("axbc1", "out1", "bypass1", "inL"),
    cable("bypass1", "outL", "mixer21", "ch1"),
    cable("mixer21", "mix12", "mixer1", "ch1"),
    cable("mixer1", "main", "out1", "l")
  ]);
}

function buildExpandedUtilityRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [1, 0, 0, 0] });
  engine.mkInst("mixer21", "mixer2", { gain: [1, 0, 0, 0], clip: 0 });
  engine.mkInst("bypass1", "bypass", { active: 0, button: 0, launchMode: 0, returnMode: 0, fxGain: 0, slew: 0.01, saturation: 0 });
  engine.mkInst("axbc1", "axbc", { bLevel: [1, 1], bMode: [0, 0], cLevel: [0, 0], cMode: [0, 0], mode: 0 });
  engine.mkInst("abc1", "abc", { bLevel: [1, 0], cLevel: [0, 0] });
  engine.mkInst("dual1", "dualAt", { gain: [1, -1], offset: [0, 0] });
  engine.idxE();
  engine.cab.push(
    { a: "dual1.outA", b: "abc1.a1" },
    { a: "abc1.out1", b: "axbc1.a1" },
    { a: "axbc1.out1", b: "bypass1.inL" },
    { a: "bypass1.outL", b: "mixer21.ch1" },
    { a: "mixer21.mix12", b: "mixer1.ch1" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
  engine.setInput("dual1.inA", 5);
}

test("topological Dual Atenuverter -> A*B+C -> AxBC -> Bypass -> Mixer2 -> Mixer -> Audio Out chain executes real DSP adapters", () => {
  const engine = createEngineHarness();
  const plan = makeExpandedUtilityPlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["dual1", "abc1", "axbc1", "bypass1", "mixer21", "mixer1", "out1"]);
  buildExpandedUtilityRack(engine);
  assert.equal(engine.setGraphExecutionOrder(["out1", "mixer1", "mixer21", "bypass1", "axbc1", "abc1", "dual1"]), false);
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  engine.step();
  const [left, right] = engine.output();
  assert.equal(engine.V[engine.sig("dual1.outA")], 5);
  assert.equal(engine.V[engine.sig("dual1.outB")], -5);
  assert.equal(engine.V[engine.sig("abc1.out1")], 10);
  assert.equal(engine.V[engine.sig("axbc1.out1")], 10);
  assert.equal(engine.V[engine.sig("bypass1.outL")], 10);
  assert.equal(engine.V[engine.sig("mixer21.mix12")], 10);
  assert.equal(engine.V[engine.sig("mixer1.main")], 10);
  assert.ok(Math.abs(left - Math.tanh(2)) < 1e-9);
  assert.ok(Math.abs(right - Math.tanh(2)) < 1e-9);
});

test("scheduled Bypass preserves gate/button edge state across sample calls", () => {
  const engine = createEngineHarness();
  const plan = makeExpandedUtilityPlan();
  buildExpandedUtilityRack(engine);
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  const state = engine.I.bypass1.r;
  engine.I.bypass1.s.button = 1;
  engine.step();
  assert.equal(state.active, true);
  engine.I.bypass1.s.button = 0;
  engine.step();
  assert.equal(state.active, true, "button release must not toggle the latched state");
  for (let i = 0; i < 2500; i++) engine.step();
  assert.ok(state.sendActive > 0.99, "the send crossfade must converge using the persisted state object");
  assert.strictEqual(engine.I.bypass1.r, state);
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


test("runtime graph planner includes selected Hexmix rear-panel host dependencies", () => {
  const uiScript = scripts.find(match => match[2].includes("const PORT_REGISTRY=MoldgfModuleGraph.createRegistry()"))?.[2];
  assert.ok(uiScript, "rack UI script must contain the live module registry");
  const start = uiScript.indexOf("const LEGACY_SIGNAL_TYPES=MoldgfModuleGraph.signals;");
  const end = uiScript.indexOf("const ACTIVE_SCHEDULER_TYPES", start);
  assert.ok(start >= 0 && end > start, "runtime graph planner section must be extractable");
  const registry = createRegistry([
    { type: "hexmix", ports: [] },
    { type: "hexmixvca", ports: [] },
    { type: "stmix", ports: [] },
    { type: "hexpander", ports: [] }
  ]);
  const context = {
    MoldgfModuleGraph: require("../app/src/main/assets/module_graph.js"),
    PORT_REGISTRY: registry,
    I: {
      hexmix1: { id: "hexmix1", t: "hexmix", s: { vcaHost: 1, stmixHost: 1 } },
      stmix1: { id: "stmix1", t: "stmix", s: {} },
      vca1: { id: "vca1", t: "hexmixvca", s: {} },
      hexpander1: { id: "hexpander1", t: "hexpander", s: { hexmixHost: 1 } }
    },
    jk: {},
    cab: []
  };
  vm.createContext(context);
  vm.runInContext(uiScript.slice(start, end) + "\nglobalThis.__PLAN = refreshGraphPlan();", context, { timeout: 1000 });
  const plan = context.__PLAN;
  assert.equal(plan.valid, true);
  assert.deepEqual(Array.from(plan.order), ["stmix1", "vca1", "hexmix1", "hexpander1"]);
  assert.deepEqual(Array.from(plan.dependencies, dependency => [dependency.from, dependency.to, dependency.kind]), [
    ["vca1", "hexmix1", "hexmix-vca-expansion"],
    ["stmix1", "hexmix1", "stmix-rear-expansion"],
    ["hexmix1", "hexpander1", "hexpander-host"]
  ]);
  assert.ok(uiScript.includes("['vcaHost','stmixHost','hexmixHost'].includes(t.dataset.k)"),
    "changing an internal host selector must refresh the graph plan");
});


function makeAtteCascadePlan() {
  const cvIn = id => ({ id, direction: "input", signal: "cv", channels: 1,
    accepts: ["audio", "cv", "gate", "trigger", "clock", "midi"] });
  const audioIn = id => ({ id, direction: "input", signal: "audio", channels: 1,
    accepts: ["audio", "cv"] });
  const registry = createRegistry([
    { type: "voltio", ports: [cvIn("sumIn"), { id: "out", direction: "output", signal: "cv" }] },
    { type: "atte", ports: ["inA", "inB", "inC", "inD"].map(cvIn)
      .concat(["a", "b", "c", "d"].map(id => ({ id, direction: "output", signal: "cv" }))) },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn)
      .concat([{ id: "main", direction: "output", signal: "audio" },
        { id: "inverted", direction: "output", signal: "audio" }]) },
    { type: "out", ports: [audioIn("l"), audioIn("r")] }
  ]);
  const modules = [
    { id: "out1", type: "out" }, { id: "mixer1", type: "mixer" },
    { id: "atte1", type: "atte" }, { id: "voltio1", type: "voltio" }
  ];
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  return validateGraph(registry, modules, [
    cable("voltio1", "out", "atte1", "inB"),
    cable("atte1", "a", "mixer1", "ch1"),
    cable("atte1", "b", "mixer1", "ch2"),
    cable("atte1", "c", "mixer1", "ch3"),
    cable("atte1", "d", "mixer1", "ch4"),
    cable("mixer1", "main", "out1", "l")
  ]);
}

function buildAtteCascadeRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [0.25, 0.25, 0.25, 0.25] });
  engine.mkInst("atte1", "atte", {
    gain: [0.5, 1, 1, 1], mode: [1, 0, 1, 1], normalledVoltage: 0
  });
  engine.mkInst("voltio1", "voltio", { octave: 3, semitone: 6, range: 0 });
  engine.idxE();
  engine.cab.push(
    { a: "voltio1.out", b: "atte1.inB" },
    { a: "atte1.a", b: "mixer1.ch1" },
    { a: "atte1.b", b: "mixer1.ch2" },
    { a: "atte1.c", b: "mixer1.ch3" },
    { a: "atte1.d", b: "mixer1.ch4" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
}

test("topological Voltio -> Atte cascade -> Mixer -> Audio Out uses fixed +10V normaling and caller-owned output", () => {
  const engine = createEngineHarness();
  const plan = makeAtteCascadePlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["voltio1", "atte1", "mixer1", "out1"]);
  buildAtteCascadeRack(engine);
  const outputBuffer = engine.I.atte1.r.out;
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  engine.step();
  assert.deepEqual(Array.from(outputBuffer), [5, -3.5, 3.5, 3.5]);
  assert.strictEqual(engine.I.atte1.r.out, outputBuffer);
  assert.equal(engine.V[engine.sig("atte1.a")], 5);
  assert.equal(engine.V[engine.sig("atte1.b")], -3.5);
  assert.equal(engine.V[engine.sig("atte1.c")], 3.5);
  assert.equal(engine.V[engine.sig("atte1.d")], 3.5);
  const expected = Math.tanh(2.125 * 0.2);
  const [left, right] = engine.output();
  assert.ok(Math.abs(left - expected) < 1e-9);
  assert.ok(Math.abs(right - expected) < 1e-9);
});


function makeJoystickAttePlan() {
  const cvIn = id => ({ id, direction: "input", signal: "cv", channels: 1,
    accepts: ["audio", "cv", "gate", "trigger", "clock", "midi"] });
  const audioIn = id => ({ id, direction: "input", signal: "audio", channels: 1,
    accepts: ["audio", "cv"] });
  const registry = createRegistry([
    { type: "voltio", ports: [cvIn("sumIn"), { id: "out", direction: "output", signal: "cv" }] },
    { type: "joystick", ports: [cvIn("xIn"), cvIn("yIn"),
      { id: "x", direction: "output", signal: "cv" }, { id: "y", direction: "output", signal: "cv" },
      { id: "gateX", direction: "output", signal: "gate" }, { id: "gateY", direction: "output", signal: "gate" }] },
    { type: "atte", ports: ["inA", "inB", "inC", "inD"].map(cvIn)
      .concat(["a", "b", "c", "d"].map(id => ({ id, direction: "output", signal: "cv" }))) },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn)
      .concat([{ id: "main", direction: "output", signal: "audio" },
        { id: "inverted", direction: "output", signal: "audio" }]) },
    { type: "out", ports: [audioIn("l"), audioIn("r")] }
  ]);
  const modules = [
    { id: "out1", type: "out" }, { id: "mixer1", type: "mixer" },
    { id: "atte1", type: "atte" }, { id: "joy1", type: "joystick" },
    { id: "voltio1", type: "voltio" }
  ];
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  return validateGraph(registry, modules, [
    cable("voltio1", "out", "joy1", "xIn"),
    cable("joy1", "x", "atte1", "inA"),
    cable("atte1", "a", "mixer1", "ch1"),
    cable("mixer1", "main", "out1", "l")
  ]);
}

function buildJoystickAtteRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [1, 0, 0, 0] });
  engine.mkInst("atte1", "atte", {
    gain: [0.5, 1, 1, 1], mode: [1, 1, 1, 1], normalledVoltage: 2
  });
  engine.mkInst("joy1", "joystick", {
    x: 0, y: 0, mode: 1, range: 1, offsetX: 0, offsetY: 0,
    attenX: -0.5, attenY: 0.25, gateX: 1, gateY: 0
  });
  engine.mkInst("voltio1", "voltio", { octave: 3, semitone: 6, range: 0 });
  engine.idxE();
  engine.cab.push(
    { a: "voltio1.out", b: "joy1.xIn" },
    { a: "joy1.x", b: "atte1.inA" },
    { a: "atte1.a", b: "mixer1.ch1" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
}

test("topological Voltio -> Joystick -> Atte -> Mixer -> Audio Out preserves CV and gate outputs", () => {
  const engine = createEngineHarness();
  const plan = makeJoystickAttePlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["voltio1", "joy1", "atte1", "mixer1", "out1"]);
  buildJoystickAtteRack(engine);
  const joystickResult = engine.I.joy1.r.result;
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  engine.step();
  assert.strictEqual(engine.I.joy1.r.result, joystickResult);
  assert.equal(engine.V[engine.sig("joy1.x")], -1.75);
  assert.equal(engine.V[engine.sig("joy1.y")], 0);
  assert.equal(engine.V[engine.sig("joy1.gateX")], 10);
  assert.equal(engine.V[engine.sig("joy1.gateY")], 0);
  assert.equal(engine.V[engine.sig("atte1.a")], -0.875);
  const expected = Math.tanh(-0.875 * 0.2);
  const [left, right] = engine.output();
  assert.ok(Math.abs(left - expected) < 1e-9);
  assert.ok(Math.abs(right - expected) < 1e-9);
});


function makeMotionMTRPlan(patchIndividualOutputs = false) {
  const cvIn = id => ({ id, direction: "input", signal: "cv", channels: 1,
    accepts: ["audio", "cv", "gate", "trigger", "clock", "midi"] });
  const audioIn = id => ({ id, direction: "input", signal: "audio", channels: 1,
    accepts: ["audio", "cv"] });
  const registry = createRegistry([
    { type: "voltio", ports: [cvIn("sumIn"), { id: "out", direction: "output", signal: "cv" }] },
    { type: "motionmtr", ports: [
      ...["in1", "in2", "in3"].map(id => ({ id, direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] })),
      ...["out1", "out2", "out3"].map(id => ({ id, direction: "output", signal: "audio", channels: 1 }))
    ] },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn)
      .concat([{ id: "main", direction: "output", signal: "audio" },
        { id: "inverted", direction: "output", signal: "audio" }]) },
    { type: "out", ports: [audioIn("l"), audioIn("r")] }
  ]);
  const modules = [
    { id: "out1", type: "out" }, { id: "mixer1", type: "mixer" },
    { id: "motion1", type: "motionmtr" }, { id: "voltio1", type: "voltio" }
  ];
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  const cables = [
    cable("voltio1", "out", "motion1", "in1"),
    cable("motion1", "out3", "mixer1", "ch1"),
    cable("mixer1", "main", "out1", "l")
  ];
  if (patchIndividualOutputs) {
    cables.push(cable("motion1", "out1", "mixer1", "ch2"));
    cables.push(cable("motion1", "out2", "mixer1", "ch3"));
  }
  return validateGraph(registry, modules, cables);
}

function buildMotionMTRRack(engine, patchIndividualOutputs = false) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", {
    gain: patchIndividualOutputs ? [0.5, 0.5, 0.5, 0] : [0.5, 0, 0, 0]
  });
  engine.mkInst("motion1", "motionmtr", {
    mode: [1, 1, 1], gain: [0.5, 0.25, 0.5], break10VNormalForAudioMode: 1
  });
  engine.mkInst("voltio1", "voltio", { octave: 5, semitone: 0, range: 0 });
  engine.idxE();
  engine.cab.push(
    { a: "voltio1.out", b: "motion1.in1" },
    { a: "motion1.out3", b: "mixer1.ch1" },
    { a: "mixer1.main", b: "out1.l" }
  );
  if (patchIndividualOutputs) {
    engine.cab.push(
      { a: "motion1.out1", b: "mixer1.ch2" },
      { a: "motion1.out2", b: "mixer1.ch3" }
    );
  }
  engine.rebuild();
}

test("topological Voltio -> Motion MTR -> Mixer -> Audio Out preserves +10V normaling and OUT3 sum", () => {
  const engine = createEngineHarness();
  const plan = makeMotionMTRPlan(false);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["voltio1", "motion1", "mixer1", "out1"]);
  buildMotionMTRRack(engine, false);
  const state = engine.I.motion1.r;
  const inputBuffer = state.inputs, patchBuffer = state.outputsPatched, outputBuffer = state.out;
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  engine.step();
  assert.deepEqual(Array.from(outputBuffer), [2.5, 2.5, 10]);
  assert.equal(engine.V[engine.sig("motion1.out1")], 2.5);
  assert.equal(engine.V[engine.sig("motion1.out2")], 2.5);
  assert.equal(engine.V[engine.sig("motion1.out3")], 10);
  assert.equal(engine.V[engine.sig("mixer1.main")], 5);
  const expected = Math.tanh(1);
  const [left, right] = engine.output();
  assert.ok(Math.abs(left - expected) < 1e-9);
  assert.ok(Math.abs(right - expected) < 1e-9);
  engine.step();
  assert.strictEqual(state.inputs, inputBuffer);
  assert.strictEqual(state.outputsPatched, patchBuffer);
  assert.strictEqual(state.out, outputBuffer);
});

test("patched Motion MTR OUT1 and OUT2 are removed from the internal OUT3 sum", () => {
  const engine = createEngineHarness();
  const plan = makeMotionMTRPlan(true);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["voltio1", "motion1", "mixer1", "out1"]);
  buildMotionMTRRack(engine, true);
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  engine.step();
  assert.deepEqual(Array.from(engine.I.motion1.r.out), [2.5, 2.5, 5]);
  assert.equal(engine.V[engine.sig("motion1.out3")], 5);
  assert.equal(engine.V[engine.sig("mixer1.main")], 5);
});

test("Motion MTR remains on the legacy step path when another rack module is unsupported", () => {
  const engine = createEngineHarness();
  engine.mkInst("motion1", "motionmtr", {
    mode: [1, 1, 1], gain: [0.5, 0.25, 0.5], break10VNormalForAudioMode: 1
  });
  engine.mkInst("voltio1", "voltio", { octave: 5, semitone: 0, range: 0 });
  engine.mkInst("mid1", "mid", {});
  engine.idxE();
  engine.cab.push({ a: "voltio1.out", b: "motion1.in1" });
  engine.rebuild();
  assert.equal(engine.setGraphExecutionOrder(["voltio1", "motion1", "mid1"]), false);
  engine.step();
  assert.equal(engine.V[engine.sig("motion1.out1")], 2.5);
  assert.equal(engine.V[engine.sig("motion1.out3")], 10);
});


function makeSlewLimiterPlan() {
  const cvIn = id => ({ id, direction: "input", signal: "cv", channels: 1,
    accepts: ["audio", "cv", "gate", "trigger", "clock", "midi"] });
  const audioIn = id => ({ id, direction: "input", signal: "audio", channels: 1,
    accepts: ["audio", "cv"] });
  const registry = createRegistry([
    { type: "voltio", ports: [cvIn("sumIn"), { id: "out", direction: "output", signal: "cv" }] },
    { type: "slewlimiter", ports: [
      cvIn("in"),
      { id: "rise", direction: "input", signal: "cv", channels: 1, accepts: ["cv"] },
      { id: "fall", direction: "input", signal: "cv", channels: 1, accepts: ["cv"] },
      { id: "out", direction: "output", signal: "cv" }
    ] },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn)
      .concat([{ id: "main", direction: "output", signal: "audio" },
        { id: "inverted", direction: "output", signal: "audio" }]) },
    { type: "out", ports: [audioIn("l"), audioIn("r")] }
  ]);
  const modules = [
    { id: "out1", type: "out" }, { id: "mixer1", type: "mixer" },
    { id: "slew1", type: "slewlimiter" }, { id: "signal1", type: "voltio" },
    { id: "riseCv1", type: "voltio" }, { id: "fallCv1", type: "voltio" }
  ];
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  return validateGraph(registry, modules, [
    cable("signal1", "out", "slew1", "in"),
    cable("riseCv1", "out", "slew1", "rise"),
    cable("fallCv1", "out", "slew1", "fall"),
    cable("slew1", "out", "mixer1", "ch1"),
    cable("mixer1", "main", "out1", "l")
  ]);
}

function buildSlewLimiterRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [1, 0, 0, 0] });
  engine.mkInst("slew1", "slewlimiter", { rise: 0, fall: 0, shape: 0 });
  engine.mkInst("signal1", "voltio", { octave: 5, semitone: 0, range: 0 });
  engine.mkInst("riseCv1", "voltio", { octave: 10, semitone: 0, range: 0 });
  engine.mkInst("fallCv1", "voltio", { octave: 0, semitone: 0, range: 0 });
  engine.idxE();
  engine.cab.push(
    { a: "signal1.out", b: "slew1.in" },
    { a: "riseCv1.out", b: "slew1.rise" },
    { a: "fallCv1.out", b: "slew1.fall" },
    { a: "slew1.out", b: "mixer1.ch1" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
}

test("topological Voltio -> Slew Limiter -> Mixer -> Audio Out is sample-rate aware and reuses state", () => {
  const engine = createEngineHarness();
  const plan = makeSlewLimiterPlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["signal1", "riseCv1", "fallCv1", "slew1", "mixer1", "out1"]);
  buildSlewLimiterRack(engine);
  const state = engine.I.slew1.r;
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);

  engine.setSampleRate(96000);
  engine.step();
  const first = 0.1 / 96000;
  assert.ok(Math.abs(state.out - first) < 1e-15);
  assert.equal(engine.V[engine.sig("slew1.out")], state.out);
  assert.equal(engine.V[engine.sig("mixer1.main")], state.out);

  engine.setSampleRate(48000);
  engine.step();
  const second = first + 0.1 / 48000;
  assert.ok(Math.abs(state.out - second) < 1e-15);
  assert.strictEqual(engine.I.slew1.r, state);

  engine.I.signal1.s.octave = 0;
  engine.I.fallCv1.s.octave = 10;
  engine.step();
  const slowFall = state.out;
  assert.ok(slowFall > 0 && slowFall < second);

  engine.I.fallCv1.s.octave = 0;
  engine.step();
  assert.equal(state.out, 0);
  const [left, right] = engine.output();
  assert.ok(Number.isFinite(left) && Number.isFinite(right));
});

test("Slew Limiter still runs through the legacy step path when an unsupported rack module exists", () => {
  const engine = createEngineHarness();
  const plan = makeSlewLimiterPlan();
  buildSlewLimiterRack(engine);
  engine.mkInst("mid1", "mid", {});
  engine.idxE();
  engine.rebuild();
  assert.equal(engine.setGraphExecutionOrder(plan.order), false);
  engine.step();
  assert.ok(engine.I.slew1.r.out > 0);
  assert.equal(engine.V[engine.sig("slew1.out")], engine.I.slew1.r.out);
});


function makeSlewPlan() {
  const voltageInput = id => ({ id, direction: "input", signal: "cv", channels: 1,
    accepts: ["audio", "cv", "gate", "trigger", "clock"] });
  const audioInput = id => ({ id, direction: "input", signal: "audio", channels: 1,
    accepts: ["audio", "cv", "gate"] });
  const registry = createRegistry([
    { type: "voltio", ports: [voltageInput("sumIn"), { id: "out", direction: "output", signal: "cv", channels: 1 }] },
    { type: "slew", ports: [
      voltageInput("in"),
      { id: "cv", direction: "input", signal: "cv", channels: 1, accepts: ["cv"] },
      { id: "out", direction: "output", signal: "cv", channels: 1 },
      { id: "rising", direction: "output", signal: "gate", channels: 1 },
      { id: "falling", direction: "output", signal: "gate", channels: 1 }
    ] },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioInput)
      .concat([{ id: "main", direction: "output", signal: "audio", channels: 1 },
        { id: "inverted", direction: "output", signal: "audio", channels: 1 }]) },
    { type: "out", ports: [audioInput("l"), audioInput("r")] }
  ]);
  const modules = [
    { id: "out1", type: "out" }, { id: "mixer1", type: "mixer" },
    { id: "slew1", type: "slew" }, { id: "signal1", type: "voltio" },
    { id: "cv1", type: "voltio" }
  ];
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  return validateGraph(registry, modules, [
    cable("signal1", "out", "slew1", "in"),
    cable("cv1", "out", "slew1", "cv"),
    cable("slew1", "out", "mixer1", "ch1"),
    cable("slew1", "rising", "mixer1", "ch2"),
    cable("slew1", "falling", "mixer1", "ch3"),
    cable("mixer1", "main", "out1", "l")
  ]);
}

function buildSlewRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [1, 1, 1, 0] });
  engine.mkInst("slew1", "slew", { shape: 0, range: 0, rise: 0, fall: 0, cvMode: 1 });
  engine.mkInst("signal1", "voltio", { octave: 5, semitone: 0, range: 1 });
  engine.mkInst("cv1", "voltio", { octave: 10, semitone: 0, range: 0 });
  engine.idxE();
  engine.cab.push(
    { a: "signal1.out", b: "slew1.in" },
    { a: "cv1.out", b: "slew1.cv" },
    { a: "slew1.out", b: "mixer1.ch1" },
    { a: "slew1.rising", b: "mixer1.ch2" },
    { a: "slew1.falling", b: "mixer1.ch3" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
}

test("topological Slew routes CV and both slope-detector gates through Mixer to Audio Out", () => {
  const engine = createEngineHarness();
  const plan = makeSlewPlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["signal1", "cv1", "slew1", "mixer1", "out1"]);
  buildSlewRack(engine);
  const state = engine.I.slew1.r;
  assert.deepEqual(state, { out: 0, rising: 0, falling: 0, rate: 0 });
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);

  engine.step();
  assert.equal(state.rising, 10);
  assert.equal(state.falling, 0);
  assert.equal(engine.V[engine.sig("slew1.rising")], 10);
  assert.equal(engine.V[engine.sig("slew1.falling")], 0);
  assert.ok(engine.V[engine.sig("mixer1.main")] > 10,
    "the connected rising gate must reach the downstream mixer");
  assert.strictEqual(engine.I.slew1.r, state);

  for (let i = 0; i < 110; i++) engine.step();
  assert.equal(state.out, 5);
  assert.equal(state.rising, 0, "rising gate must fall when the output reaches its target");

  engine.I.signal1.s.octave = -5;
  engine.step();
  assert.equal(state.rising, 0);
  assert.equal(state.falling, 10);
  assert.equal(engine.V[engine.sig("slew1.falling")], 10);
  assert.ok(engine.V[engine.sig("mixer1.main")] > 9,
    "the connected falling gate must reach the downstream mixer");
  for (let i = 0; i < 210; i++) engine.step();
  assert.equal(state.out, -5);
  assert.equal(state.falling, 0);
});

test("topological Slew applies shared CV only in the selected direction and preserves sample-rate state", () => {
  const engine = createEngineHarness();
  const plan = makeSlewPlan();
  buildSlewRack(engine);
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  const state = engine.I.slew1.r;

  SlewDSP.reset(state, 0);
  engine.I.signal1.s.octave = 5;
  engine.I.slew1.s.cvMode = 2;
  engine.I.slew1.s.rise = 1;
  engine.I.slew1.s.fall = 0;
  engine.setSampleRate(48000);
  engine.step();
  assert.equal(state.rate, 2.5);
  assert.equal(state.rising, 10);

  SlewDSP.reset(state, 5);
  engine.I.signal1.s.octave = 0;
  engine.I.slew1.s.cvMode = 0;
  engine.I.slew1.s.fall = 1;
  engine.step();
  assert.equal(state.rate, 2.5);
  assert.equal(state.falling, 10);

  engine.setSampleRate(96000);
  SlewDSP.reset(state, 0);
  engine.I.signal1.s.octave = 5;
  engine.I.slew1.s.cvMode = 2;
  engine.step();
  assert.ok(Math.abs(state.out - (2.5 / 96000)) < 1e-15);
  assert.strictEqual(engine.I.slew1.r, state);
});

test("Slew keeps processing through the legacy step path when an unsupported module is present", () => {
  const engine = createEngineHarness();
  const plan = makeSlewPlan();
  buildSlewRack(engine);
  engine.mkInst("mid1", "mid", {});
  engine.idxE();
  engine.rebuild();
  assert.equal(engine.setGraphExecutionOrder(plan.order), false);
  engine.step();
  assert.equal(engine.I.slew1.r.rising, 10);
  assert.equal(engine.V[engine.sig("slew1.rising")], 10);
});

test("Slew is admitted consistently by the UI and audio scheduler allowlists", () => {
  const uiScript = scripts.find(match => match[2].includes("const PORT_REGISTRY=MoldgfModuleGraph.createRegistry()"))?.[2];
  assert.ok(uiScript, "rack UI script must contain the live module registry");
  assert.match(uiScript, /ACTIVE_SCHEDULER_TYPES=new Set\(\[[^\]]*'slew'[^\]]*\]\)/);
  assert.match(engineSource, /'slew','dualAt'/);
  assert.match(engineSource, /else if\(m\.t==='slew'\)slewF\(m\)/);
  assert.match(engineSource, /slew:\(\)=>MoldgfSlewDSP\.createState\(\)/);
});


function makeADSRMixerPlan() {
  const gateIn = id => ({ id, direction: "input", signal: "gate", channels: 1, accepts: ["gate", "cv"] });
  const cvIn = id => ({ id, direction: "input", signal: "cv", channels: 1, accepts: ["cv"] });
  const audioIn = id => ({ id, direction: "input", signal: "audio", channels: 1, accepts: ["audio", "cv"] });
  const registry = createRegistry([
    { type: "adsr", ports: [
      gateIn("gate"), gateIn("trigger"), cvIn("attackCV"), cvIn("decayCV"),
      cvIn("sustainCV"), cvIn("releaseCV"),
      { id: "env", direction: "output", signal: "cv", channels: 1 },
      { id: "attackGate", direction: "output", signal: "gate", channels: 1 },
      { id: "decayGate", direction: "output", signal: "gate", channels: 1 },
      { id: "sustainGate", direction: "output", signal: "gate", channels: 1 },
      { id: "releaseGate", direction: "output", signal: "gate", channels: 1 }
    ] },
    { type: "mixer", ports: ["ch1", "ch2", "ch3", "ch4"].map(audioIn).concat([
      { id: "main", direction: "output", signal: "audio" },
      { id: "inverted", direction: "output", signal: "audio" }
    ]) },
    { type: "out", ports: [audioIn("l"), audioIn("r")] }
  ]);
  const cable = (fromModule, fromPort, toModule, toPort) => ({
    from: { module: fromModule, port: fromPort }, to: { module: toModule, port: toPort }
  });
  return validateGraph(registry,
    [{ id: "out1", type: "out" }, { id: "mixer1", type: "mixer" }, { id: "adsr1", type: "adsr" }],
    [cable("adsr1", "env", "mixer1", "ch1"), cable("mixer1", "main", "out1", "l")]);
}

function buildADSRMixerRack(engine) {
  engine.mkInst("out1", "out", { lv: 1, mu: 0 });
  engine.mkInst("mixer1", "mixer", { gain: [1, 0, 0, 0] });
  engine.mkInst("adsr1", "adsr", {
    attack: 0, decay: 0, sustain: 0.5, release: 0, shape: 0, retrigger: 1, button: 0
  });
  engine.idxE();
  engine.cab.push(
    { a: "adsr1.env", b: "mixer1.ch1" },
    { a: "mixer1.main", b: "out1.l" }
  );
  engine.rebuild();
  engine.setInput("adsr1.gate", 10);
}

test("topological ADSR envelope and four stage gates route through Mixer to Audio Out", () => {
  const engine = createEngineHarness();
  const plan = makeADSRMixerPlan();
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.order, ["adsr1", "mixer1", "out1"]);
  buildADSRMixerRack(engine);
  assert.equal(engine.setGraphExecutionOrder(plan.order), true);
  const state = engine.I.adsr1.r;
  const gates = state.gates;
  const inputScratch = state.inputs;
  engine.step();
  assert.equal(state.stage, ADSRDSP.STAGE.ATTACK);
  assert.ok(state.env > 0 && state.env < 10);
  assert.deepEqual(Array.from(state.gates), [10, 0, 0, 0]);
  assert.equal(engine.V[engine.sig("adsr1.env")], state.env);
  assert.equal(engine.V[engine.sig("adsr1.attackGate")], 10);
  assert.equal(engine.V[engine.sig("mixer1.main")], state.env);
  const [left, right] = engine.output();
  assert.ok(Math.abs(left - Math.tanh(state.env * 0.2)) < 1e-9);
  assert.ok(Math.abs(right - left) < 1e-9);
  for (let i = 0; i < 300; i++) engine.step();
  assert.equal(state.stage, ADSRDSP.STAGE.SUSTAIN);
  assert.equal(state.env, 5);
  assert.deepEqual(Array.from(state.gates), [0, 0, 10, 0]);
  engine.setInput("adsr1.gate", 0);
  engine.step();
  assert.equal(state.stage, ADSRDSP.STAGE.RELEASE);
  assert.deepEqual(Array.from(state.gates), [0, 0, 0, 10]);
  for (let i = 0; i < 140; i++) engine.step();
  assert.equal(state.stage, ADSRDSP.STAGE.IDLE);
  assert.equal(state.env, 0);
  assert.strictEqual(state.gates, gates);
  assert.strictEqual(state.inputs, inputScratch);
});

test("ADSR remains active in legacy fallback when an unsupported module is present", () => {
  const engine = createEngineHarness();
  const plan = makeADSRMixerPlan();
  buildADSRMixerRack(engine);
  engine.mkInst("mid1", "mid", {});
  engine.idxE();
  assert.equal(engine.setGraphExecutionOrder(plan.order), false);
  engine.step();
  assert.equal(engine.I.adsr1.r.stage, ADSRDSP.STAGE.ATTACK);
  assert.ok(engine.I.adsr1.r.env > 0);
  assert.equal(engine.V[engine.sig("adsr1.attackGate")], 10);
});
