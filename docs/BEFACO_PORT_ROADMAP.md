# Moldgf — Befaco module port roadmap

Status: planning baseline created from the public Befaco VCV Library catalogue. This document does not claim that any module has been ported or tested.

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
- Extract and inspect the current `eurorack-android (1).zip` source tree.
- Read README, Gradle files, Android manifest, Kotlin services, HTML/JS, native C++, WASM build script, and CI workflow.
- Establish a clean baseline build and capture current tests/artifacts.
- Map the existing audio engine and UI/native bridge before editing production code.

### Phase 1 — Modular engine foundation
- Implement module/port/parameter descriptors, typed patch graph, processing scheduler, parameter event queue, state serialization, and bypass/reset.
- Establish a fixed audio block contract and safe buffer ownership.
- Add headless DSP and graph tests before adding module implementations.

### Phase 2 — Utility and routing modules
- Atte, Dual Atenuverter, Voltio, A*B+C, AxBC, Bypass, both Mixer variants, STMix, Morphader, Hex Mix VCA, and Motion MTR.
- Validate gain staging, polarity, summing, stereo routing, and no clipping surprises.

### Phase 3 — Modulation, envelopes, and timing
- Slew Limiter, Slew, Rampage, ADSR, Percall, Burst, MuDi, Sampling Modulator, Random8, Muxlicer, and Mex.
- Validate gate edge handling, clock accuracy, retrigger behavior, deterministic seeded random tests, and expander synchronization.

### Phase 4 — Oscillators, voices, and noise
- Even VCO, PonyVCO, Octaves, Kickall, and Noise Plethora.
- Validate pitch tracking, anti-aliasing, FM behavior, waveform levels, envelope response, and CPU cost.

### Phase 5 — Effects and spectral processing
- Spring Reverb, Iroi, Bandit, Chopping Kinky, and Stereo Strip.
- Validate stability, denormals, parameter smoothing, stereo image, tail handling, and CPU/memory budgets.

### Phase 6 — MIDI, UI, and release validation
- MIDI Thing V2 integration with the existing Android MIDI service.
- Complete patch save/load, UI accessibility, touch interaction, automation, and preset coverage.
- Run CI, install/build verification, audio graph regression suite, and target-device performance tests.

## Licensing and provenance

The VCVRack/Befaco repository identifies its plugin as GPL-3.0-or-later. If Moldgf copies or adapts that source, preserve copyright and license notices, provide the corresponding source and GPL obligations for distributed derivative work, and review all bundled dependencies and assets individually. A clean-room implementation based on published behavior/specifications may have a different provenance; obtain legal review before distribution if licensing is uncertain.

## Current status — updated 2026-11-08

- Protected working boundary: all work is on `feature/befaco-modules`; `main` has not been modified.
- Source archive extracted by GitHub Actions run [42537553688](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537553688), with a successful job. Extracted tree is committed under `source/`.
- Source extraction commit: `c673d68296a3308482c66f02cc4507aad32bd9d2`.
- Initial source audit completed for README, Gradle configuration, Android manifest, Kotlin MIDI bridge, JS audio engine, C++ wrappers, WASM build script, and CI workflow.
- Baseline APK workflow: [42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041). Emscripten setup and original Plaits/Beads WASM build steps passed; Gradle/APK steps were still running at the time of this update. APK success is not yet claimed.
- Existing application has a monolithic JS engine in `app/src/main/assets/index.html`, with AudioWorklet and ScriptProcessor fallback. Existing type registry currently includes 13 rack types: MIDI→CV, Pamela PRO, Scales, Plaits, Mixer 4→2, Axon-2, PPEXP1, PPEXP2, Polaris, CV→MIDI, BBD, Beads, and Audio Out. None of the 34 requested Befaco modules is implemented as a dedicated module type yet.
- Engine registration is distributed across `INIT`, `INITR`, `byT`, `mkInst`, `idxE`, `step`, `TY`, UI handlers, and preset tables. A module registry/refactor is required before adding 34 modules safely.
- Current patch graph uses string-named signals and a simple summed input lookup. It has no explicit port type metadata or visible graph-cycle validation. Module processing order is hard-coded in `step()`; feedback behavior therefore needs an explicit, tested policy before adding general routing.
- AudioWorklet code is assembled from the engine script plus a generated worker body. Any refactor must keep Worklet and fallback execution paths behaviorally aligned.
- Android host uses a WebViewAssetLoader HTTPS origin, Android MIDI APIs, SharedPreferences bridge, and document picker. Preserve these paths while extending the DSP engine.
- The Beads C++ wrapper includes an existing native self-test; Plaits and Beads are built as optional WASM, with JS fallback retained.
- No Befaco module implementation or Android device validation is claimed complete.

## Phase 0 — remaining
- Wait for and record Gradle APK result and artifact.
- Capture a reproducible baseline test/build record.
- Add automated regression coverage for graph routing, MIDI parser edge cases, and Worklet/fallback consistency before engine refactor.

## Immediate next engineering step
Introduce a small, testable module descriptor/registry layer and graph validation without changing existing module DSP behavior. Migrate existing modules incrementally, then add the first Befaco utility modules behind regression tests.
