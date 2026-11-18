(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfADSRDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const STAGE = Object.freeze({ IDLE: 0, ATTACK: 1, DECAY: 2, SUSTAIN: 3, RELEASE: 4 });
  const EMPTY_PARAMS = Object.freeze({ attack: 0, decay: 0, sustain: 0.5, release: 0, shape: 0, retrigger: true, button: false });
  const EMPTY_INPUTS = Object.freeze({ gate: 0, trigger: 0, attackCV: 0, decayCV: 0, sustainCV: 0, releaseCV: 0 });
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
    return {
      initialized: true, env: 0, stage: STAGE.IDLE, progress: 0, start: 0, target: 0,
      gateHigh: false, triggerHigh: false, buttonHigh: false,
      gates: [0, 0, 0, 0],
      inputs: { gate: 0, trigger: 0, attackCV: 0, decayCV: 0, sustainCV: 0, releaseCV: 0 }
    };
  }
  function reset(state) {
    const s = state && typeof state === "object" ? state : createState();
    s.initialized = true;
    s.env = 0;
    s.stage = STAGE.IDLE;
    s.progress = 0;
    s.start = 0;
    s.target = 0;
    s.gateHigh = false;
    s.triggerHigh = false;
    s.buttonHigh = false;
    if (!Array.isArray(s.gates)) s.gates = [0, 0, 0, 0];
    else { s.gates[0] = 0; s.gates[1] = 0; s.gates[2] = 0; s.gates[3] = 0; }
    if (!s.inputs || typeof s.inputs !== "object") {
      s.inputs = { gate: 0, trigger: 0, attackCV: 0, decayCV: 0, sustainCV: 0, releaseCV: 0 };
    } else {
      s.inputs.gate = 0; s.inputs.trigger = 0; s.inputs.attackCV = 0;
      s.inputs.decayCV = 0; s.inputs.sustainCV = 0; s.inputs.releaseCV = 0;
    }
    return s;
  }
  // Real-time path: mutates caller-owned state and returns one primitive sample.
  // With createState(), this path creates no objects or arrays per sample.
  function processInto(params, inputs, state, sampleTime) {
    if (!state || typeof state !== "object") return 0;
    const p = params || EMPTY_PARAMS;
    const i = inputs || EMPTY_INPUTS;
    const s = state;
    if (!s.initialized || !Array.isArray(s.gates) || !s.inputs) reset(s);
    const dt = clamp(sampleTime, 1 / 192000, 0.1, 1 / 48000);
    const button = !!p.button;
    const gate = finite(i.gate) >= 1 || button;
    const trigger = finite(i.trigger) >= 1;
    const gateRising = gate && !s.gateHigh;
    const triggerRising = trigger && !s.triggerHigh;
    const buttonRising = button && !s.buttonHigh;
    const startAttack = gateRising || triggerRising || buttonRising;
    const gateFalling = !gate && s.gateHigh;
    const triggerMode = p.mode === 1 || p.mode === "trigger";
    s.gateHigh = gate;
    s.triggerHigh = trigger;
    s.buttonHigh = button;
    const retrigger = p.retrigger !== false && p.retrigger !== 0;
    if (startAttack && (retrigger || s.stage === STAGE.IDLE || s.stage === STAGE.RELEASE)) {
      s.stage = STAGE.ATTACK;
      s.progress = 0;
      s.start = s.env;
      s.target = 10;
    } else if (gateFalling && !triggerMode && s.stage !== STAGE.IDLE && s.stage !== STAGE.RELEASE) {
      s.stage = STAGE.RELEASE;
      s.progress = 0;
      s.start = s.env;
      s.target = 0;
    }
    if (s.stage === STAGE.ATTACK || s.stage === STAGE.DECAY || s.stage === STAGE.RELEASE) {
      let control, cv, minimum = 0.0028, minimumWithNegativeCV = 0.0004;
      if (s.stage === STAGE.ATTACK) {
        control = p.attack; cv = i.attackCV; minimum = 0.003; minimumWithNegativeCV = 0.0002;
      } else if (s.stage === STAGE.DECAY) {
        control = p.decay; cv = i.decayCV;
      } else {
        control = p.release; cv = i.releaseCV;
      }
      const duration = stageTime(control, cv, minimum, minimumWithNegativeCV);
      s.progress = Math.min(1, s.progress + dt / duration);
      const shaped = curve(s.progress, p.shape);
      s.env = s.start + (s.target - s.start) * shaped;
      if (s.progress >= 1) {
        s.env = s.target;
        s.progress = 0;
        if (s.stage === STAGE.ATTACK) {
          s.stage = STAGE.DECAY;
          s.start = s.env;
          s.target = clamp(p.sustain + finite(i.sustainCV) / 10, 0, 1, 0.5) * 10;
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
      s.env = clamp(p.sustain + finite(i.sustainCV) / 10, 0, 1, 0.5) * 10;
      if (!gate) {
        s.stage = STAGE.RELEASE;
        s.progress = 0;
        s.start = s.env;
        s.target = 0;
      }
    }
    s.env = clamp(s.env, 0, 10, 0);
    s.gates[0] = s.stage === STAGE.ATTACK ? 10 : 0;
    s.gates[1] = s.stage === STAGE.DECAY ? 10 : 0;
    s.gates[2] = s.stage === STAGE.SUSTAIN ? 10 : 0;
    s.gates[3] = s.stage === STAGE.RELEASE ? 10 : 0;
    return s.env;
  }
  // Compatibility wrapper for non-real-time callers; intentionally returns a fresh result record.
  function process(params, inputs, state, sampleTime) {
    const s = state || createState();
    const envelope = processInto(params, inputs, s, sampleTime);
    return { envelope, gates: [s.gates[0], s.gates[1], s.gates[2], s.gates[3]], stage: s.stage, state: s };
  }
  return Object.freeze({ STAGE, finite, clamp, stageTime, curve, createState, reset, processInto, process });
});
