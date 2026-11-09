# Moldgf — Befaco module port roadmap

Status: active implementation. No Befaco module is counted as complete until its DSP, patch ports, state handling, tests, and Android build evidence are present.

## Goal

Implement the 34 modules listed in the Befaco VCV Library as native, interoperable modules in Moldgf for Android. The target is functional DSP and patch connectivity, not static panel mockups.

## Catalogue scope

1. Even VCO
2. Rampage
3. A*B+C
4. Spring Reverb
5. Mixer (four-channel audio/CV)
6. Slew Limiter
7. Dual Atenuverter
8. Percall
9. Hex Mix VCA
10. Chopping Kinky
11. Kickall
12. Sampling Modulator
13. Morphader
14. ADSR
15. STMix
16. Muxlicer
17. Mex
18. Noise Plethora
19. Stereo Strip
20. PonyVCO
21. Motion MTR
22. Burst
23. MIDI Thing V2
24. Voltio
25. Octaves
26. Bypass
27. Bandit
28. Mixer (compact utility mixer)
29. Atte
30. AxBC
31. Slew
32. MuDi
33. Iroi
34. Random8

## Engineering rules

- Keep the existing application entry point, WebView bridge, MIDI service, and native/WASM build working; do not replace them until source inspection and regression tests prove a replacement safe.
- First identify the current audio graph, sample format, block size, clock source, threading model, and WebView/native bridge contract.
- DSP must run off the UI thread, use preallocated buffers, avoid per-sample/per-block heap allocation, and have deterministic reset/bypass behavior.
- Define one module contract for metadata, parameters, input/output ports, polyphony, state serialization, sample-rate changes, and processing.
- Patch cables must connect typed ports with explicit mono/poly and audio/CV/gate semantics. Prevent feedback cycles from causing undefined execution; provide a documented delay/feedback policy.
- Parameter changes from the UI must be timestamped or safely queued to the audio thread. UI rendering must never block audio.
- Persist patch topology and module state versionedly; support migration when parameter schemas change.
- Add deterministic unit tests for DSP math, boundary conditions, silence, clipping, reset, sample-rate changes, and state round-trips. Add graph-level integration tests for routing and mixed module patches.
- Do not claim real-time performance, low latency, or audio correctness until measured on target Android devices.
- Use original Moldgf panel artwork and interaction design. Do not copy Befaco logos, proprietary panel graphics, or imply official endorsement.

## Proposed implementation phases

### Phase 0 — Source and build audit
- [x] Extract and inspect the current `eurorack-android (1).zip` source tree.
- [x] Read README, Gradle files, Android manifest, Kotlin services, HTML/JS, native C++, WASM build script, and CI workflow.
- [x] Establish a clean baseline APK build and capture the artifact.
- [ ] Add regression coverage for MIDI parser edge cases and AudioWorklet/ScriptProcessor equivalence.
- [ ] Record a repeatable audio graph smoke test and inspect the Beads native self-test output.

### Phase 1 — Modular engine foundation
- [x] Add a standalone module descriptor registry and typed-port/graph validation contract.
- [x] Add automated Node tests for registry validation, signal direction/types, channel compatibility, topological order, and explicit feedback-delay handling (6/6 passed in workflow 42539116720, commit c231aaa4ecb3601f1423c84dbfa0710f7e59edc4).
- [ ] Integrate the contract with the existing jack/cable model without changing legacy DSP behavior.
- [ ] Add parameter event queue, state schema/versioning, reset/bypass contract, and scheduler integration.
- [ ] Migrate existing module types through adapters; keep Worklet and ScriptProcessor paths behaviorally aligned.

### Phase 2 — Utility and routing modules
- [ ] Atte, Dual Atenuverter, Voltio, A*B+C, AxBC, Bypass, both Mixer variants, STMix, Morphader, Hex Mix VCA, and Motion MTR.
- [ ] Validate gain staging, polarity, summing, stereo routing, and clipping.

### Phase 3 — Modulation, envelopes, and timing
- [ ] Slew Limiter, Slew, Rampage, ADSR, Percall, Burst, MuDi, Sampling Modulator, Random8, Muxlicer, and Mex.
- [ ] Validate gate edge handling, clock accuracy, retrigger behavior, deterministic seeded random tests, and expander synchronization.

### Phase 4 — Oscillators, voices, and noise
- [ ] Even VCO, PonyVCO, Octaves, Kickall, and Noise Plethora.
- [ ] Validate pitch tracking, anti-aliasing, FM behavior, waveform levels, envelope response, and CPU cost.

### Phase 5 — Effects and spectral processing
- [ ] Spring Reverb, Iroi, Bandit, Chopping Kinky, and Stereo Strip.
- [ ] Validate stability, denormals, parameter smoothing, stereo image, tail handling, and CPU/memory budgets.

### Phase 6 — MIDI, UI, and release validation
- [ ] MIDI Thing V2 integration with the existing Android MIDI service.
- [ ] Complete patch save/load, UI accessibility, touch interaction, automation, and preset coverage.
- [ ] Run CI, install/build verification, audio graph regression suite, and target-device performance tests.

## Licensing and provenance

The VCVRack/Befaco repository identifies its plugin as GPL-3.0-or-later. If Moldgf copies or adapts that source, preserve copyright and license notices, provide the corresponding source and GPL obligations for distributed derivative work, and review all bundled dependencies and assets individually. A clean-room implementation based on published behavior/specifications may have a different provenance; obtain legal review before distribution if licensing is uncertain.

## Current status — 2026-11-08

- Working boundary: all changes are confined to `feature/befaco-modules`; `main` remains untouched.
- Source extraction: [workflow 42537553688](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537553688) succeeded; extracted tree is committed under `source/` at `c673d68296a3308482c66f02cc4507aad32bd9d2`.
- Baseline APK: [workflow 42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041) completed with `success` on commit `712383976ff952f0aa83312fd6b5d12d7b5b5339`. Emscripten setup, Plaits/Beads WASM build step, Gradle `assembleDebug`, and APK upload all passed. The graph-contract change is undergoing a fresh full APK build in [workflow 42539116720](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539116720); its 6 Node graph tests have passed.
- Published artifact: `eurorack-study-debug-apk`, artifact ID `13640156829`, 1,262,191 bytes, SHA-256 `8664bd134566e44435993bfa9c7586fc499fcef9846c684b48cbd87ac6709e56`; GitHub retention through 2027-02-06. This proves CI packaging only, not installation or audio validation on a device.
- Existing engine audit: the 129 KB `index.html` embeds the engine, has AudioWorklet and ScriptProcessor fallback, a string-keyed signal store, summed input lookup, cable list, and hard-coded `step()` processing order. Current module registration and UI are distributed across `INIT`, `INITR`, `byT`, `mkInst`, `idxE`, `step`, `TY`, and handlers.
- Existing rack types: MIDI→CV, Pamela PRO, Scales, Plaits, Mixer 4→2, Axon-2, PPEXP1, PPEXP2, Polaris, CV→MIDI, BBD, Beads, and Audio Out. None of the 34 requested Befaco modules is implemented as a dedicated type.
- The graph currently has no explicit signal type/channel metadata or graph-cycle validation. Existing legacy patches must remain compatible while the new graph contract is integrated behind adapters.
- Android host uses WebViewAssetLoader, Android MIDI APIs, SharedPreferences bridge, and document picker. Plaits and Beads have optional WASM builds with JS fallbacks; Beads also has a native self-test in the build script.

## Immediate next steps

1. Run the new graph contract tests and Android baseline workflow on the updated branch.
2. Integrate graph validation with the existing jack IDs and cable persistence, preserving legacy patch loading.
3. Implement the first utility DSP module (Atte), including descriptor, UI, CV/audio semantics, state persistence, and DSP tests.
4. Continue in small groups with automated tests before moving to modulation, oscillators, and effects.
