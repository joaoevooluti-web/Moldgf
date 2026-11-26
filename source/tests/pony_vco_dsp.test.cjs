const test = require("node:test");
const assert = require("node:assert/strict");
const Pony = require("../app/src/main/assets/pony_vco_dsp.js");

test("frequency follows octave, range and 1V/oct pitch controls", () => {
  assert.ok(Math.abs(Pony.frequency({ octave: 3, range: 1, freq: 0 }, 0) - Pony.C4) < 1e-9);
  assert.ok(Math.abs(Pony.frequency({ octave: 3, range: 1, freq: 0 }, 1) - 2 * Pony.C4) < 1e-9);
  assert.ok(Math.abs(Pony.frequency({ octave: 3, range: 2, freq: 0.5 }, 0) - Pony.C4 * Math.pow(2, 1/24)) < 1e-9);
});

test("polyBLEP saw and pulse waveforms remain bounded at phase discontinuities", () => {
  for (const phase of [0, 0.001, 0.1, 0.5, 0.999]) {
    assert.ok(Math.abs(Pony.saw(phase, 0.01)) <= 1.1);
    assert.ok(Math.abs(Pony.square(phase, 0.3, 0.01)) <= 1.1);
  }
});

test("four waveform modes produce finite output at the expected five-volt scale", () => {
  for (let waveform = 0; waveform < 4; waveform++) {
    const result = Pony.process({ range: 0, octave: 3, freq: 0, timbre: 0.5, waveform }, { voct: 0, tzfm: 0, timbre: 0, sync: 0, vca: 10 }, Pony.createState(), 48000);
    assert.ok(Number.isFinite(result.output));
    assert.ok(Math.abs(result.output) <= 5);
  }
});

test("through-zero FM reverses phase motion when modulation exceeds negative unity", () => {
  const state = Pony.createState();
  const params = { range: 1, octave: 3, freq: 0, timbre: 0, waveform: 0 };
  const forward = Pony.process(params, { voct: 0, tzfm: 0, timbre: 0, sync: 0, vca: 10 }, state, 48000);
  const reverse = Pony.process(params, { voct: 0, tzfm: -2, timbre: 0, sync: 0, vca: 10 }, state, 48000);
  assert.ok(reverse.phase < forward.phase);
});

test("hard sync resets phase on a rising edge and uses waveform-specific phase", () => {
  const state = Pony.createState();
  const params = { range: 1, octave: 3, freq: 0, timbre: 0, waveform: 0 };
  Pony.process(params, { voct: 0, tzfm: 0, timbre: 0, sync: 0, vca: 10 }, state, 48000);
  const result = Pony.process(params, { voct: 0, tzfm: 0, timbre: 0, sync: 5, vca: 10 }, state, 48000);
  assert.ok(result.phase > 0.25);
  assert.equal(result.state.syncHigh, true);
});

test("timbre changes pulse width and VCA input scales the output", () => {
  const params = { range: 1, octave: 3, freq: 0, timbre: 0.5, waveform: 3 };
  const full = Pony.process(params, { voct: 0, tzfm: 0, timbre: 0, sync: 0, vca: 10 }, Pony.createState(), 48000);
  const half = Pony.process(params, { voct: 0, tzfm: 0, timbre: 0, sync: 0, vca: 5 }, Pony.createState(), 48000);
  assert.equal(half.output, full.output / 2);
  assert.equal(Pony.clamp(0.5, 0.05, 0.95), 0.5);
});

test("processInto returns state and reuses its input scratch", () => {
  const state = Pony.createState();
  const inputs = state.inputs;
  const params = { range: 1, octave: 3, freq: 0, timbre: 0.5, waveform: 0 };
  inputs.voct = 1; inputs.vca = 10;
  const result = Pony.processInto(params, inputs, state, 48000);
  assert.strictEqual(result, state);
  assert.strictEqual(state.inputs, inputs);
  assert.ok(state.output > 0);
  assert.equal(state.frequency, 2 * Pony.C4);
  assert.equal(state.out, state.output);
});

test("reset preserves state and scratch identities while clearing phase, sync and readouts", () => {
  const state = Pony.createState();
  const inputs = state.inputs;
  const params = { range: 1, octave: 3, freq: 0, timbre: 0.5, waveform: 0 };
  inputs.sync = 5; inputs.vca = 10;
  Pony.processInto(params, inputs, state, 48000);
  assert.ok(state.phase > 0);
  assert.equal(state.syncHigh, true);
  Pony.reset(state);
  assert.strictEqual(state.inputs, inputs);
  assert.equal(state.phase, 0);
  assert.equal(state.syncHigh, false);
  assert.equal(state.output, 0);
  assert.equal(state.frequency, 0);
  assert.equal(inputs.vca, null);
});

test("legacy process returns independent snapshots and processInto supports sample-rate changes", () => {
  const state = Pony.createState();
  const params = { range: 1, octave: 3, freq: 0, timbre: 0.5, waveform: 2 };
  const inputs = { voct: 0, tzfm: 0, timbre: 0, sync: 0, vca: 10 };
  const a = Pony.process(params, inputs, state, 48000);
  const phase = state.phase;
  Pony.processInto(params, inputs, state, 96000);
  const b = Pony.process(params, inputs, state, 96000);
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(a, state);
  assert.strictEqual(a.state, state);
  assert.ok(state.phase > phase);
  assert.ok(Number.isFinite(state.output));
});
