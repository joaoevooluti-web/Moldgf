(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfPercallDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const OFF = 0, ATTACK = 1, DECAY = 2;
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function strengthFromVoltage(voltage) {
    if (voltage === null || voltage === undefined) return 1;
    return Math.sqrt(clamp(finite(voltage) / 10, 0, 1, 0));
  }
  function decayTime(control, cv) {
    const x = clamp(clamp(control, 0, 1, 0) + finite(cv) * 0.05, 0, 1, 0);
    return 0.0045 + x * x * (4 - 0.0045);
  }
  function isState(s) {
    return !!s && Array.isArray(s.env) && Array.isArray(s.stage) &&
      Array.isArray(s.attackElapsed) && Array.isArray(s.decayElapsed) &&
      Array.isArray(s.triggerHigh) && Array.isArray(s.normalizedAudio) &&
      Array.isArray(s.channels) && Array.isArray(s.out) && Array.isArray(s.envOut) &&
      Array.isArray(s.gains) && !!s.inputs && !!s.params && !!s.result;
  }
  function createState() {
    const env = [0,0,0,0], stage = [OFF,OFF,OFF,OFF];
    const attackElapsed = [0,0,0,0], decayElapsed = [0,0,0,0];
    const triggerHigh = [false,false,false,false];
    const normalizedAudio = [0,0,0,0], channels = [0,0,0,0];
    const out = [0,0,0,0], envOut = [0,0,0,0], gains = [0,0,0,0];
    const inputs = { audio:[null,null,null,null], trigger:[0,0,0,0],
      decayCV:[0,0,0,0], strength:null, outputPatched:[false,false,false] };
    const params = { volume:[1,1,1,1], decay:[0,0,0,0], choke:[false,false] };
    const state = { env, stage, attackElapsed, decayElapsed, triggerHigh,
      normalizedAudio, channels, out, envOut, gains, inputs, params, result:null };
    state.result = { outputs:out, env:envOut, strength:1, gains, stages:stage, state };
    return state;
  }
  function reset(state) {
    const s = isState(state) ? state : createState();
    for (let i = 0; i < 4; i++) {
      s.env[i] = 0; s.stage[i] = OFF; s.attackElapsed[i] = 0;
      s.decayElapsed[i] = 0; s.triggerHigh[i] = false;
      s.normalizedAudio[i] = 0; s.channels[i] = 0;
      s.out[i] = 0; s.envOut[i] = 0; s.gains[i] = 0;
      s.inputs.audio[i] = null; s.inputs.trigger[i] = 0; s.inputs.decayCV[i] = 0;
      s.params.volume[i] = 1; s.params.decay[i] = 0;
    }
    for (let i = 0; i < 3; i++) s.inputs.outputPatched[i] = false;
    s.inputs.strength = null; s.params.choke[0] = false; s.params.choke[1] = false;
    s.result.strength = 1;
    return s;
  }
  function processInto(inputs, params, state, sampleTime) {
    const s = isState(state) ? state : createState();
    const I = inputs || s.inputs, P = params || s.params;
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    const strength = strengthFromVoltage(I.strength);
    const audioIn = I.audio, triggerIn = I.trigger, decayCVIn = I.decayCV;
    const volume = P.volume, decay = P.decay, choke = P.choke;
    const outputPatched = I.outputPatched;
    for (let i = 0; i < 4; i++) {
      let audio = audioIn ? audioIn[i] : null;
      if ((i & 1) === 1 && (audio === null || audio === undefined)) audio = s.normalizedAudio[i - 1];
      s.normalizedAudio[i] = audio === null || audio === undefined ? 0 : finite(audio);
      s.gains[i] = Math.pow(clamp(volume ? volume[i] : 1, 0, 1, 1), 2) * strength;
      const trig = finite(triggerIn ? triggerIn[i] : 0);
      const high = s.triggerHigh[i] ? trig > 0.1 : trig >= 2;
      if (!s.triggerHigh[i] && high) {
        s.stage[i] = ATTACK; s.attackElapsed[i] = 0; s.decayElapsed[i] = 0; s.env[i] = 0;
      }
      s.triggerHigh[i] = high;
      if ((i & 1) === 1 && choke && choke[(i - 1) >> 1] && s.stage[i - 1] === ATTACK) {
        s.stage[i] = OFF; s.env[i] = 0;
      }
      if (s.stage[i] === ATTACK) {
        s.attackElapsed[i] += dt;
        s.env[i] = clamp(s.attackElapsed[i] / 0.0015, 0, 1, 0);
        if (s.attackElapsed[i] >= 0.0015) { s.stage[i] = DECAY; s.env[i] = 1; }
      } else if (s.stage[i] === DECAY) {
        const duration = decayTime(decay ? decay[i] : 0, decayCVIn ? decayCVIn[i] : 0);
        s.decayElapsed[i] += dt;
        s.env[i] = Math.exp(-5 * s.decayElapsed[i] / duration);
        if (s.env[i] < 0.0001) { s.env[i] = 0; s.stage[i] = OFF; }
      }
      s.channels[i] = s.normalizedAudio[i] * s.gains[i] * s.env[i];
      s.out[i] = s.channels[i];
      s.envOut[i] = s.env[i] * 10 * strength;
    }
    let mix = s.channels[3];
    for (let i = 0; i < 3; i++) if (!outputPatched || !outputPatched[i]) mix += s.channels[i];
    s.out[3] = mix;
    s.result.strength = strength;
    return s.result;
  }
  function process(inputs, params, state, sampleTime) {
    const s = isState(state) ? state : createState();
    const result = processInto(inputs, params, s, sampleTime);
    return { outputs:result.outputs.slice(), env:result.env.slice(), strength:result.strength,
      gains:result.gains.slice(), stages:result.stages.slice(), state:s };
  }
  return Object.freeze({ OFF, ATTACK, DECAY, finite, clamp, strengthFromVoltage, decayTime, isState, createState, reset, processInto, process });
});