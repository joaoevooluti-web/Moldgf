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
  function createState() {
    return { env: [0,0,0,0], stage: [OFF,OFF,OFF,OFF], attackElapsed: [0,0,0,0], decayElapsed: [0,0,0,0], triggerHigh: [false,false,false,false] };
  }
  function process(inputs, params, state, sampleTime) {
    const s = state || createState();
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    const strength = strengthFromVoltage(inputs.strength);
    const gains = params.volume.map(v => Math.pow(clamp(v, 0, 1, 1), 2) * strength);
    const audio = inputs.audio.slice();
    for (let i = 1; i < 4; i += 2) {
      if (audio[i] === null || audio[i] === undefined) audio[i] = audio[i - 1];
    }
    for (let i = 0; i < 4; i++) {
      const trig = finite(inputs.trigger[i]);
      const high = s.triggerHigh[i] ? trig > 0.1 : trig >= 2;
      if (!s.triggerHigh[i] && high) {
        s.stage[i] = ATTACK;
        s.attackElapsed[i] = 0;
        s.decayElapsed[i] = 0;
        s.env[i] = 0;
      }
      s.triggerHigh[i] = high;
      if ((i & 1) === 1 && params.choke[(i - 1) >> 1] && s.stage[i - 1] === ATTACK) {
        s.stage[i] = OFF;
        s.env[i] = 0;
      }
      if (s.stage[i] === ATTACK) {
        s.attackElapsed[i] += dt;
        s.env[i] = clamp(s.attackElapsed[i] / 0.0015, 0, 1, 0);
        if (s.attackElapsed[i] >= 0.0015) {
          s.stage[i] = DECAY;
          s.env[i] = 1;
        }
      } else if (s.stage[i] === DECAY) {
        const duration = decayTime(params.decay[i], inputs.decayCV[i]);
        s.decayElapsed[i] += dt;
        s.env[i] = Math.exp(-5 * s.decayElapsed[i] / duration);
        if (s.env[i] < 0.0001) {
          s.env[i] = 0;
          s.stage[i] = OFF;
        }
      }
    }
    const channel = new Array(4);
    for (let i = 0; i < 4; i++) {
      const input = audio[i] === null || audio[i] === undefined ? 0 : finite(audio[i]);
      channel[i] = input * gains[i] * s.env[i];
    }
    let mix = channel[3];
    for (let i = 0; i < 3; i++) if (!inputs.outputPatched[i]) mix += channel[i];
    const outputs = channel.slice();
    outputs[3] = mix;
    const env = s.env.map(v => v * 10 * strength);
    return { outputs, env, strength, gains, stages: s.stage.slice(), state: s };
  }
  return Object.freeze({ OFF, ATTACK, DECAY, finite, clamp, strengthFromVoltage, decayTime, createState, process });
});
