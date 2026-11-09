(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfADSRDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const STAGE = Object.freeze({ IDLE: 0, ATTACK: 1, DECAY: 2, SUSTAIN: 3, RELEASE: 4 });
  function finite(value) { return Number.isFinite(value) ? value : 0; }
  function clamp(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }
  function stageTime(control, cv, minimum, minimumWithNegativeCV) {
    const p = clamp(control, 0, 1, 0) + clamp(cv, -10, 10, 0) / 10;
    if (p < 0) return minimum * Math.pow((minimumWithNegativeCV || minimum) / minimum, -p);
    return minimum * Math.pow(10 / minimum, clamp(p, 0, 1, 0));
  }
  function curve(progress, shape) {
    const t = clamp(progress, 0, 1, 0);
    const s = clamp(shape, -1, 1, 0);
    if (s < 0) return Math.pow(t, 1 + 4 * -s);
    if (s > 0) return 1 - Math.pow(1 - t, 1 + 4 * s);
    return t;
  }
  function createState() {
    return { initialized: false, env: 0, stage: STAGE.IDLE, progress: 0, start: 0, target: 0, gateHigh: false, triggerHigh: false, buttonHigh: false };
  }
  function process(params, inputs, state, sampleTime) {
    const s = state || createState();
    if (!s.initialized) { Object.assign(s, createState(), { initialized: true }); }
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    const gate = finite(inputs.gate) >= 1 || !!params.button;
    const trigger = finite(inputs.trigger) >= 1;
    const gateRising = gate && !s.gateHigh;
    const triggerRising = trigger && !s.triggerHigh;
    const buttonRising = !!params.button && !s.buttonHigh;
    const startAttack = gateRising || triggerRising || buttonRising;
    const gateFalling = !gate && s.gateHigh;
    s.gateHigh = gate;
    s.triggerHigh = trigger;
    s.buttonHigh = !!params.button;
    if (startAttack && (params.retrigger !== false || s.stage === STAGE.IDLE || s.stage === STAGE.RELEASE)) {
      s.stage = STAGE.ATTACK;
      s.progress = 0;
      s.start = s.env;
      s.target = 10;
    } else if (gateFalling && s.stage !== STAGE.IDLE && s.stage !== STAGE.RELEASE) {
      s.stage = STAGE.RELEASE;
      s.progress = 0;
      s.start = s.env;
      s.target = 0;
    }
    if (s.stage === STAGE.ATTACK || s.stage === STAGE.DECAY || s.stage === STAGE.RELEASE) {
      const key = s.stage === STAGE.ATTACK ? "attack" : s.stage === STAGE.DECAY ? "decay" : "release";
      const cvKey = key + "CV";
      const minimum = key === "attack" ? 0.003 : 0.0028;
      const duration = stageTime(params[key], inputs[cvKey], minimum, key === 'attack' ? 0.0002 : 0.0004);
      s.progress = Math.min(1, s.progress + dt / duration);
      const shaped = curve(s.progress, params.shape);
      s.env = s.start + (s.target - s.start) * shaped;
      if (s.progress >= 1) {
        s.env = s.target;
        s.progress = 0;
        if (s.stage === STAGE.ATTACK) {
          s.stage = STAGE.DECAY;
          s.start = s.env;
          s.target = clamp(params.sustain + finite(inputs.sustainCV) / 10, 0, 1, 0.5) * 10;
        } else if (s.stage === STAGE.DECAY) {
          if (gate) {
            s.stage = STAGE.SUSTAIN;
            s.start = s.env;
            s.target = s.env;
          } else {
            s.stage = STAGE.RELEASE;
            s.start = s.env;
            s.target = 0;
          }
        } else {
          s.stage = STAGE.IDLE;
          s.start = s.env = 0;
          s.target = 0;
        }
      }
    } else if (s.stage === STAGE.SUSTAIN) {
      s.env = clamp(params.sustain + finite(inputs.sustainCV) / 10, 0, 1, 0.5) * 10;
      if (!gate) {
        s.stage = STAGE.RELEASE;
        s.progress = 0;
        s.start = s.env;
        s.target = 0;
      }
    }
    s.env = clamp(s.env, 0, 10, 0);
    return {
      envelope: s.env,
      gates: [s.stage === STAGE.ATTACK, s.stage === STAGE.DECAY, s.stage === STAGE.SUSTAIN, s.stage === STAGE.RELEASE].map(on => on ? 10 : 0),
      stage: s.stage,
      state: s
    };
  }
  return Object.freeze({ STAGE, finite, clamp, stageTime, curve, createState, process });
});
