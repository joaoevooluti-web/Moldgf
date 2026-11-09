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
- [x] Integrate endpoint/port-direction validation with the existing jack/cable model. Legacy ports retain permissive signal compatibility until their true audio/CV/gate metadata is declared, preserving existing patch behavior.
- [ ] Add parameter event queue, state schema/versioning, reset/bypass contract, and scheduler integration.
- [ ] Migrate existing module types through adapters; keep Worklet and ScriptProcessor paths behaviorally aligned.

### Phase 2 — Utility and routing modules
- [x] Atte — four attenuator/inverter channels, cascaded input normaling, selectable +1/+5/+10 V first-channel normal, individual outputs, and saved control state; dedicated DSP tests pass.
- [~] Dual Atenuverter — DSP core, two input/output channels, IN A→IN B normaling, bipolar attenuverter, ±10 V offset, output polarity indicators, graph descriptor, rack UI, five DSP tests and three graph-port tests authored; DSP boundary assertions and all inline-script syntax checks passed in the local V8 validation, while the Node test suite and APK build remain deferred to the five-module batch.
- [~] Voltio — clean-room 1 V/oct source, 12-tone semitone steps, selectable 0–10 V / ±5 V octave range, precision sum input, graph routing, rack controls and four DSP tests plus three graph-port tests authored; pending batch test/build validation.
- [~] A*B+C (ABC) — dual four-quadrant VCA/ring-modulator sections; B normalled to +5 V and C to +10 V; B gain spans −2×..+2×, C offset −1×..+1× with bipolar response; ±10 V clipping; OUT2 sums channel 1 until OUT1 is patched; graph ports and six DSP tests plus two graph tests authored. Pending batch validation.
- [~] AxBC — separate legacy two-channel A×B+C variant; B/C normalled to +5 V, per-path attenuators with ×1/×2/×−1 gain switches, MULT A1→A2 normaling, MIX bus on OUT2 while OUT1 is unpatched, ±10 V clipping, graph ports and six DSP tests plus three graph tests authored. Pending batch validation.
- [~] Bypass (Molten Bypass) — stereo send/return and main path, right-input normaling, momentary Launch control, CV latch/gate modes, hard/soft return behavior, FX gain taper, slew smoothing and optional saturation; eight DSP tests and three graph tests authored. Pending consolidated CI/APK validation.
- [~] Mixer2 — four gain-controlled channels, two pair buses, automatic 1+2 master normalization into 3+4 while MIX 1+2 is unpatched, optional ±10 V clipping, audio/CV graph ports and five DSP plus three graph tests authored.
- [~] Mixer — four independent level-controlled channels, main sum and inverted complementary output, bipolar meter, no clipping, audio/CV graph ports and five DSP plus three graph tests authored.
- [~] STMix — four stereo channels plus unity AUX, right-to-left normaling per channel, four gain controls, stereo output and meters; five DSP plus three graph tests authored.
- [~] Morphader — four A/B crossfader channels, master fader with lag, per-channel CV and CV1 normaling, audio equal-power/CV equal-sum modes, individual outs and OUT4 master summing; six DSP plus two graph tests authored.
- [~] Hexmix VCA — six CV-controlled VCAs, normalized +10 V CV, exponential/linear/logarithmic response shaping, five-channel mix normaling into output 6 with selectable independent mode; six DSP plus two graph tests authored.
- [~] Motion MTR — three channel modes (CV inversion, CV attenuation and audio gain), 10 V input normaling with configurable break in audio mode, independent outputs and OUT3 mix normalization; six DSP plus three graph tests authored.
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

- Working boundary: all changes are confined to `feature/befaco-modules`; `main` remains untouched (last verified SHA `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`).
- Build gate: do not start another workflow/APK build until five additional Befaco modules beyond Atte are ported and their automated tests are prepared. Interim commits use `[skip ci]`.
- Source extraction: [workflow 42537553688](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537553688) succeeded; extracted tree is committed under `source/` at `c673d68296a3308482c66f02cc4507aad32bd9d2`.
- Baseline APK: [workflow 42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041) completed with `success` on commit `712383976ff952f0aa83312fd6b5d12d7b5b5339`. Emscripten setup, Plaits/Beads WASM build step, Gradle `assembleDebug`, and APK upload all passed. The graph-contract change is undergoing a fresh full APK build in [workflow 42539116720](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539116720); its 6 Node graph tests have passed.
- Published artifact: `eurorack-study-debug-apk`, artifact ID `13640156829`, 1,262,191 bytes, SHA-256 `8664bd134566e44435993bfa9c7586fc499fcef9846c684b48cbd87ac6709e56`; GitHub retention through 2027-02-06. This proves CI packaging only, not installation or audio validation on a device.
- Existing engine audit: the 129 KB `index.html` embeds the engine, has AudioWorklet and ScriptProcessor fallback, a string-keyed signal store, summed input lookup, cable list, and hard-coded `step()` processing order. Current module registration and UI are distributed across `INIT`, `INITR`, `byT`, `mkInst`, `idxE`, `step`, `TY`, and handlers.
- Existing rack types: MIDI→CV, Pamela PRO, Scales, Plaits, Mixer 4→2, Axon-2, PPEXP1, PPEXP2, Polaris, CV→MIDI, BBD, Beads, and Audio Out. Befaco Atte is implemented; Dual Atenuverter is now integrated in the feature branch but awaits batch validation. The remaining catalogue modules are not yet ported.
- The new graph contract validates live jack endpoints and output-to-input direction. Legacy ports are mapped to the engine's actual mono channel model and permissive signal compatibility; typed audio/CV/gate semantics and cycle scheduling will be enabled module-by-module.
- Befaco Atte is implemented in the rack and audio engine: four independent attenuator/inverter channels, cascaded input normaling, selectable +1/+5/+10 V first-channel normal, per-channel gain/mode controls, independent outputs, and voltage readouts. Five dedicated DSP tests and the inline WebView/AudioWorklet syntax test passed in workflow [42539523295](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295); the debug APK artifact is [13641045420](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295). Workflow [42539485722](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722) also succeeded and published APK artifact [13641021006](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722). These runs validate CI packaging, not installation/audio on a physical device. The engine currently processes mono signals, so polyphonic parity remains future work.
- The five-module batch beyond Atte is implemented: Dual Atenuverter, Voltio, A*B+C (ABC), AxBC and Molten Bypass. Their DSP and graph tests are prepared: Dual Atenuverter (5 DSP + 3 graph), Voltio (4 + 3), ABC (6 + 2), AxBC (6 + 3), and Bypass (8 + 3). The local synchronous harness executed all 55 DSP/graph tests successfully; all inline scripts and six DSP files pass V8 syntax compilation. The inline-script CI test now asserts all six DSP assets and six registered module types, and both syntax/integration assertions pass in local V8 validation. The five-module build gate is satisfied, but no post-batch workflow run has appeared yet (latest available run remains #8 on the earlier Atte commit); a manual workflow_dispatch is still required because the current GitHub connection has not initiated a new Actions run. Physical-device/audio validation remains outstanding. The AudioWorklet bundle now loads seventeen DSP files (Atte, Dual Atenuverter, Voltio, ABC, AxBC, Bypass, Mixer2, Mixer, STMix, Morphader, Hexmix VCA, Motion MTR, Slew Limiter, Pony VCO, ADSR, Percall and MuDi); readouts use published audio-graph signals. Mixer2, Mixer, STMix, Morphader, Hexmix VCA, Motion MTR and Slew Limiter are integrated after the initial five-module batch, with dedicated DSP/graph tests and local syntax/direct-DSP checks. Across the current branch there are 152 Node tests authored. A local synchronous harness has executed all 150 DSP/graph tests successfully (initial batch 55, subsequent modules 95), and both inline-script/asset integration tests pass; both inline scripts compile in V8. The actual Node runner, Emscripten/WASM and APK packaging still await a consolidated GitHub Actions run. Pony VCO intentionally uses polyBLEP rather than the original VCV 12× oversampling pipeline; the difference is recorded as a fidelity limitation.
- Android host uses WebViewAssetLoader, Android MIDI APIs, SharedPreferences bridge, and document picker. Plaits and Beads have optional WASM builds with JS fallbacks; Beads also has a native self-test in the build script.

## Immediate next steps

1. Trigger one consolidated CI/APK workflow with workflow_dispatch; the five-module implementation and test gate is satisfied, but no new run has appeared yet.
2. Fix any Node, WASM or Gradle failures; confirm the published APK artifact and preserve the exact tested commit SHA.
3. Expand graph validation to typed signal semantics and explicit feedback scheduling as new module adapters are migrated.
4. Continue with Noise Plethora and the remaining oscillator, effects and utility modules.
