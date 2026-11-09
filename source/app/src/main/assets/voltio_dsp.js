(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoldgfVoltioDSP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SEMITONES = 12;
  function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }
  function sourceVoltage(octave, semitone, bipolar) {
    const oct = bipolar ? clamp(octave, -5, 5, 0) : clamp(octave, 0, 10, 0);
    const semi = clamp(semitone, 0, SEMITONES - 1, 0);
    return oct + semi / SEMITONES;
  }
  function process(sumInput, octave, semitone, bipolar) {
    const external = Number.isFinite(sumInput) ? sumInput : 0;
    return sourceVoltage(octave, semitone, bipolar) + external;
  }
  return Object.freeze({ clamp, sourceVoltage, process });
});
