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


## Visual front-panel fidelity (required for every module)

- Each Befaco module must render a dedicated, module-specific Eurorack faceplate rather than a generic row of HTML controls.
- Use official user manuals, panel diagrams, and product photographs as references for control placement, jack grouping, labels, legends, switch positions, LED colors, and relative proportions.
- Recreate the functional layout and visual language with original Moldgf artwork/SVG/CSS; do not copy Befaco logos, proprietary panel artwork, or imply official endorsement.
- Every visible jack, knob, switch, button, and indicator must map to the existing DSP parameter, graph port, or live signal readout. No decorative controls without behavior.
- Preserve touch usability: adequate hit targets, responsive scaling, readable legends, and no horizontal overflow on phone screens.
- A module is not visually complete until its faceplate has been reviewed against its hardware reference and its controls, cable endpoints, state persistence, and live indicators have regression coverage.
- Apply the same standard retroactively to Atte and every already-ported module, not only to future ports. Visual completion is tracked separately from DSP/graph completion.

## Proposed implementation phases

### Phase 0 — Source and build audit
- [x] Extract and inspect the current `eurorack-android (1).zip` source tree.
- [x] Read README, Gradle files, Android manifest, Kotlin services, HTML/JS, native C++, WASM build script, and CI workflow.
- [x] Record the baseline APK CI run and its exact artifact; it is packaging evidence only, not device validation.
- [x] Add incremental MIDI 1.0 decoder regression coverage: partial messages across callbacks, running status, one-data-byte channel messages, real-time interleaving, system-common cancellation, SysEx, offset/count boundaries and reset. All nine decoder tests passed under Gradle/JUnit in workflows #75 and #77; the four native MIDI batch-encoder tests also passed in both runs.
- [x] Add AudioWorklet/ScriptProcessor shared-step parity contract tests and a deterministic CV→Atte→Mixer→audio graph smoke test. The targeted local V8 harness passed 53/53 synchronous test callbacks; run #30 also completed the repository Node-test step successfully.
- [x] Inspect Beads native self-test output from workflow #25: all eight media/mode combinations, synth output, and 44.1 kHz host + 24 kHz media resampling passed (10/10 checks).
- [x] Complete Phase 0 CI validation with Gradle/JUnit MIDI regression tests in workflow [#75 / 42808107645](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42808107645): 9/9 MIDI stream decoder tests and 4/4 MIDI batch encoder tests passed; 690/690 Node DSP/graph/runtime tests passed, including routing smoke and AudioWorklet/ScriptProcessor parity. No Android device validation is claimed.

#### Phase 0 CI evidence and correction
- Baseline workflow [#1 / 42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041) concluded `success` on commit `712383976ff952f0aa83312fd6b5d12d7b5b5339`. Gradle `assembleDebug` and upload of `eurorack-study-debug-apk` succeeded. Artifact ID `13640156829`, 1,262,191 bytes, SHA-256 `8664bd134566e44435993bfa9c7586fc499fcef9846c684b48cbd87ac6709e56`.
- Important correction: the baseline run's Plaits/Beads WASM step was a false positive. Its build script relied on `set -e` inside functions invoked in `&&` conditionals; Bash suppresses errexit in that context. The log contains Emscripten errors, missing `plaits.wasm` / `beads.wasm`, and a missing `beads_selftest`, despite printing success markers. Therefore run #1 proves APK CI packaging only; it does **not** prove WASM compilation or native self-test success.
- Later workflow [#25 / 42588983012](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42588983012) succeeded on `ea7a21f98b597d027a0941aae748d13fc9090e59`: 418/418 Node tests, Plaits WASM 185,636 bytes, Beads WASM 196,726 bytes, both wrappers passed `WebAssembly.compile`, Gradle `assembleDebug` succeeded, and artifact `eurorack-study-debug-apk` ID `13661065670` (1,638,387 bytes; SHA-256 `12fb8095e6fb3a0fb95332f07c25a29b70581635f27817e64a3437453dda88d2`) was uploaded.
- The #25 `wasm-log` artifact ID `13659793872` records the Beads native self-test's 10 successful checks. None of these CI artifacts or logs imply installation, MIDI, touch, or audio validation on a physical Android device.

#### Phase 0 final CI validation — 2026-11-10

- [x] The original baseline run [#1 / 42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041) is **completed / success** on baseline commit `712383976ff952f0aa83312fd6b5d12d7b5b5339`. Its Gradle `assembleDebug` task completed successfully and it uploaded `eurorack-study-debug-apk`, artifact ID `13640156829` (1,262,191 bytes; SHA-256 `8664bd134566e44435993bfa9c7586fc499fcef9846c684b48cbd87ac6709e56`). This is CI packaging evidence only.
- **Important correction:** do **not** attribute successful Plaits/Beads WASM compilation to baseline run #1. Direct inspection of its `wasm-log` (artifact `13639697623`) shows Emscripten ARM inline-assembly errors for both modules, missing `plaits.wasm` / `beads.wasm`, and a missing Beads native self-test executable. The step was configured `continue-on-error: true`; its green step label and the script's `OK` markers were false positives because `set -e` was used inside functions called in `&&` lists. This is why overall run #1 remained green. The later build script explicitly selects portable stmlib paths and checks every output.
- [x] Full regression/build validation is now evidenced by workflow [#75 / 42808107645](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42808107645), successful on code commit `fca0164776e0594e9be41b44b02521674e0d3f24`:
  - Node: **690 passed, 0 failed**, including the shared-step AudioWorklet/ScriptProcessor parity tests, stereo/underrun contract, typed graph validation, and deterministic CV → Atte → Mixer → audio smoke path.
  - Android/JUnit: `gradle testDebugUnitTest --no-daemon` succeeded. The uploaded XML reports show **9/9** `MidiMessageDecoderTest` and **4/4** `MidiBatchEncoderTest` tests, with zero failures/errors/skips.
  - WASM: Plaits **185,636 bytes** and Beads **196,726 bytes** were built; the Beads native self-test logged all eight media/mode combinations, synth output and 44.1 kHz host / 24 kHz media resampling as OK; the final verification step successfully compiled both embedded payloads with `WebAssembly.compile`.
  - Gradle: `assembleDebug` succeeded and the debug APK was uploaded.
  - Artifacts: `eurorack-study-debug-apk` ID `13762275448` (1,674,772-byte ZIP, SHA-256 `402a6fb12a13cab3976d83f84b5c675aba5b7f039c29c2f65736059edb5349e9`); `android-unit-test-report` ID `13762210386` (9,904 bytes, SHA-256 `17d24f66187c01f680bd04cfefb85521afba4146f9ff41e3d52b7f634898a371`); `wasm-log` ID `13760556442` (1,378-byte ZIP, SHA-256 `e8e47554965993385a3fe571a9d28b0741436810a232a0cd55df4f2bd70e6a45`).
- [x] Phase 0 CI evidence is complete. The current branch HEAD is documentation-only commit `1cc81b378735e9c7344c49a87af90c6c2c0e2f1c`, whose parent is the CI-validated code commit above. The baseline artifact and run #75 artifacts are CI evidence only; no installation, audio output, MIDI reception, touch behavior, or visual validation on a physical Android device is claimed.
- Workflow #75 was triggered by four consecutive code pushes (#72–#75); all four completed successfully, but future work should continue to batch related files into a single commit to avoid redundant CI runs.

**Phase 0 status: complete in automated CI; physical-device validation remains unclaimed.**

### Phase 1 — Modular engine foundation
- [x] Add a standalone module descriptor registry and typed-port/graph validation contract.
- [x] Add automated Node tests for registry validation, signal direction/types, channel compatibility, topological order, and explicit feedback-delay handling (6/6 passed in workflow 42539116720, commit c231aaa4ecb3601f1423c84dbfa0710f7e59edc4).
- [x] Integrate endpoint/port-direction validation with the existing jack/cable model. Legacy ports retain permissive signal compatibility until their true audio/CV/gate metadata is declared, preserving existing patch behavior.
- [~] Integrate a shadow topological scheduler into rack inventory/cable updates; active audio-order scheduling remains gated on verified per-module adapters. The legacy `step()` order is intentionally unchanged.
- [ ] Add the parameter event queue, per-module state schema/versioning, and explicit reset/bypass contract.
- [ ] Migrate existing module types through adapters; keep Worklet and ScriptProcessor paths behaviorally aligned.

#### Phase 1 incremental milestone — shadow scheduler

- [x] The rack now rebuilds a deterministic topological execution plan through the existing typed registry whenever modules are added/removed or cables change. Legacy module descriptors are generated only when actual jack endpoints exist.
- [x] Exposed a read-only diagnostic snapshot as `window.MoldgfGraphPlan()` containing validity, topological order and graph errors. This is a shadow plan: it does not reject existing patches or change the real-time DSP order.
- [x] Added `graph_scheduler_runtime.test.cjs` to guard graph-plan refresh on rack/cable changes and prove the shared audio `step()` remains on its existing legacy order; all three new assertions passed in workflow #77.
- [ ] Active scheduler adoption remains pending. Before any DSP reordering, audit all 34 Befaco descriptors against rendered jack IDs, classify feedback-safe modules, and migrate only adapters whose input/output and state contracts are proven.
- Workflow [#76 / 42829050147](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42829050147) was a failed intermediate run: 690 existing tests passed and only the three new assertions failed because the test assumed the UI inline script had an `id=ui`; the page uses its final inline script instead. The selector was corrected in commit `29c7dbb408b26851b3b2a5ea7fb5418e66002013`. Emscripten, Gradle/JUnit and APK steps were skipped after the Node gate; the final verifier consequently had no generated wrappers. No existing DSP/graph regression failed.
- [x] The correction and scheduler integration passed the complete feature workflow [#77 / 42829232566](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42829232566) on commit `29c7dbb408b26851b3b2a5ea7fb5418e66002013`: 693/693 Node tests, Gradle/JUnit, Plaits/Beads WASM, `WebAssembly.compile`, `assembleDebug` and APK artifact upload all succeeded.

### Phase 2 — Utility and routing modules
- [x] Atte — four attenuator/inverter channels, cascaded input normaling, fixed +10 V first-channel normal in the hardware-style panel, individual outputs and saved control state. The DSP helper retains +1/+5/+10 V normal selection only for legacy-state compatibility; the dedicated DSP tests and shared routing smoke passed.
- [~] Dual Atenuverter — DSP core, two input/output channels, IN A→IN B normaling, bipolar attenuverter, ±10 V offset, output polarity indicators, graph descriptor, rack UI, five DSP tests and three graph-port tests authored; DSP boundary assertions and all inline-script syntax checks passed in the local V8 validation, and the complete Node, Gradle/JUnit, WASM and APK pipeline passed in workflow #77.
- [~] Voltio — clean-room 1 V/oct source, 12-tone semitone steps, selectable 0–10 V / ±5 V octave range, precision sum input, graph routing, rack controls and four DSP tests plus three graph-port tests authored; DSP/graph tests and the full CI/APK pipeline passed in workflow #77; physical voltage calibration remains unverified.
- [~] A*B+C (ABC) — dual four-quadrant VCA/ring-modulator sections; B normalled to +5 V and C to +10 V; B gain spans −2×..+2×, C offset −1×..+1× with bipolar response; ±10 V clipping; OUT2 sums channel 1 until OUT1 is patched; graph ports and six DSP tests plus two graph tests authored. Node/Gradle CI validation passed in workflow #77; visual and physical hardware validation remain separate.
- [~] AxBC — separate legacy two-channel A×B+C variant; B/C normalled to +5 V, per-path attenuators with ×1/×2/×−1 gain switches, MULT A1→A2 normaling, MIX bus on OUT2 while OUT1 is unpatched, ±10 V clipping, graph ports and six DSP tests plus three graph tests authored. DSP/graph tests and the full CI/APK pipeline passed in workflow #77; physical hardware validation remains pending.
- [~] Bypass (Molten Bypass) — stereo send/return and main path, right-input normaling, momentary Launch control, CV latch/gate modes, hard/soft return behavior, FX gain taper, slew smoothing and optional saturation; eight DSP tests and three graph tests authored. Node/Gradle CI and APK validation passed in workflow #77; physical hardware validation remains pending.
- [~] Mixer2 — four gain-controlled channels, two pair buses, automatic 1+2 master normalization into 3+4 while MIX 1+2 is unpatched, optional ±10 V clipping, audio/CV graph ports and five DSP plus three graph tests authored; DSP/graph tests passed in workflow #77.
- [~] Mixer — four independent level-controlled channels, main sum and inverted complementary output, bipolar meter, no clipping, audio/CV graph ports and five DSP plus three graph tests authored; DSP/graph tests passed in workflow #77.
- [~] STMix — four stereo channels plus unity AUX, right-to-left normaling per channel, four gain controls, stereo output and meters; five DSP plus three graph tests authored; DSP/graph tests passed in workflow #77.
- [~] Morphader — four A/B crossfader channels, master fader with lag, per-channel CV and CV1 normaling, audio equal-power/CV equal-sum modes, individual outs and OUT4 master summing; six DSP plus two graph tests authored; DSP/graph tests passed in workflow #77.
- [~] Hexmix VCA — six CV-controlled VCAs, normalized +10 V CV, exponential/linear/logarithmic response shaping, five-channel mix normaling into output 6 with selectable independent mode; six DSP plus two graph tests authored; DSP/graph tests passed in workflow #77.
- [~] Motion MTR — three channel modes (CV inversion, CV attenuation and audio gain), 10 V input normaling with configurable break in audio mode, independent outputs and OUT3 mix normalization; six DSP plus three graph tests authored; DSP/graph tests passed in workflow #77.
- [~] Automated gain-staging, polarity, summing, stereo-routing and clipping tests passed in workflow #77; hardware-level signal validation remains pending.

### Phase 3 — Modulation, envelopes, and timing
- [x] Slew Limiter, Slew, ADSR, Percall, Burst, MuDi, and Sampling Modulator — all seven have DSP assets and deterministic tests; the full suite passed in workflow #77.
- [~] **Random8 — next batch module 1/5 (CI validated):** eight independently seeded 0–10 V CV generators with cascading trigger normaling, per-channel output attenuation and mode selection (random, loop, evolve, lock), loop capture up to 32 steps, eight random distributions, 15 quantizer choices including octave steps, probability, trigger division, slide and offset. Added the DSP helper with reusable output/readout buffers, eight typed trigger/CV endpoints, AudioWorklet/fallback engine dispatch, and an original 8 HP-inspired eight-column panel with per-channel edit controls. Sixteen DSP tests and five graph tests are authored; the actual Node runner, Gradle/JUnit, WASM and APK gates passed in workflow #77. This is a clean-room behavioral model based on Befaco's published Random8 documentation, not its firmware.
- [~] **MEX — next batch module 2/5 (CI validated):** 4 HP eight-step gate expander for Muxlicer. Each step has three modes matching the manual: PASS IN (thresholded Gate In signal), NO GATES, or ALL GATES (copies that step's Muxlicer gate output, including its gate count). Gate In accepts audio/CV/gate signals and defaults to the selected Muxlicer's Clock Out when unpatched. Added DSP, typed Gate In/Gate Out ports, a selectable internal Muxlicer host link, and an original 4 HP-inspired panel with eight three-position switches and live output status. Ten DSP tests and five graph tests are authored; Node execution, Gradle/JUnit, WASM and APK validation passed in workflow #77; rear THRU daisy-chain expansion is not yet modeled.
- [~] **Muxlicer — module 5/5:** eight-step sequential signal processor with MUX/DEMUX routing, eight step levels, selectable 0–5 V / 0–10 V / ±5 V sequencer CV, internal BPM and external falling-edge clock, clock division/multiplication, address CV, play/stop/reset/one-shot/tap-tempo controls, gate modes from sustained/half-step to eight retriggers, eight per-step gate outputs, ALL GATES and EOC. Added a 16 HP-inspired panel with eight vertical faders, transport, clock/address/gate controls, mode-dependent step-jack groups and distinct audio/CV endpoints. Twenty DSP tests and six graph tests passed in the local V8 harness. Because the graph model has unidirectional typed ports, each physical bidirectional MUX I/O is represented by separate input and output endpoints; the panel shows the matching endpoint set for MUX or DEMUX mode. This is a clean-room digital model; Node tests and Android build passed in workflow #22; physical-device validation remains pending.
- [~] **Rampage — first module in the five-module gate:** dual rise/fall function generators with one-shot/cycle operation, trigger/manual retrigger, external-signal slew processing, CV control of rise/fall/EXP, three time ranges, nonlinear shape, rising/falling slope gates, one-shot/cycle EOC pulses, and balanced B>A/MIN/MAX logic. Added dedicated 18 HP-inspired original Moldgf faceplate, persisted controls, engine processing, typed audio/CV/gate graph ports, and live stage/voltage readouts. Fourteen DSP tests and five graph tests were executed in the local V8 validation harness; the Node tests and consolidated CI/APK passed in workflow #22; physical-device validation remains pending. This is a documented-behavior JS model, not a transistor-level analog clone.
- [ ] Validate gate edge handling, clock accuracy, retrigger behavior, deterministic seeded random tests, and expander synchronization.

### Phase 4 — Oscillators, voices, and noise
- [x] Even VCO and PonyVCO — both DSP/graph implementations and tests passed in workflow #77; pitch/anti-aliasing hardware parity remains separate.
- [~] **Octaves VCO — next batch module 3/5 (CI validated):** 12 HP six-octave additive pulse oscillator. Implemented two summed 1 V/oct pitch inputs, tune/range controls (full, octave, semitone), base-octave selector, hard-sync reset, symmetrical shared PWM with attenuated CV, six level VCAs with level-CV attenuation, and six cascaded multi-mix outputs that split at patched jacks. Added a clean-room band-limited pulse DSP using polyBLEP edge correction, typed pitch/sync/PWM/level CV and six audio outputs, plus an original 12 HP-inspired panel with six octave strips and all controls/jacks. Fifteen DSP tests and five graph tests are authored; Node execution, Gradle/JUnit, WASM and APK validation passed in workflow #77; the polyBLEP approximation remains distinct from the original analog core. The model is not a transistor-level recreation of the triangle/comparator core.
- [~] **Kickall — module 3/5:** 6 HP kick voice with stable sine oscillator, V/Oct tune tracking (0–10 V input, ten-octave span), sine-to-square waveshaper and shape CV, independent pitch and volume envelopes, pitch Time/Bend controls, Decay control with ±10 V CV, general post-envelope VCA with 0–10 V normalled Volume input, 3.5 V trigger edge and manual trigger. Added original hardware-layout-inspired panel with Tune/Shape/Time/Bend controls, manual trigger, vertical Decay fader, all six documented jacks, engine state and typed graph integration. Fifteen DSP tests and five graph tests passed in the local V8 harness. This is a clean-room digital drum-voice approximation, not analog circuit emulation; Node tests and Android build passed in workflow #22; physical-device audio remains pending.
- [~] **Noise Plethora — module 4/5:** three independent generators; A/B expose three banks of ten program slots each with separate X/Y controls, program CV selection and LP/BP/HP multimode filters with cutoff CV attenuators and resonance; C provides independent White and Gritty outputs plus a selectable-source filtered output, grit quantity CV and a cascaded 24 dB-style filter. Added a clean-room 30-program algorithm set derived from published program descriptions, seeded deterministic noise sources, preallocated oscillator/walker/delay/filter state, typed CV/audio ports, persisted controls and a dedicated 14 HP-inspired three-column panel with bank/program displays and A/B selection. Fourteen DSP tests and five graph tests passed in the local V8 harness. This is not a bit-exact reproduction of Befaco firmware or analog filters; Node tests and Android build passed in workflow #22; physical audio remains pending. Official firmware/plugin repositories have separate CC BY-NC-SA / CC BY-SA terms; no firmware source code was copied into this implementation.
- [ ] Validate pitch tracking, anti-aliasing, FM behavior, waveform levels, envelope response, and CPU cost.

### Phase 5 — Effects and spectral processing
- [x] Chopping Kinky and Stereo Strip — both DSP/graph implementations and tests passed in workflow #77; physical audio and visual fidelity remain pending.
- [ ] Validate stability, denormals, parameter smoothing, stereo image, tail handling, and CPU/memory budgets.
- [~] **Bandit — next batch module 5/5 (CI validated):** 8 HP four-band spectral processor with ALL AUDIO IN normalled to the four band inputs, ALL CV summed with each band CV, fixed low-pass shelf (300 Hz), mid-low and mid-high band-pass peaks (700 Hz / 1.5 kHz), and high-pass shelf (5 kHz), each followed by an independently controlled VCA. Individual band outputs break their bands out of MIX OUT; four post-filter RETURN inputs are summed back in, and the final mix uses a soft clip limiter with peak/clipping meter. Added preallocated biquad DSP, typed audio/CV ports, patch-aware break-out routing, four fader/CV channels and an original 8 HP-inspired panel. Eighteen DSP tests and five graph tests are authored; Node/CI/APK validation passed in workflow #77; the filter bank remains a clean-room approximation of the published frequency bands, not a circuit-level model. The filter bank is a clean-room approximation of the published frequency bands, not a circuit-level model.
- [~] **IROI — next batch module 4/5 (CI validated):** 18 HP stereo effects processor with normalized L input to R, four filter modes (LP/BP/HP/comb), VCA/filter block movable to four chain positions, three-band resonator with feedback and shift-page dissonance, two-tap ping-pong echo (10 ms–6 s) with sync/divider behavior and tone control, and Schroeder-style ambience/reverb with space, decay and direction. Implemented two independent mono signal paths as a stereo pair of graph jacks (L/R), eight CV inputs for VCA/dry-wet and mapped parameters, sync and random gates, seven modulation sources/waves, MAP arming and target selection, SHIFT secondary controls, randomizer with undo/redo, peak meter and sample-rate-aware preallocated buffers. Added an original 18 HP-inspired panel and 19 DSP plus five graph tests. The host still models L/R as separate scalar ports, not a native two-channel bus; Node/CI/APK validation passed in workflow #77; physical-device validation remains pending. The effect algorithms are clean-room approximations, not the original OWL firmware.
- [~] **Spring Reverb — module 2/5:** two independent CV-controlled input VCAs, IN1 dry plus tank routing, IN2 tank-only routing, +10 V CV normaling, additive MIX CV, HPF before the tank, independent WET and DRY/WET MIX outputs, input/wet peak meters, and an 8 HP-inspired original Moldgf panel with vertical faders, rotary HPF/MIX controls, CV jacks and meters. Added a preallocated delay/comb/allpass spring-style tank model, sample-rate-aware state, typed audio/CV graph ports, and persisted controls. Eleven DSP tests and five graph tests execute in the local V8 validation harness. This is a digital spring-style approximation, not a physical tank or circuit-level emulation; Node tests and CI/APK passed in workflow #22; physical-device audio remains pending.

### Phase 6 — MIDI, UI, and release validation
- [x] MIDI Thing V2 integration with the existing Android MIDI service — DSP/graph tests and the Android MIDI decoder/encoder JUnit suite passed in workflow #77; physical MIDI reception remains unverified.
- [ ] Complete patch save/load, UI accessibility, touch interaction, automation, and preset coverage.
- [x] CI, Gradle/JUnit, WASM, APK assembly and audio graph regression suite passed in workflow #77. [ ] Physical installation, target-device performance and audio validation remain pending.

## Phase 7 — MIDI, mixers, filters, and stereo channel strips

The next five-module batch has been selected after auditing the official Befaco catalog and confirming all five are absent from the current 32 DSP assets and 32 module registry entries:

1. **MIDI Thing V2** — 6 HP, 12 assignable CV/gate ports, polyphonic voice allocation, note CV/glide/gate/velocity, ADSR, oscillator, LFO, MIDI clock, merge/routing and configuration UI. Integrate with the existing Android MIDI service; model its 12 configurable outputs as typed graph ports. Official resources: https://www.befaco.org/midi-thing-v2/ and https://befaco.org/docs/Midi_thing_V2/Midi%20Thing%20V2_User_Manual_v1.2.pdf.
2. **Hexmix** — 28 HP six-channel performance mixer, per-channel three-band EQ, volume, vactrol-style latch/momentary mute and constant-power pan, plus master EQ/level and stereo output. Official resources: https://www.befaco.org/hexmix/ and https://befaco.org/docs/Hexmix/Hex_Mix_System_User_Manual.pdf.
3. **Hexpander** — 28 HP Hexmix expansion: three aux sends per channel, stereo returns, pre/post fader/EQ send paths, PFL/cue monitor, direct post-EQ channel outputs, master and headphone outputs. Model its host dependency as an internal expansion link to Hexmix; do not require physical expansion hardware. Official resources: https://www.befaco.org/hexpander/ and https://befaco.org/docs/Hexpander/Hex_Mix_System_User_Manual.pdf.
4. **Pony VCF** — 6 HP four-pole 24 dB/oct low-pass filter, three-input attenuated mixer with output-to-input-3 feedback normaling, resonance/Q CV, two cutoff CVs, CV1 routing to cutoff or cutoff+VCA, and volume CV with 10 V/CV1 normalization. Official resources: https://www.befaco.org/pony-vcf/ and https://www.befaco.org/docs/Pony_VCF/Pony_VCF_User_Manual.pdf.
5. **DivKid Stereo Strip** — 6 HP stereo/mono channel strip with low-shelf/mid-bell/high-shelf EQ, constant-power pan and pan CV attenuator, stereo VCA and level CV, on/off/momentary mute, Eurorack/line input-output level switches and soft-clipping limiter. Keep L/R as separate scalar graph ports until the engine has a native stereo bus. Official resources: https://www.befaco.org/stereo-strip/ and https://befaco.org/docs/stereo_strip/Stereo_Strip_manual.pdf.

Implementation order is Hexmix, Hexpander (after its host), Pony VCF, Stereo Strip, then MIDI Thing V2. The five modules are integrated and the complete Node/Gradle/JUnit/WASM/APK suite passed in workflow #77; hardware/visual verification remains separate.

- [~] **Hexmix — next batch module 1/5:** six-channel three-band EQ mixer with vactrol-style latch/momentary mute, constant-power pan, master EQ/level, modular/line output selection and optional Hexmix VCA host normalization. DSP, 28 HP-inspired six-strip panel, stereo graph outputs and 19 DSP + five graph tests are in place. Momentary mute is modeled as a short one-shot gate rather than a held pointer switch; CI validation passed in workflow #77; the documented hardware/behavioral approximation remains.
- [~] **Hexpander — next batch module 2/5:** internal Hexmix expansion with three pre/post aux buses, three stereo returns, six post-fader/EQ direct outs, PFL cue sum, monitor crossfade, headphone volume and balanced line-level main outputs. DSP, 28 HP-inspired panel, internal Hexmix host link, typed return/send/direct/main/headphone ports and 15 DSP + five graph tests are in place; CI validation passed in workflow #77; documented hardware/behavioral limitations remain.
- [~] **Pony VCF — next batch module 3/5:** 6 HP four-pole 24 dB/oct low-pass ladder approximation with nonlinear feedback/resonance compensation, three-channel attenuated mixer, output-normalled feedback into IN3, CV1/CV2 cutoff modulation, resonance CV, CV1-to-VCA/10 V-normal mode switch and external volume-CV override. Added sample-rate-aware DSP, peak/saturation meter, original 6 HP-inspired panel, typed audio/CV graph ports and 17 DSP + five graph tests. The SSI2144 enhanced-ladder circuit and temperature compensation are not reproduced at component level; Node/Gradle/JUnit/WASM/APK validation passed in workflow #77, while circuit-level parity remains an approximation.
- [~] **DivKid Stereo Strip — next batch module 4/5:** 6 HP mono/stereo channel strip with L-to-R mono normaling, low-shelf/mid-bell/high-shelf EQ (±12 dB), constant-power mono pan and stereo balance, audio-rate pan CV with attenuator, 5 V-unity VCA with smoothed level CV, three-position on/off/momentary mute, Eurorack/line input boost and output attenuation, and soft-clipping output protection. Added two independent EQ/VCA states, stereo scalar graph pair, sample-rate-aware DSP, original 6 HP-inspired panel and 18 DSP + five graph tests. The momentary switch is currently a 120 ms one-shot approximation rather than pointer-held hardware behavior; CI validation passed in workflow #77. Preserve main; physical switch feel and visual review remain pending.


## Licensing and provenance

The VCVRack/Befaco repository identifies its plugin as GPL-3.0-or-later. If Moldgf copies or adapts that source, preserve copyright and license notices, provide the corresponding source and GPL obligations for distributed derivative work, and review all bundled dependencies and assets individually. A clean-room implementation based on published behavior/specifications may have a different provenance; obtain legal review before distribution if licensing is uncertain.

## Current status — 2026-11-09

- Working boundary: all changes are confined to `feature/befaco-modules`; `main` remains untouched (last verified SHA `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`).
- Build gate: five additional modules (Rampage, Spring Reverb, Kickall, Noise Plethora and Muxlicer) are integrated and CI-validated.
- **Second five-module implementation gate is CI-validated:** Random8, MEX, Octaves VCO, IROI and Bandit each have a DSP asset, AudioWorklet/ScriptProcessor dispatch, dedicated hardware-inspired panel, typed graph descriptor, persisted parameters and module-specific DSP/graph tests. Workflow #25 (`42588983012`) succeeded on commit `ea7a21f98b597d027a0941aae748d13fc9090e59`: **418/418 Node tests passed**, Plaits and Beads produced real WASM payloads (185,636 and 196,726 bytes), Gradle `assembleDebug` succeeded, APK artifact `13661065670` uploaded, and both WASM wrappers passed `WebAssembly.compile`. The batch contributes 105 module-specific DSP/graph tests plus five panel/integration assertions; 32 DSP assets and 32 registered graph module types are present. IROI uses two independent mono paths as L/R, MEX rear THRU daisy chaining is not modeled, and all five are clean-room behavioral approximations. Workflow #22 (`42557029992`) completed successfully on the final code commit; Node tests, Plaits/Beads WASM validation, Gradle APK build, artifact upload and the final WebAssembly.compile checks passed. Interim documentation commits use `[skip ci]`.
- Source extraction: [workflow 42537553688](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537553688) succeeded; extracted tree is committed under `source/` at `c673d68296a3308482c66f02cc4507aad32bd9d2`.
- Baseline APK: [workflow 42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041) completed with `success` on commit `712383976ff952f0aa83312fd6b5d12d7b5b5339`; Gradle APK packaging and upload succeeded. The old WASM script masked Emscripten/self-test failures, so this run is not WASM evidence. Actual Plaits/Beads WASM and Beads native self-test were verified later in workflow #25 (see Phase 0 evidence above).
- Published artifact: `eurorack-study-debug-apk`, artifact ID `13640156829`, 1,262,191 bytes, SHA-256 `8664bd134566e44435993bfa9c7586fc499fcef9846c684b48cbd87ac6709e56`; GitHub retention through 2027-02-06. This proves CI packaging only, not installation or audio validation on a device.
- Existing engine audit: the approximately 278 KB `index.html` embeds the engine and rack UI, with AudioWorklet plus ScriptProcessor fallback, a string-keyed signal store, summed input lookup, cable list, and hard-coded `step()` processing order. Current module registration and UI remain distributed across `INIT`, `INITR`, `byT`, `mkInst`, `idxE`, `step`, `TY`, and handlers.
- Existing rack types include the original MIDI→CV, Pamela PRO, Scales, Plaits, Mixer 4→2, Axon-2, PPEXP1/PPEXP2, Polaris, CV→MIDI, BBD, Beads and Audio Out, alongside the Befaco ports listed in the phase inventory. The current HTML has 37 DSP asset references and 36 unique graph module types; legacy/revision variants must be reconciled separately against the 34-module catalogue rather than counted as new products.
- The new graph contract validates live jack endpoints and output-to-input direction. Legacy ports are mapped to the engine's actual mono channel model and permissive signal compatibility; typed audio/CV/gate semantics and cycle scheduling will be enabled module-by-module.
- Befaco Atte is implemented in the rack and audio engine: four independent attenuator/inverter channels, cascaded input normaling, hardware-faithful fixed +10 V first-channel normal in the UI, per-channel gain/polarity controls, independent outputs, live polarity LEDs, and voltage readouts. The DSP helper retains its selectable normaling function for legacy-state compatibility, but the panel no longer exposes non-hardware +1/+5 V options. Five dedicated DSP tests and the inline WebView/AudioWorklet syntax test passed in workflow [42539523295](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295); the debug APK artifact is [13641045420](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295). Workflow [42539485722](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722) also succeeded and published APK artifact [13641021006](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722). These runs validate CI packaging, not installation/audio on a physical device. The engine currently processes mono signals, so polyphonic parity remains future work.
- Historical Atte/utility and 21-module counts above refer to earlier checkpoints. The later Phase 7 inventory adds Hexmix, Hexpander, Pony VCF, Stereo Strip and MIDI Thing V2. The latest repository-wide Node count before run #30 was 554; run #30's Node step has passed, while the final count and APK result are being read from the completed run. The branch's current full validation is tracked below rather than inferred from old local harness totals.
- Android host uses WebViewAssetLoader, Android MIDI APIs, SharedPreferences bridge, and document picker. Plaits and Beads have optional WASM builds with JS fallbacks; Beads also has a native self-test in the build script.

## Immediate next steps (historical snapshot — superseded by the 2026-11-10 audit)

1. Finish workflow #30 on commit `d8fc256fed489c490d6380e9301ee029966739f0`; its Node contract suite and Emscripten build steps have passed, and Gradle APK assembly is in progress.
2. Run workflow #31 on current HEAD after #30 finishes. It includes the newly added `gradle testDebugUnitTest --no-daemon` step, which #30 did not contain.
3. Inspect #30/#31 job logs, Beads self-test output, WASM payload verification, Gradle results and APK artifact metadata before marking Phase 7 CI-validated.
4. Continue only on `feature/befaco-modules`; preserve `main`. Reconcile the 34 official catalogue targets against the 37 asset references / 36 unique graph types and list any remaining missing hardware behaviors.
5. Preserve documented clean-room/fidelity limits: IROI is two mono paths, MEX rear THRU is not modeled, and MIDI Thing V2 has no physical TRS/USB-host or configurable hardware MIDI-merge routing. No physical-device testing is claimed.

## Repository audit — 2026-11-09

- Last successful consolidated Phase 7 CI: workflow #30 (`42631339976`) on `d8fc256fed489c490d6380e9301ee029966739f0`: Node 554/554, Plaits/Beads WASM, Beads native self-test, Gradle APK and payload verification all succeeded. Workflows #26–#29 had Node-gate failures and no APK; their reported failures were corrected before #30. Current branch HEAD is `d656ea5918d16ad24d285ea4f38b402937e4c3b4`; the later workflow commit adds Gradle/JUnit execution, which #30 did not run.
- Compared against protected `main` baseline `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`: `feature/befaco-modules` is 439 commits ahead and 0 behind at this checkpoint. `main` remains exactly at the baseline SHA; no merge, force-push or write to `main` occurred.
- The current `source/app/src/main/assets/index.html` already registers and processes **Even VCO** and **Chopping Kinky**, each with a dedicated DSP asset and DSP/graph tests. They must not be counted as unported or reimplemented.
- The current assets include the following additional module implementations beyond the first batch: Mixer2, Mixer, STMix, Morphader, Hexmix VCA, Motion MTR, Slew Limiter, Slew, Pony VCO, ADSR, Percall, MuDi, Burst, Sampling Modulator, Chopping Kinky, and Even VCO. The roadmap's earlier count of 21 modules needs a separate inventory reconciliation before the next release gate.
- Rampage implementation is committed on `feature/befaco-modules` across commits `fd59eee8` (DSP/test foundation), `13a7eb32` (engine/panel/graph integration), and subsequent DSP/UI/test corrections through `7a1d5add`. The current files are `source/app/src/main/assets/rampage_dsp.js`, `source/tests/rampage_dsp.test.cjs`, `source/tests/rampage_graph.test.cjs`, and the integrated `index.html`.
- Local V8 validation compiled the AudioWorklet engine, rack UI, and Rampage DSP; it executed all 19 authored Rampage DSP/graph test cases successfully. This is not a claim that `node --test`, Android packaging, or hardware audio validation has passed.
- Spring Reverb implementation is committed on `feature/befaco-modules` across DSP, test, engine/UI and follow-up panel commits, ending with `d2f7b988`. The current files are `source/app/src/main/assets/spring_reverb_dsp.js`, `source/tests/spring_reverb_dsp.test.cjs`, `source/tests/spring_reverb_graph.test.cjs`, and the integrated `index.html`.
- Local V8 validation compiled the AudioWorklet engine, rack UI, and both new DSP assets; it executed all 35 authored DSP/graph test cases across Rampage and Spring Reverb successfully (Rampage 14 DSP + 5 graph; Spring Reverb 11 DSP + 5 graph). That was a local-only checkpoint; subsequent full Node/Android/WASM/APK validation passed in workflow #77. Physical-device audio remains unverified.
- Kickall implementation is committed on `feature/befaco-modules` in `source/app/src/main/assets/kickall_dsp.js`, `source/tests/kickall_dsp.test.cjs`, `source/tests/kickall_graph.test.cjs`, and the integrated `index.html`; the integration includes the DSP script, persisted controls, audio-engine processor, typed graph ports, manual trigger handler, rack menu entry and original 6 HP-inspired panel layout.
- Local V8 validation compiled the AudioWorklet engine, rack UI and all three new DSP assets, and executed all 55 authored DSP/graph test cases successfully: Rampage 14 DSP + 5 graph, Spring Reverb 11 DSP + 5 graph, Kickall 15 DSP + 5 graph. That was a local-only checkpoint; subsequent full Node/Android/WASM/APK validation passed in workflow #77. Physical-device audio remains unverified.
- Noise Plethora is committed in `source/app/src/main/assets/noise_plethora_dsp.js`, `source/tests/noise_plethora_dsp.test.cjs`, `source/tests/noise_plethora_graph.test.cjs`, and the integrated `index.html`. It adds three generator paths, thirty named A/B program slots in three banks, X/Y and program CV, three multimode filter paths, the independent C white/gritty/filtered outputs, and 14 HP-inspired panel controls/ports. The DSP is a clean-room JS approximation based on published manual behavior; it does not copy the official firmware or claim bit-exact algorithm parity.
- Local V8 validation compiled the AudioWorklet engine, rack UI and all four new DSP assets, and executed all 74 authored DSP/graph cases successfully: Rampage 14+5, Spring Reverb 11+5, Kickall 15+5, Noise Plethora 14+5. That was a local-only checkpoint; subsequent full Node/Android/WASM/APK validation passed in workflow #77. Physical-device audio remains unverified.
- Muxlicer is committed in `source/app/src/main/assets/muxlicer_dsp.js`, `source/tests/muxlicer_dsp.test.cjs`, `source/tests/muxlicer_graph.test.cjs`, and the integrated `index.html`. It adds internal/external clocking, falling-edge sync, speed and clock-out division/multiplication, address and reset, one-shot, gate-pattern modes, per-step gates, ALL GATES/EOC, MUX/DEMUX signal routing, CV range selection, step faders and Tap Tempo. Its panel uses separate typed input/output endpoints for the same physical bidirectional jacks because the current graph contract is unidirectional.
- Final local V8 validation compiled the AudioWorklet engine, rack UI and all five DSP assets and executed all **100** authored DSP/graph test cases: Rampage 19, Spring Reverb 16, Kickall 20, Noise Plethora 19, Muxlicer 26.
- Workflow #22 (`42557029992`) is the first fully validated run: the actual Node test suite passed **308/308**; Plaits WASM compiled to 185,636 bytes; Beads WASM compiled to 196,726 bytes and its native selftest passed; the workflow verified both base64 wrappers' WASM magic and compiled both with `WebAssembly.compile`; Gradle `assembleDebug` and APK upload passed. The APK archive was downloaded and inspected; `assets/index.html`, all five new DSP assets, and both WASM wrappers are present.
- Final APK SHA-256: `217e71cf119ae417b7d0fb2abfb603f991f8cbd5f070035afb98d410302bbbb1`. The exact validated code SHA is recorded above. Physical-device audio and touch/UI testing remain pending; no claims of hardware parity or stereo/polyphonic operation are made.
- Workflow #22 completed with `success`. The actual Node suite passed 308 tests; Plaits and Beads produced real WebAssembly payloads (185,636 and 196,726 bytes); Beads native selftests passed; the final CI step validated both WASM payloads with `WebAssembly.compile`; Gradle produced and uploaded the debug APK. `main` remains untouched.
- Official hardware references for the selected batch: [Rampage](https://www.befaco.org/rampage-2/), [Spring Reverb](https://www.befaco.org/spring-reverb/), [Kickall](https://www.befaco.org/kickall-2/), [Noise Plethora](https://www.befaco.org/noise-plethora/), and [Muxlicer](https://www.befaco.org/muxlicer-2/). Panels must be redrawn as original Moldgf artwork from hardware documentation; do not copy proprietary panel artwork or logos.


## Official Befaco catalog as visual and scope reference

- Canonical catalog supplied by the user: https://www.befaco.org/all-modules-befaco-synths-barcelona/?filter=todo
- Use this catalog as the source of truth for current product names and the official product pages as references for panel layout, control labels, jack placement, hardware proportions, manuals, and product photographs.
- Befaco currently exposes two A*B+C documentation pages: `/abc/` describes the earlier A*B+C version (B normalled to +5 V, C to +10 V, first output normalled into the second), while `/axbc/` describes the current A*B+C / voltage-controlled voltage processor (B and C normalled to +5 V, with MULT/MIX routing). The `abc` and `axbc` code paths therefore represent distinct hardware revisions/behaviors, not a duplicate to delete. Keep both DSP paths, label the revisions clearly in the app, and validate each against its matching manual. See https://www.befaco.org/abc/ and https://www.befaco.org/axbc/.
- Dual Atenuverter is a documented legacy module, not a current catalog model: Befaco lists it under Old Versions documentation and the shop describes it as the earlier version of Atte. It may remain supported as a clearly labeled legacy utility, but must not be represented as the current Atte hardware. See https://www.befaco.org/old-versions/.
- Atte official behavior: four cascaded attenuator/inverter channels; first input normalled to +10 V; per-channel inversion; four bipolar level LEDs. Reference: https://www.befaco.org/atte/
- A*B+C official behavior: two channels, each computes A × B + C; B and C inputs normalled to +5 V; signal LEDs. Reference: https://www.befaco.org/axbc/
- Voltio official behavior: precision 1 V/oct voltage source spanning ten octaves, two-knob note/octave interface, precision adder input, and front-panel banana measurement connectors. Reference: https://www.befaco.org/voltio/


## Production continuation — 2026-11-08

### Visual fidelity pass 1 — Atte

- [x] Replaced the generic Atte rows with a dedicated narrow four-channel front panel: channel A–D identity, paired IN/OUT jacks, individual LEVEL controls, per-channel polarity selector, fixed +10 V normal indication, and cascaded-input labeling.
- [x] Added per-channel live polarity indicators: green for positive output and red for negative output, driven by the actual DSP output values.
- [x] Removed the user-selectable +1/+5/+10 V normal control from the front panel. The official Atte specification normalled first input is +10 V; the existing DSP default remains index 2 (+10 V), and no UI control now advertises non-hardware alternatives.
- [x] Preserved the existing port IDs, parameter keys, DSP function, save-state shape, and cable compatibility.
- [ ] Run the full Node suite and WebView visual/device validation in the next permitted consolidated CI cycle; no build was started for this visual-only commit.
- Commit: `dfb4706ea9b8d16202036d827e1ca5fb4dce316d` on `feature/befaco-modules` (`[skip ci]`). `main` was not modified.

### Immediate continuation

1. Finish the legacy A*B+C V4 panel and verify its distinct +5 V B / +10 V C normaling and OUT1-to-OUT2 sum behavior; keep it separate from the current A*B+C revision.
2. Validate the three completed panel passes (Atte, current A*B+C, Voltio) in WebView and add targeted static/UI regression assertions.
3. Redesign the remaining already-ported modules to the same hardware-faithful panel standard.
4. Port the next five distinct current-catalog modules with DSP and graph tests.
5. Keep the Android build gate closed until the five additional modules and their tests are complete.


### Official revision distinction — A*B+C and AxBC

The initial assumption that `abc` and `axbc` were a duplicate was incorrect and is superseded by this revision audit:

- `abc` maps to the earlier A*B+C hardware behavior documented on the official `/abc/` page: B attenuverter range −2..+2, C offset range −1..+1, B normalled to +5 V, C normalled to +10 V, and OUT1 normalized into OUT2 for four-channel summing.
- `axbc` maps to the current A*B+C / voltage-controlled voltage processor documented on `/axbc/`: two A×B+C channels, B and C normalled to +5 V, signal indicators, and MULT/MIX routing. Keep this as a distinct revision with its own panel and DSP tests.
- The official legacy documentation also confirms Dual Atenuverter as a real older Befaco module and the shop describes it as the predecessor to Atte. Retain it as a legacy model with accurate naming, not as a current catalog product.
- Sources reviewed: https://www.befaco.org/abc/ ; https://www.befaco.org/axbc/ ; https://www.befaco.org/old-versions/ ; https://shop.befaco.org/2-home .



### Visual fidelity pass 2 — current A*B+C revision

- [x] Replaced the generic AxBC rows with a dedicated dual-channel front panel reflecting the official current A*B+C V4 manual: A/B/C inputs and output per channel, independent B and C level controls, ×1/×2/×−1 gain selectors, per-channel live bipolar output indicators, MULT/MIX routing, and +5 V normaling labels.
- [x] Preserved the current `axbc` DSP contract, parameter keys, port IDs, channel normalization and mode values.
- [x] Renamed the app-facing module to `Befaco A*B+C · CURRENT REVISION`; the separate `abc` implementation is now labeled `A*B+C V4 · LEGACY REVISION`. No DSP path was removed.
- [ ] Confirm front-panel dimensions and touch behavior in WebView; run automated UI syntax and DSP/graph tests during the next permitted CI cycle.
- Code commit: `e3f3c1d8a7f8b501e310d6528b0751e3e5267cef` on `feature/befaco-modules` (`[skip ci]`). The Atte polarity selector was separately corrected so the default index still means positive attenuation: `e3c69336a69e8fd14550744635a3edaeef92dcaf`.


### Visual fidelity pass 3 — Voltio

- [x] Replaced the generic octave slider/semitone dropdown layout with a dedicated Voltio front panel: separate rotary OCTAVE and SEMITONE controls, selectable positive/bipolar range, precision SUM IN and MAIN OUT jacks, voltage readout, and labeled multimeter OUT/GND test contacts.
- [x] Octave knob dynamically tracks the hardware range switch: 0..+10 V or −5..+5 V. Semitone rotary control advances in integer 1/12 V steps.
- [x] Kept the existing DSP calculation and graph ports unchanged; SUM IN remains a precision, unquantized additive input.
- [ ] Validate knob drag/touch, range switching, and readout in WebView; run Node DSP/graph and inline-script tests in the next permitted CI cycle.
- Code commit: b6710e7ad7224cfca5375cde5597bff51305dad9 on feature/befaco-modules ([skip ci]).


### Visual regression coverage

- [x] Added static regression assertions for Atte panel polarity/default normaling, current and legacy A*B+C revision labeling and normaling, and Voltio rotary controls/precision-adder/test terminals in `source/tests/index_scripts_syntax.test.cjs`.
- [x] The expanded Node suite and visual regression assertions passed in workflow #77; inspection on a physical Android WebView remains unverified.
- Latest pre-visual CI baseline: Android APK workflow #10 (`42544359182`) succeeded on `b07db812faff229d2120f50fc21dc86428143b6a`; artifact `eurorack-study-debug-apk` ID `13641894664`. This run predates the three panel implementations and does not validate them.
- Current feature branch HEAD at the last verification: `34261a7faab13e2175ecd9f2653315ffd966d2b3`; `main` remains `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`. All production commits used `[skip ci]`; no new Android workflow was started.


### Visual fidelity pass 4 — legacy A*B+C V4

- [x] Replaced the legacy generic rows with a dedicated two-channel A*B+C V4 panel: A/B/C and OUT jacks, per-channel B attenuverter and C offset controls, live output polarity LEDs, +5 V B normaling, +10 V C normaling, and OUT1-to-OUT2 summing indication.
- [x] Preserved the legacy `abc` DSP formula, parameter IDs, jack IDs and summed-output behavior; current `axbc` remains a separate hardware revision.
- [x] Expanded static UI regression assertions for the legacy panel's normaling and output cascade; corrected the regex assertion to match the final panel label.
- [ ] Run the expanded Node suite and inspect Atte, current A*B+C, legacy A*B+C V4, and Voltio on Android WebView in the next permitted CI cycle.
- Code commit: `4aef76cf746ab6b41d88ae2b6e63b25c559d0783`; test assertion corrections: `adeb6ee7403104f2479854903458de757a8e0923` and `5e05ebd938e4a3db9c66ce19d8ae2bebede9b81f` / `8ff902dee4f3101db9056a53598cd0b2460193e4` (all `[skip ci]`).

- Current authored Node test count now includes one additional static panel regression test; the expanded suite has not yet been executed. Historical local test totals above refer to the pre-panel branch state.


## Phase 7 implementation update — 2026-11-09

<badge>Batch complete: 5/5</badge>

The five-module Phase 7 batch is now implemented on `feature/befaco-modules`. This update supersedes earlier notes in this roadmap that said CI was blocked pending MIDI Thing V2.

- [x] **MIDI Thing V2 — module 5/5:** 12 assignable CV/gate outputs; per-port function/channel/voice/CC/drum-note mapping; global MIDI channel filter; up to 12 voices with LAST/LOW/HIGH/NO STEAL allocation; corrected 1 V/oct note CV (note 0 = 0 V, note 12 = 1 V, note 60 = 5 V, note 120 = 10 V in 0–10 V mode); gate, velocity, CC, pitch bend, channel pressure, program change, MIDI clock, start/stop, ADSR, note oscillator, LFO, RPN/NRPN and DRUM TRIGGER; sustain pedal; linear/exponential glide; 0–5 V / ±5 V / 0–10 V / 0–8 V ranges; NEW VOICE macro and ALL NOTES OFF. Added Android MIDI input dispatch through `window.midiIn` / AudioWorklet, persistent port configuration, 6 HP-inspired 12-jack panel, typed graph descriptor, 31 DSP tests, five graph tests, and panel/engine integration assertions. Oscillator pitch is precomputed per note and glide coefficients cached.
- The implementation uses the Android MIDI service's existing input endpoints; physical TRS sockets, USB-host power/role negotiation, configurable MIDI merge/thru routing, note-range learn/split, and hardware calibration are not emulated yet. The 12 outputs are statically typed as CV graph endpoints so they can feed CV destinations and destinations that explicitly accept CV as gate/audio input. This is a clean-room digital mapping implementation, not firmware-level reproduction.
- [x] Five-module gate is complete in source and tests: Hexmix (18 DSP + 5 graph), Hexpander (15 + 5), Pony VCF (17 + 5), Stereo Strip (19 + 5), MIDI Thing V2 (31 + 5). Total: **100 DSP tests + 25 graph tests**, plus rack inline-script, registry, asset and hardware-panel assertions.
- [x] Workflow #30 (`42631339976`) succeeded on `d8fc256fed489c490d6380e9301ee029966739f0`: **554/554 Node tests**, Plaits WASM 185,636 bytes, Beads WASM 196,726 bytes, Beads native self-test 10/10, Gradle `assembleDebug`, and both `WebAssembly.compile` checks passed. APK artifact `eurorack-study-debug-apk` ID `13680782195`, archive 1,656,971 bytes, SHA-256 `0c8eeca92e4531c4717c1489415c91dfba7da6de5b71557698d6d7ce42859c4d`; extracted `app-debug.apk` 1,691,305 bytes, SHA-256 `4687575d039d97e81f5edce09f6048e0ac59f580039bc380a8eac0349a17b6a0`. APK contains the current rack HTML, MIDI Thing V2 DSP and both WASM wrappers. Run #30 predates the new Gradle/JUnit step, so the nine MIDI decoder unit tests remain pending run #31.
- [ ] Physical Android MIDI input, touch interaction, polyphonic CV response and audio output remain untested on device. No hardware-parity claim is made.
- Working branch: `feature/befaco-modules`. Protected `main` remains at `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.


### Phase 7 CI correction log — run #26

- Workflow #26 executed the full Node suite: **551 tests, 545 passed, 6 failed**. The six failures were isolated to one Float32 exact-equality assertion in Hexpander, stale 36-vs-37 asset/registry uniqueness expectations, an outdated Pony VCF panel assertion, a missing explicit CHANNEL PRESSURE label, a MIDI Thing voice-count assertion checked before process(), and Pony VCF CV2 scaling that was not 1 V/oct.
- Corrected the Float32 assertion to use tolerance, updated uniqueness counts to 37, aligned the Pony VCF UI assertion with the actual DSP contract, clarified the MIDI Thing label, advanced the MIDI voice allocator before checking active voice count, and corrected Pony VCF cutoff CV scaling to true 1 V/oct.
- All corrections are committed on `feature/befaco-modules` with `[skip ci]`. Workflow #27 will rerun the full suite and continue to WASM/Gradle only if Node passes. No APK from #26 was produced; `main` remains untouched.


### Phase 7 CI correction log — run #27

- Workflow #27 ran all **551 Node tests: 550 passed, one failed**. The only remaining failure was a static UI label assertion: the MIDI Thing V2 footer shortened PROGRAM CHANGE to PROGRAM. The full label is now displayed. No DSP or graph test failed in this run.
- Workflow #28 is the final full-suite/WASM/Gradle/APK rerun. The module batch remains unvalidated until it completes successfully.


### Phase 7 CI correction log — run #28

- Workflow #28 again ran 551 Node tests: 550 passed and one static panel assertion failed because the faceplate footer abbreviated OSCILLATOR as OSC. The faceplate now spells out OSCILLATOR. The regression assertion continues to check the full visible label and the panel's selector controls.
- Workflow #29 will rerun the complete Node/WASM/Gradle/APK gate. No APK was produced by #28.


### Phase 7 implementation refinement and CI log — run #29

- The latest branch now includes MIDI Thing V2's additional **0–8 V** range, per-port drum-trigger note selector, and **DRUM TRIGGER** mapping. The compact port matrix was expanded to show PORT / FUNCTION / CHANNEL / VOICE / CC / NOTE / OUTPUT / JACK in a two-row layout.
- The Phase 7 module-specific tests now total **100 DSP tests + 25 graph tests**: Hexmix 18+5, Hexpander 15+5, Pony VCF 17+5, Stereo Strip 19+5, MIDI Thing V2 31+5. The repository-wide Node suite reported 554 tests in run #29.
- Workflow #29 failed one assertion: the second voice's gate was expected to be 5 V while its configured range was 0–10 V. The expectation was corrected to 10 V in `0383e7ceccb1e1d07e8e03ba9aa44c11dc3e52c3`. No APK was produced because the Node failure stopped the build steps.
- [x] Workflow #30 (`42631339976`) completed successfully: Node 554/554, WASM, Beads native self-test 10/10, Gradle APK assembly, artifact upload and WASM payload verification all passed. It used commit `d8fc256fed489c490d6380e9301ee029966739f0` and did not run the later-added Kotlin unit-test task.
- [x] Superseded by workflow #75 (13/13 MIDI JUnit tests and 690/690 Node tests) and the later complete workflow #77 (693/693 Node tests plus Gradle/JUnit, WASM and APK success). Phase 0 automated CI is complete; physical-device validation is still separate.


## Phase 7 CI validation — workflow #30

<badge>Success</badge>

- Workflow: https://github.com/joaoevooluti-web/Moldgf/actions/runs/42631339976
- Validated source snapshot: `d8fc256fed489c490d6380e9301ee029966739f0`.
- Node suite: **554 tests passed, 0 failed**.
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both wrappers passed the final base64/magic check and `WebAssembly.compile`.
- Beads native selftest: passed all media/mode cases, Synth energy and 44.1 kHz host + 24 kHz media resampling.
- Gradle: `assembleDebug` — `BUILD SUCCESSFUL`.
- APK artifact: `eurorack-study-debug-apk`, ID `13680782195`, archive size 1,656,971 bytes. Inner `app-debug.apk`: 1,691,305 bytes.
- APK SHA-256: `4687575d039d97e81f5edce09f6048e0ac59f580039bc380a8ec0349a17b6a0`.
- APK inspection confirms the five Phase 7 DSP assets, all 37 DSP assets, `index.html`, Plaits WASM and Beads WASM are packaged.
- The latest branch commit after the validated snapshot only adds the Android `testDebugUnitTest` step to the workflow. Workflow #31 will validate that additional Kotlin unit-test gate along with the same full build.
- Physical Android MIDI, touch and audio verification remain pending. `main` remains at `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.


### Phase 7 consolidated CI — run #30

- Workflow [#30 / 42631339976](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42631339976) completed with `success` on `d8fc256fed489c490d6380e9301ee029966739f0`. Node test runner: 554 tests, 554 passed, 0 failed. Emscripten generated Plaits (185,636 bytes) and Beads (196,726 bytes); both payloads passed the workflow's WebAssembly magic and compile checks.
- Beads native self-test output: media 0–3 in modes 0 and 1 (8 cases), synth energy, and 44.1 kHz host + 24 kHz media resampling all reported `OK`; final marker `SELFTEST OK` (10/10).
- Gradle `assembleDebug`: `BUILD SUCCESSFUL`; APK artifact `eurorack-study-debug-apk` ID `13680782195`, 1,656,971-byte archive, SHA-256 `0c8eeca92e4531c4717c1489415c91dfba7da6de5b71557698d6d7ce42859c4d`. The extracted APK is 1,691,305 bytes, SHA-256 `4687575d039d97e81f5edce09f6048e0ac59f580039bc380a8eac0349a17b6a0`; it contains `assets/index.html` (288,768 bytes), `midi_thing_v2_dsp.js`, `plaits_wasm.js`, and `beads_wasm.js`.
- This proves CI build/package contents only. No APK installation, Android MIDI hardware, touch, or audio-output test was performed. The run predates the Gradle/JUnit test step added in `dce4767851246bc287adead2f1f364d285b54152`; run #31 is required for the nine MIDI decoder unit tests.


## Regression report — manual patch cables and module panel fidelity

- User reported that manual patching by dragging from one jack to another is rejected, and that module panels look generic rather than matching the physical Befaco references. Treat this as a release-blocking UI/graph regression. Pause additional module expansion until the rack's patch interaction and panel fidelity are restored.
- Root cause found in the live rack adapter: rack instances are stored as `{ id, t, s, ... }`, but `MoldgfModuleGraph.canConnect()` previously read only `.type`. The manual jack path passed the live instance, so validation received an undefined module type and returned `unknown-module`.
- Fixed `canConnect()` to normalize either the canonical `.type` field or the rack runtime's `.t` field. Added a regression test using live rack-shaped instances to prove output-to-input validation succeeds. Commits: `8ae3c0db7e1c2d9d5cb0c95fe5b6fdd138cccc34` (graph fix), `74bf8e6593116fd0ffc9c21a83305895d10b352d` (test).
- No workflow, APK build, or changes to `main` were made for this fix. The new regression test has been authored but not yet executed in CI.
- Visual audit confirms the current Random8, MEX, Octaves, IROI and Bandit implementations use simplified horizontal CSS cards (e.g. 340px Random8, 190px MEX, 360px Octaves, 440px IROI and 270px Bandit) rather than convincing Eurorack faceplates with the documented HP proportions, vertical jack/control layout, original control groupings and hardware-style labels. Having dedicated CSS classes is not sufficient to claim hardware-faithful panels.
- Next corrective work: (1) validate and test manual cable drag, tap-to-connect, reconnect/replace, cable rendering and graph-to-DSP signal delivery; (2) redesign the five panels from official product photos/manuals with correct vertical HP proportions, jack locations, knobs/switches/LEDs and module-specific visual hierarchy; (3) add DOM/UI regression tests and verify panel geometry at phone and desktop widths. Do not resume module expansion or dispatch CI until these regressions are resolved and reviewed.

## Phase 8 — next five Befaco modules selected (implementation not yet started)

The official Befaco catalogue lists these five products, and the current rack registry / DSP asset list does not contain them. They form the next batch after the Phase 7 validation gate:

1. **BF-22** — dual Sallen-Key high-/low-pass filter, selectable 6/12 dB response, two cutoff CV inputs per channel, resonance CV, attenuverter and A→B link. 17 HP. Official page: https://www.befaco.org/bf-22/ ; user manual: https://befaco.org/docs/BF-22/BF_22_User_Manual.pdf
2. **Crush Delay V3** — PT2399-inspired echo/delay with main IN and RETURN VCAs, TIME and FEEDBACK CV, three gate-controlled crush modifiers, DRY/WET, OUT and fully wet SEND. Published clean delay reaches 400 ms; the noisy/crushed region extends the repetitions. 11 HP. Official page: https://www.befaco.org/crush-delay-v3/ ; user manual: https://befaco.org/docs/Crush_Delay/Crush_Delay_V3_User_Manual.pdf
3. **CV Thing** — eight configurable CV inputs mapped to MIDI CC, V/Oct note, poly note, note, velocity, pitch bend, program change, channel pressure, clock/start-stop, 14-bit CC and NRPN, plus digital/chord functions. 6 HP. Official page: https://www.befaco.org/cv_thing/ ; user manual v1.4.1: https://befaco.org/docs/CV_Thing/CV_Thing_V1.4.1_User_Manual.pdf
4. **Joystick** — X/Y CV controller with range/offset, attenuverter mode for two incoming signals, and two manual gate buttons. 12 HP. Official page: https://www.befaco.org/joystick/ ; assembly guide: https://befaco.org/docs/Joystick/Joystick_V1_Assembly_Manual.pdf
5. **DivKid Mutes mk2** — four click-free VCA mute channels, each with momentary/OFF/ON switching, signal LEDs and buffered cascading normalled inputs; 4 HP, with a convertible 1U panel. Official page: https://www.befaco.org/divkid_mutes_mk2/ ; assembly guide: https://befaco.org/docs/Mutes/Mutes_mk2_Assembly_Manual.pdf

Implementation order: BF-22 → Crush Delay V3 → Joystick → DivKid Mutes mk2 → CV Thing. CV Thing is last because it requires a robust 8-input CV-to-MIDI event bridge through the Android MIDI output service. Its physical TRS/USB host connectors will not be represented as hardware on the phone; MIDI routing will use supported Android MIDI endpoints. BF-22 and Crush Delay are clean-room digital approximations of documented behavior, not transistor/PT2399 circuit emulations. Joystick will be represented by a touch XY surface and two gate buttons, not a physical arcade stick.

For each module: DSP asset, typed graph descriptor, rack engine integration, persistent state, original hardware-layout-inspired panel, signal meters/LEDs, dedicated DSP and graph tests, and integration assertions. **Do not trigger Node/WASM/APK workflows until all five Phase 8 modules are implemented and their tests are authored.** Preserve existing 37 modules and main.


## Phase 7 final gate — workflow #31

<badge>Success</badge>

- Workflow: https://github.com/joaoevooluti-web/Moldgf/actions/runs/42632127788
- Node: **554/554 passed**.
- Android unit tests: `gradle testDebugUnitTest --no-daemon` — `BUILD SUCCESSFUL`.
- Plaits and Beads WASM: 185,636 / 196,726 bytes; both passed `WebAssembly.compile`.
- Gradle debug APK assembly and artifact upload: success.
- Artifact: `eurorack-study-debug-apk`, ID `13681132622`, archive size 1,657,064 bytes.
- This validates the additional Kotlin test step added after workflow #30. Physical-device audio, MIDI and touch tests remain pending.

## Phase 8 progress — BF-22 (module 1/5)

- [~] **BF-22:** added `bf22_dsp.js`, two independent HP/LP filter channels, selectable 6/12 dB responses, resonance CV, CV1 attenuverter with three-octave span, CV2 1V/oct tracking across four octaves, manual cutoff/resonance, and A→B link that normalizes A output into B while disconnecting B's external input. Integrated the engine, 10 typed audio/CV graph endpoints, persistent parameters, and an original 17 HP two-channel panel with input/output jacks, CV jacks, controls and live cutoff/resonance/peak meters. Added **22 DSP tests + 5 graph tests** and updated integration assertions to 38 unique assets/descriptors. This is a digital Sallen-Key-inspired model, not a transistor-level MS-20 circuit clone. These tests are authored but have **not** been run in CI.
- Next module: Crush Delay V3. Keep all intermediate commits marked `[skip ci]`; no Node/WASM/APK workflow until all five Phase 8 modules and their tests are complete.
- Current branch head: `d7e06e0e7b058b8a76e3bc8cb6891b34171d4f3f` (documentation commits may advance it). Protected `main` remains `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.


### Phase 8 progress — BF-22 and Crush Delay V3 (2/5)

- [x] **BF-22:** dual 6/12 dB HP/LP filter, CV1 attenuverter (3-octave span), CV2 1V/oct (four-octave range), resonance CV and A→B link; two-channel panel, 10 typed ports, 22 DSP + 5 graph tests authored.
- [x] **Crush Delay V3:** preallocated 2-second delay buffer, clean 5–400 ms region and crushed extension to 2 seconds, IN/RETURN VCAs with 10 V normaling, TIME/FEEDBACK/DRY-WET CV, three crush modifiers plus 3 V gate input, feedback repeats, fully wet SEND and dry/wet OUT. Added 11 HP-inspired panel, 10 typed ports, 24 DSP + 5 graph tests authored.
- Combined Phase 8 coverage so far: **46 DSP + 10 graph tests**, all authored but not run in CI. Registry/assets now contain 39 unique entries.
- Next: Joystick. No workflow until all five Phase 8 modules and tests are complete.


### Manual patching regression — BF-22 descriptor mismatch

- [x] Re-audited the live rack adapter and confirmed `module_graph.js` accepts rack instances using the runtime `t` field; a regression test already covers this earlier failure.
- [x] Found a second concrete blocker in the BF-22 typed graph descriptor: the physical panel renders jacks `in`, `cv1`, `cv2`, `resCV`, `out`, while the descriptor incorrectly declared `inA`, `inB`, `cv1A`, `cv2A`, `resCVA`, `cv1B`, `cv2B`, `resCVB`, `outA`, `outB`. Consequently `canConnect()` returned `unknown-port` for every BF-22 manual patch even though the jack existed in the UI. Replaced the descriptor with the five actual runtime jack IDs in commit `bdd8ebdeb05f22804e8fc4e059feba92a401cb42`.
- [x] Added graph-level regression coverage for BF-22's three CV inputs and audio input/output, plus rack HTML assertions that the panel jack IDs and typed descriptor stay aligned. Test commits: `313635c023dc08eee1b863c961355c7b45560673` and `c1da0daaf02c3c58c56b307184f7fb056ed20561`; UI assertion commit: `9ca073a209d61b6f2d707cfb6a606a21a01a2921`.
- [x] These new tests were executed in workflow #77 as part of the 693/693 passing Node suite; Gradle/JUnit, WASM, APK assembly and artifact verification also passed. No physical-device validation is claimed.
- [ ] The five panels still require a proper hardware-reference redesign. Current CSS uses horizontal card layouts (Random8 8-column strips, MEX 4-column switches, Octaves 3-column groups, IROI 2-column sections, Bandit 4-column bands), which do not reproduce the physical vertical faceplates. Next visual pass must use product-specific HP widths and vertical control/jack placement, not just change colors or labels.
- Next: audit all 39 registered module descriptors against actual rendered jack IDs; add a generated consistency test so no module can ship a panel jack absent from its descriptor. Then redesign Random8, MEX, Octaves VCO, IROI and Bandit panels from official product images/manuals. Keep CI blocked until the complete regression and visual pass is ready.

### Catalog-wide Befaco hardware faceplate recovery — visual pass 1

- [x] Recovered the live branch state and confirmed main remains at 8e81fcb36fb1bedbf63019b6ee5d890f694fb165; all work stays on feature/befaco-modules.
- [x] Audited all 39 registered module types and their corresponding HTML renderers, including dynamically generated jack groups. Confirmed the BF-22 fix remains in the typed registry (in, cv1, cv2, resCV, out); Random8 and Noise Plethora use generated port declarations for repeated channel jacks, so a literal-only scan falsely reported them as incomplete.
- [x] Added a first hardware-proportion pass for the latest five ports: Random8 8HP (156px), MEX 4HP (82px), Octaves 12HP (218px), IROI 18HP (326px), Bandit 10HP (184px). MEX now lays out its eight step switches as a vertical rail; Random8 keeps eight narrow channel columns; Octaves has compact grouped controls; IROI retains its two-section control field; Bandit retains four spectral strips.
- [x] Applied an HP-based width map and responsive wrapping to all 39 registered Befaco modules, with a shared jack/faceplate treatment. This replaces inconsistent oversized card widths with a consistent physical-width scale (18px per HP plus faceplate allowance) and allows control rows to wrap into a portrait layout.
- [x] Added a visual regression test checking the five detailed faceplates and their physical-width/layout rules.
- [x] The visual-regression assertions were included in workflow #77's 693/693 passing Node suite. This CSS pass remains a first catalog-wide geometry correction, not a pixel-perfect reproduction of every official panel; reference-by-reference control positions, knob diameters, jack coordinates, silkscreen, color and HP measurements remain open.
- [~] Automated typed graph contracts passed in workflow #77, but a generated DOM-vs-descriptor audit for every rendered jack, manual path entry and cable drag/drop coverage for every module type remain open.
- Current code changes: faceplate pass cf4d5824c42b3795946df46275c488f7a85b68ae; visual regression test c8d1a29a06b3319f6916214535b2404065e49ae2; catalog-wide HP layout 50a14a656a1b7861a8614b50b07da2e56f1df32a. CI remains intentionally blocked until the five-module batch and full visual/patch regression gate are complete.
### APK recovery gate — 2026-11-09

- The first catalog-wide visual commit triggered workflow run 42647512960 on commit 50a14a656a1b7861a8614b50b07da2e56f1df32a. It failed before Android setup: 614/617 Node tests passed; failures were two invalid assertions (BF-22 compared two equal initial numeric integrator values instead of independent state objects; Crush Delay sample-hold test included the sample immediately before the first delayed sample) and one overly literal BF-22 descriptor assertion that ignored its generated CV-port array.
- Corrected those three test assertions in cb212869a27bc87a744ea61db09ca167c6e484bf, d65278cffc98b0f0989bbce1dfe966d70fba4f4c, and 5e81fdef7e6a68e7e721a4f48797b7b15310539f. These commits were intentionally marked skip-ci to avoid launching builds before the failures were understood.
- The missing plaits_wasm.js failure in run 42647512960 was downstream: Node test failure skipped Emscripten setup and native/WASM build, while the unconditional final verifier still ran. Next run must execute Node tests first, then WASM build, Android unit tests and APK assemble. Inspect the WASM build log if the optional native compilation fails; APK packaging is independent of this optional step.
- Do not call the APK ready until workflow reports successful Node tests, Android unit tests and assembleDebug, and the APK artifact can be downloaded and verified. Preserve main.
### Rack-wide history and visual fidelity follow-up

- [x] Cable patching remains based on the typed module graph and existing jack endpoint IDs; no changes were made to its connection contract.
- [x] Added rack-wide undo/redo controls and Ctrl+Z / Ctrl+Y shortcuts. History snapshots include module inventory, module parameters, rack order and cable endpoints, with an 80-step cap. Restores go through loadRack so graph endpoints are remapped to the recreated module IDs.
- [x] Added regression assertions for history controls, snapshot/restore and keyboard shortcuts.
- [ ] Visual fidelity is not yet complete. The previous generic HP CSS pass is insufficient for accurate per-module faceplates. Official product references confirm examples such as Random8 8HP, MEX 4HP, IROI 18HP, Rampage 18HP, while a catalog rack lists Bandit 8HP; the existing Bandit 10HP width rule is therefore wrong and must be corrected. Each of the 39 renderers still needs its own reference-driven control layout, jack coordinates, switch/knob sizes, colors and typography, not just a shared width map.
- [ ] Next visual implementation should be done in batches with official Befaco photos/manuals as visual ground truth, starting by correcting HP metadata and the five latest panels, then the remaining modules. Keep module DSP and graph descriptors untouched unless a matching functional defect is found.
- Current history commits: 30b60cbc36a8c53428f337446c5c01c8bca6d173 and e2c924318a7b8f1d0bf6b756a7f67c571ecc8ae; regression test: 9b587a9e356abee4320c40e5f1b5bc3c16fa1e87. No APK has been built for this history update yet.

### Visual pass 2 — hardware reference styling for five panels

- [x] Reworked the faceplate visual language for Random8, MEX, Octaves VCO, IROI and Bandit using product photographs as references: dark anodized panels, high-contrast legends, jack ring treatments, red hardware accents, module-specific switch/slider styling and more faithful control grouping.
- [x] Corrected Bandit to 8HP (156px at the app's current 18px/HP scale plus faceplate allowance). The previous 184px/10HP width was incorrect. IROI remains 18HP/326px; Octaves 12HP/218px; MEX 4HP/82px; Random8 8HP/156px.
- [x] Preserved module DSP, graph descriptors, jack IDs and cable interaction code; this pass changes only the faceplate CSS.
- [ ] Visual review against reference images at phone and desktop sizes remains open. This is a substantial styling pass, not a pixel-perfect or visually approved completion.
- [ ] Add DOM/runtime geometry tests for the five panels and verify all control hit targets, jack coordinates, undo/redo and manual patching after the CSS change.
- CI status: the previous run #47 succeeded on commit cf4964a50199cb5c2dbe75e01767b67185c46247, but it predates this CSS commit. A new workflow may run automatically for the CSS push; do not treat #47 as validation of this visual pass.
- Visual pass commit: 48815dad8406de99d9a059e72afbe1964c4ec69a. Main remains at 8e81fcb36fb1bedbf63019b6ee5d890f694fb165.


### Phase 8 progress — Joystick (DSP connected to rack engine; visual/interaction validation pending)

- [~] **Joystick DSP:** bipolar X/Y CV generation, external X/Y CV mode, range/offset, independent 10 V gates, finite-value handling and reusable result state. 14 DSP tests authored; not yet executed.
- [x] Six typed graph endpoints remain registered: X/Y CV inputs, X/Y CV outputs and X/Y gate outputs. Graph regression tests cover both axes, signal types and a manual cable path.
- [x] Added Joystick DSP to both browser script loading and AudioWorklet DSP source loading; initialized its runtime state and added a per-step processor that reads the typed X/Y inputs and publishes X/Y plus gate outputs. This also makes the same DSP callable in the ScriptProcessor fallback because both use the shared engine.
- [x] Added a dedicated original Moldgf 12 HP-style faceplate layout, axis controls, six jack positions, custom CSS and a touch XY pad that updates saved module parameters. The normal rack jack DOM IDs and cable drawing/rebuild functions were not changed.
- [x] Added manual/CV input mode selection, X/Y attenuverters and independent Gate X/Gate Y toggle buttons; gate state is reflected on the panel. Hardware-reference visual review and device behavior still need verification. Added `joystick_runtime_integration.test.cjs` to check page/Worklet loading, runtime state, processing dispatch, six panel jack IDs, XY handler presence and inline engine syntax. These tests are authored but not run; parameter save/restore, live cable geometry and device behavior still need validation.
- [x] Workflow #77 ran after the shadow-scheduler test correction; all 693 Node tests and the full Android/WASM/APK pipeline passed.
- Commits: DSP c24e8439efdd3759a3b9fcfe7c2c85b8a82a6635; DSP tests 6a8461a65116e26c4b02ce12574622c2f1bfc4c8; graph registration 2db9f2d3d10ea3f8aefd45fb40a3e73de7d7c6f6; graph tests 04a55c76e7eb528412fd99aa6f15c9058d7be4d9; engine/panel integration 8010d8be998251571b276fad33b5af76fdd34eb6; faceplate styling d8037351419c299dbec4e8423326cae74baef980; XY touch interaction 70a3acb74f769d3acbb10e7d33083b630299e456.
- [x] Added `joystick_runtime_integration.test.cjs` for page/Worklet loading, state initialization, processing dispatch, six panel jack IDs, XY handler and inline script syntax; executed in workflow #77.
- **DivKid Mutes mk2 — live rack integration in progress:**
  - [x] Added its DSP to page and AudioWorklet loading, initialized persistent DSP state, and dispatched all four audio channels in the shared engine.
  - [x] Registered four typed audio inputs and four typed audio outputs; added a dedicated four-channel panel with MOM/OFF/ON selector, momentary HOLD interaction, channel LEDs and response control.
  - [x] Added `divkid_mutes_mk2_runtime_integration.test.cjs` covering loading, dispatch, typed jack declarations, momentary release and inline script syntax; executed in workflow #77.
  - [ ] Validate the real hardware switch feel, LED behavior, patch normalization through the graph, parameter save/restore, and audio transitions. The current DSP is a smoothed VCA model; it still requires manual/schematic verification against the module.
  - Commits: runtime/graph/panel integration fa8ea3195f20b824b0a467d4b35ec2a72aafb273; panel styling and momentary interaction 76dd9be2f2f29a633e5c472377f9ba3419587bfc; runtime tests f95c2ef9830355bec5e29002db0f2fe63cbf26b8.
- **CV Thing — integrated against the official 8-input hardware architecture; validation pending:**
  - [x] Added DSP to page and AudioWorklet loading; created per-instance state and an eight-input processor in the shared sample engine.
  - [x] Corrected the physical topology to exactly eight CV-capable jacks (not eight CV plus eight phantom Gate jacks). V/Oct Note mode pairs an odd-numbered CV input with the following physical input as Gate, and reserves that paired input from separate mapping. Clock and Start/Stop use a single CV input with the documented 2 V threshold.
  - [x] Added a dedicated 6 HP-style faceplate with OLED-inspired performance screen, encoder treatment, MIDI channel, threshold and eight mapping rows. The mapping modes currently implemented are CC, V/Oct Note, Program Change, Clock and Start/Stop; this is a documented functional subset, not the full firmware feature list.
  - [x] Routed generated MIDI events through the existing MQ queue, native NAT.midiOutBatch bridge and Web MIDI outputs. Added a tested native MIDI batch encoder so real-time Clock/Start/Stop bytes are sent as one-byte messages, while Program Change and channel voice messages retain their proper lengths. Web MIDI now uses the same correct message lengths.
  - [x] Added CV Thing runtime tests and expanded DSP tests for paired CV/Gate notes, unplugged inputs, note-off on gate removal, and clean Start/Stop initialization; included in the 693 passing Node tests in workflow #77.
  - [x] Added paired-gate UI feedback: when an input is assigned V/Oct Note, the following input is visibly marked and its independent mapping selector is disabled because that jack is consumed as Gate.
  - [x] Fixed MIDI 1.0 message framing for one-byte real-time Clock/Start/Stop statuses in both Android native and Web MIDI paths; added four Kotlin encoder tests. Added DSP protections against startup events on unpatched inputs and against stuck notes when a paired Gate is disconnected.
  - [ ] Remaining validation: event-rate behavior, mapping persistence across app restart, complete CV Thing firmware feature coverage (NRPN, velocity, pitch bend, note gate/latch, etc.), and physical MIDI reception.
  - Official reference: https://www.befaco.org/CV_thing/ and CV Thing User Manual v1.4.1. The manual specifies eight CV inputs and uses the following input as Gate for V/Oct Note mode.
  - Commits: initial engine/graph/panel/MIDI integration 8b0664189c27a0ceea75fa8f22025b6234abebcb; eight-input topology and paired-gate DSP commits ccb1b4ce7f5945b8f2fbf100b68d8c76aaff8111, ad13f309f80fde80ef249bb56372314fa137bb17, b483e24ffd7ea8cee49c45281d401fc4588f8c1a; native MIDI encoder/bridge/tests 151ae24cb029d8a1d2e6db4239851ae0b920ef16, 67ff4e80137aecb90131b811b3a31c6ac6dec630, ffd3180e606f3d7b2d2334bcf182ed1724841d14; paired-gate UI d59eaba30eed404fc29935d261dd204bb86fa85c / 152a8df195c27dd28dea9631fe00591b8704aa63; latest DSP tests 66343fe8e7d3acd8c91c5145de68c1b41df34bf6 and runtime tests 30d42cbce604752def8eca297288b24149b12515 / 2cfeb4844ad0916998631d62337e21644f6c2e95.
- **BF-22 / Crush Delay V3 — revalidation:**
  - [x] Reconciled BF-22's live graph descriptor with its real two-channel DSP and panel endpoints: inA/inB, six CV inputs, outA/outB. The old live descriptor exposed generic in/cv1/cv2/resCV/out names that did not match the module's actual jacks, which could make patch connections fail. The corrected descriptor preserves existing audio/CV compatibility for the two audio inputs.
  - [x] Confirmed Crush Delay V3's live descriptor, panel jack IDs and DSP dispatch agree: IN, RETURN, five CV controls, crush gate, OUT and SEND.
  - [x] Existing BF-22 and Crush Delay V3 DSP/graph tests were executed in workflow #77; the BF-22 ten-port topology and Crush Delay ten endpoints passed the current-branch Node suite.
  - [x] Current-index runtime assertions, all module DSP/graph/integration tests, and APK artifact inspection completed in workflow #77.
- [x] Combined current-source integration test `phase8_live_integration.test.cjs` added for all five module assets, state initialization, sample dispatch, BF-22 and Crush Delay port/panel agreement, Joystick gates and Mutes momentary controls. All individual runtime integration suites and the Kotlin MIDI encoder tests are now present.
- [x] Final-batch CI validation completed in workflow #77: Node 693/693, Android/JUnit, Plaits/Beads WASM, Gradle APK and artifact inspection all passed. Physical Android/MIDI/audio validation remains separate.
- Next: complete the generated DOM-jack/descriptor consistency audit, then migrate one verified module group to active topological execution while retaining the legacy DSP fallback.

### Phase 8 — Five-module batch CI evidence (2026-11-09)

- **CI success:** [Workflow #71 / 42676962627](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42676962627) completed successfully on feature commit `e9222815cefe78ed33fcdc708787e57b6d4137ec`.
- Node module graph, DSP and live integration suite: **686 passed, 0 failed**.
- Emscripten build: Plaits WASM **185,636 bytes**; Beads WASM **196,726 bytes**. Both wrappers passed WebAssembly compilation and magic/size validation.
- Android unit tests (including MIDI batch encoder tests): Gradle task completed successfully; report artifact ID **13700641671**.
- Debug APK: Gradle `assembleDebug` completed successfully and artifact uploaded, ID **13700657045** (artifact ZIP 1,674,518 bytes).
- WASM build log artifact ID **13700972279**.
- All workflow jobs completed with success. This validates the repository test/build pipeline, not installation, audio quality, touch behavior, MIDI reception or hardware visual fidelity on a physical Android device.
- Branch protection: `main` remains unchanged at `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`. No merge to main was performed.

**Phase 8 status:** five-module implementation and CI build/test gate passed. Remaining work is separate hardware/device validation and any follow-up fixes discovered there; do not call the modules physically validated yet.


### CV Thing follow-up — NRPN and Pitch Bend

- [x] Added two additional CV Thing mapping modes: **NRPN** and **Pitch Bend**.
- [x] NRPN uses the row's parameter-number field and converts the incoming bipolar CV to a 14-bit value; the MIDI bridge emits the four standard CC messages (99, 98, 6, 38) in order.
- [x] Pitch Bend converts -5 V..+5 V to the complete 14-bit MIDI range (0..16383), centered at 8192, and sends the channel pitch-bend message with correctly ordered LSB/MSB bytes.
- [x] Added DSP tests for NRPN parameter/value bounds and Pitch Bend endpoints/center, plus runtime integration assertions for the UI and MIDI bridge.
- [ ] Remaining CV Thing work: velocity controlled by CV, selectable gate/latch note behavior, full firmware feature coverage, and physical MIDI reception.
- Implementation commits: `68d5ec77c82a7cb2a2f815197aafb1f51f9544b2`, `5a1e70e21a3ab3870e64a0741737be4100d1cdbc`, `4ef3ec7d8afcec78588d0f3eb61e60d8b5b21731`, `fca0164776e0594e9be41b44b02521674e0d3f24`.
- The full Node/Android/WASM/APK pipeline passed in workflow #77. CV Thing's NRPN and Pitch Bend code is CI-validated; velocity-by-CV, selectable gate/latch behavior, remaining firmware coverage and physical MIDI reception are still pending.
- Preserve the existing eight-jack hardware topology and paired V/Oct/Gate behavior. No changes to `main`.


## Latest verified repository state — 2026-11-10

This snapshot supersedes older pending-CI notes above where they refer to tests or APK validation that have since run.

### Branch and commits
- Working branch: `feature/befaco-modules`.
- Latest code/test commit validated by CI: `29c7dbb408b26851b3b2a5ea7fb5418e66002013` (scheduler runtime test selector correction; parent `5433518e25fc598793ee80b55d2269a3adecf964` contains the shadow scheduler integration).
- `main` remains exactly `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`; comparison reports feature branch 570 commits ahead, 0 behind at the validated code commit. No merge, force-push or write to `main`.

### Workflow #77 — complete CI validation
- [x] Workflow [#77 / 42829232566](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42829232566) completed with `success` on the validated commit above; every job step completed successfully.
- [x] Node suite: **693 passed, 0 failed**, including all current DSP, typed graph, runtime integration, visual assertion and shadow scheduler tests.
- [x] Android/JUnit: `gradle testDebugUnitTest --no-daemon` succeeded. The uploaded XML report contains **9/9 MidiMessageDecoderTest** and **4/4 MidiBatchEncoderTest** cases, with zero failures, errors or skips.
- [x] WASM: Plaits **185,636 bytes** and Beads **196,726 bytes**; the Beads native self-test passed its eight media/mode combinations, synth-output and resampling checks; both embedded payloads passed `WebAssembly.compile`.
- [x] Android packaging: `gradle assembleDebug --no-daemon` succeeded. Artifact `eurorack-study-debug-apk` ID **13771540494**, ZIP **1,675,219 bytes**, SHA-256 `1ed9a7f29dc411a31b7972e1035439148b37a28ae7aca1013d99c1705ccb6837`. The APK inside is **1,709,747 bytes**, SHA-256 `760f81f0d51d82c375352ca727e98bf28cff3ca406f71e22780d33733edecea1`.
- [x] Android unit-test report artifact ID **13770214220**, 9,914 bytes, SHA-256 `ca87aadfcf89df9802bdcbd9fc3f168e2eb35417b2b248c03e461e7d85c625f5`; WASM log artifact ID **13771140612**, 1,379 bytes, SHA-256 `1a71c68e1c8998a018241c64ed0c4dc02837008cfa0b4cf41a6f1263326dc7c4`.
- [x] Downloaded and inspected the APK archive: it contains `assets/index.html` with the shadow-plan hook, `module_graph.js`, all **42** DSP assets, and the Plaits/Beads WASM wrappers. This is CI/package-content evidence only, not installation or physical-device validation.

### Reconciliation of the 34 Befaco targets
- [x] Inventory audit found a DSP asset and a dedicated DSP test file for **all 34 planned Befaco modules**.
- [x] **33/34** have a dedicated graph test file; Atte's graph behavior is covered by the shared deterministic `audio_graph_smoke.test.cjs`. The repository has 42 DSP assets/test pairs (the 34 Befaco targets plus eight additional non-catalog/legacy integrations), 40 graph test files and 90 Node test files.
- [x] The full Node runner in #77 executed the complete current suite successfully. The 34 modules are therefore source-integrated and CI-tested at the DSP/graph contract level; this does not imply bit-exact analog behavior, complete firmware feature parity or physical hardware verification.
- [ ] Keep the remaining behavioral approximations visible: IROI is represented as two scalar mono paths rather than a native stereo bus; MEX rear THRU daisy-chain behavior is not modeled; Pony VCO uses polyBLEP rather than the VCV 12× oversampled core; Noise Plethora and several analog effects are clean-room approximations; MIDI Thing/CV Thing hardware routing and physical MIDI reception remain unverified.
- [ ] Visual faceplate fidelity is still incomplete. The shared HP/geometry pass and five detailed panels are not a per-module reference-approved redesign. No physical Android, audio, touch, MIDI reception or performance validation is claimed.

### Phase 1 scheduler status and next safe step
- [x] Shadow topological plan and generated faceplate audit are integrated; the generated-template audit covers 42 DSP module descriptors plus the internal Audio Out sink (43 total). A live DOM audit in a physical WebView remains unverified.
- [x] Active topological execution is enabled only for a fully typed, acyclic rack containing Atte, Mixer2, Mixer and/or the internal Audio Out sink. Cable order is checked in the UI and audio engine; unsupported modules, missing instances, cycles, invalid plans or incomplete worker sync automatically use the legacy `step()`.
- [x] AudioWorklet receives the validated order with cable updates and holds it until module sync completes. ScriptProcessor fallback uses the same shared engine setter and the same `step()`.
- [ ] Broaden the active adapter set only after each module's input normaling, hidden host links, state/reset semantics and sample-rate behavior are audited. Parameter-event queue, versioned per-module state and explicit reset/bypass contracts remain pending.



## Runtime jack audit — 2026-11-11

- [x] Added a pure graph utility that compares each module descriptor against the jack elements rendered by its faceplate.
- [x] Audit reports descriptor ports missing from the faceplate, unregistered faceplate jacks, duplicate rendered jack IDs, and input/output direction mismatches.
- [x] Exposed a read-only in-app diagnostic at `window.MoldgfJackAudit()`, with per-module results and a summary. It reads actual DOM jack elements (not the deduplicated jack lookup map), so duplicate elements remain visible to the audit.
- [x] Added unit tests for valid matching ports and all four mismatch categories.
- [x] Kept the real-time audio sample processor and shadow-only scheduler behavior unchanged.
- [x] Deterministic generated-template audit now covers 43 explicit descriptors (42 DSP module types plus internal Audio Out); it renders each real TY faceplate template and detects missing, unregistered, duplicate, and wrong-direction jacks. A separate live DOM diagnostic in an actual WebView rack remains pending.
- Implementation commits: `6d0b37b886f1b6f41a576174be4a2a67cb62f954`, `adb8cac64ba9da05836e8868dd6e22af8ec89351`, `fe172cf9122889103de0c3b02f7a7199f26e8588`, `fb1e263255179566fe42b25aed37efca114abc70`, `8dfa04c5fea74be6492e1b53a028c5b2d5556b28`, `5cab9f73d7ea73a5d1e9bffea9d32c70b001e2d0`, `9f351dd826c6602046092581a4a60980ee3e4952`.
- Node test step passed in workflow `42993312372` on commit `9f351dd826c6602046092581a4a60980ee3e4952`; WASM build also passed. Android unit tests, APK assembly and embedded WASM verification had not completed at the time this note was written. This commit predates the final no-content commit `37b448e1260cda9b2f1ed185c6f8d75713791dd5`; both point to the same test content.
- `main` remains unchanged; all changes are confined to `feature/befaco-modules`.


## Verified CI and Burst port correction — 2026-11-11

### Repository snapshot before this batch
- Working branch: feature/befaco-modules; HEAD f9e7819718e3d8186462e0e9970f96325236a1a9 (roadmap-only commit, parent 37b448e1260cda9b2f1ed185c6f8d75713791dd5).
- Latest code/test commit with a complete CI run: 9f351dd826c6602046092581a4a60980ee3e4952.
- main remains 8e81fcb36fb1bedbf63019b6ee5d890f694fb165; comparison at this snapshot: feature branch 585 commits ahead, 0 behind. No merge or force-push.
- The roadmap-only HEAD after workflow #85 has the same application/test tree as the validated code commit; its only change is documentation.

### Workflow #85 — full CI success
- [x] Workflow [#85 / 42993312372](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42993312372) completed with success on code commit 9f351dd826c6602046092581a4a60980ee3e4952. Its single build job completed all steps successfully.
- [x] Node suite: 696 passed, 0 failed. This is the direct runner summary from the job log.
- [x] Android/JUnit: Gradle testDebugUnitTest succeeded. The downloaded XML report artifact confirms MidiMessageDecoderTest 9/9 and MidiBatchEncoderTest 4/4, with zero failures, errors, or skips.
- [x] WASM: Plaits 185,636 bytes and Beads 196,726 bytes were generated. The uploaded build log confirms Plaits/Beads success, all eight Beads media/mode self-test cases, synth output, and 44.1 kHz host / 24 kHz media resampling. Both embedded payloads passed WebAssembly.compile.
- [x] Android packaging: Gradle assembleDebug completed successfully. Artifact eurorack-study-debug-apk ID 13843480684, ZIP size 1,675,765 bytes, SHA-256 b637a9e336f8d2c853357b2cb6dab651b25d94e3032d547eb72d57428c86e6ad. The extracted APK is 1,710,395 bytes, SHA-256 8c84ec3b02ab5128e689e7b1e79ae0aad95157cf1ca6e21573440c1a59ded7cf.
- [x] APK archive inspection confirms assets/index.html, assets/module_graph.js, all 42 *_dsp.js assets, and both Plaits/Beads WASM wrappers are present.
- [x] Supporting artifacts: Android unit-test report ID 13842981793 (9,907-byte ZIP, SHA-256 47bb013cdf649c28865671ba6b242b3ef396faa38505b451153100837c38f13a); WASM log ID 13842626408 (1,379-byte ZIP, SHA-256 f47ece8831a21f2aaad0e69d24d8376a299b025fdff0ea1d4780deb39a4f453c).
- [ ] No installation, physical audio output, MIDI reception, touch, latency, or device compatibility validation is claimed.

### Failed intermediate workflow #84 — corrected
- [x] Workflow [#84 / 42993262781](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42993262781) stopped at the Node gate: 692/693 passed. The sole failure was a source assertion that expected escaped dots in document.querySelectorAll; the actual implementation correctly uses ordinary dots. The WASM, JUnit and APK steps were skipped, and the final verifier consequently reported missing wrappers.
- [x] Corrected the assertion in commit 9f351dd826c6602046092581a4a60980ee3e4952; workflow #85 then passed the complete pipeline. No DSP, MIDI, graph or APK regression is indicated by #84.

### Burst — descriptor/faceplate mismatch found and corrected in this batch
- Official Burst documentation identifies a dedicated Distribution knob/CV input; the DSP already consumed inputs.distribution and the typed descriptor already declared the distribution input, but the faceplate template omitted its jack. The official manual explains that the CV is summed with the panel control. References: https://www.befaco.org/burst-2/ and https://befaco.org/docs/Burst/Burst_User_Manual.pdf.
- [x] Added the missing DIST CV input jack beside the Distribution control. Existing DSP processing and graph port IDs are unchanged; the already-existing Burst graph test continues to cover CV connectivity.
- [x] Added a generated-template regression test that evaluates all 42 registered module descriptors and their actual TY[type].html(id) render functions, then compares every generated jack ID/direction against the descriptor. This is template-level validation, not a live WebView DOM/device test.
- [x] The pre-fix generated audit found exactly one mismatch: Burst missing distribution. Re-running the same deterministic audit after the panel change returned 42/42 descriptors valid, zero mismatches.
- [x] Burst panel correction and generated-template regression test were committed together in code/test commit e8655db4d3f7ba68a8739f884177b99ca985a95d. Workflow #86 passed the complete CI pipeline; details are recorded below.



### Workflow #86 — Burst jack audit CI validation

- [x] Workflow [#86 / 43034016080](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43034016080) completed with success on commit e8655db4d3f7ba68a8739f884177b99ca985a95d. The single build job and every step completed successfully.
- [x] Node: **697 passed, 0 failed**. The new all-42 generated faceplate/descriptor audit passed; its runner line is present in the downloaded job log.
- [x] Android/JUnit: Gradle testDebugUnitTest passed. Downloaded XML reports confirm MidiMessageDecoderTest **9/9** and MidiBatchEncoderTest **4/4**, with no failures/errors/skips.
- [x] WASM: Plaits **185,636 bytes** and Beads **196,726 bytes** built; both wrappers passed WebAssembly.compile. Beads native self-test logged all eight media/mode cases, synth output, resampling, and SELFTEST OK.
- [x] Gradle assembleDebug succeeded. Artifact eurorack-study-debug-apk ID **13863081050**, ZIP **1,675,880 bytes**, SHA-256 `d0b8b105e7c0a99cfcb46c411cb790c4d405e6302888c39d5453a9839e2fad45`. Extracted APK: **1,710,463 bytes**, SHA-256 `85a1ee69c43f3cb8f194ec192554eb3a2594ea94225abcd84b6f0bf5eeef40d9`.
- [x] APK inspection confirms the Burst DIST CV jack is present in assets/index.html, together with module_graph.js, all **42** DSP assets, and the Plaits/Beads WASM wrappers.
- [x] Supporting artifacts: wasm-log ID **13862437146** (1,380-byte ZIP, SHA-256 `ea398e0ace670f252d1c5345ec7d26ee653d3dd432748b6cd69f9ba8fd2af4b0`); Android unit-test report ID **13862092639** (9,918-byte ZIP, SHA-256 `5d364acb3e3e1849bb1873f58e5994a42330c79b7e64eac632adb31551950557`).
- [ ] No Android device installation, physical audio, MIDI reception, touch, latency or hardware behavior was tested or inferred from the APK.
- Current code/test commit: e8655db4d3f7ba68a8739f884177b99ca985a95d. main remains `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`; branch comparison at this point is **586 ahead / 0 behind**.

### Next Phase 1 objective
The STMix → Hexmix hidden stereo expansion link is now implemented and CI-tested on the legacy execution order, with a duplicate-sum guard. Its digital insertion is explicitly modeled at the pre-master-EQ sum; exact analog insertion remains unverified. Keep STMix/Hexmix outside the active scheduler until the implicit host dependency is represented in the execution plan and tested there.


## Phase 1 runtime scheduler rollout — 2026-11-12

### Implemented in code — Voltio, Atte, Mixer2 and Mixer scheduler adapters; workflow #91 passed

- Added a guarded topological execution path for racks containing only explicitly described `Voltio`, `Atte`, `Mixer2`, `Mixer`, and the internal `Audio Out` sink. It requires a valid plan covering every rack instance and verifies every cable source precedes its destination; feedback/cycles and unsupported types remain on legacy `step()`.
- Added the explicit internal `out` descriptor (audio inputs L/R), so this route no longer relies on an inferred legacy descriptor.
- The AudioWorklet receives the graph order with cable updates. It keeps a pending plan until all module-state sync messages arrive, then checks rack cardinality, unique/known IDs, eligible types, and cable order before activating.
- The ScriptProcessor fallback receives the same order through the shared engine setter, which is kept synchronized even while AudioWorklet is active. Both paths call the same `step()`; the old type-ordered processor remains the automatic fallback.
- Fixed three missing `byT` buckets (`cvThing`, `divkidMutesMk2`, `joystick`) referenced by `idxE()` and `step()`. This latent issue was not exercised by the previous static suite.
- Added deterministic engine-level tests with the real Voltio, Mixer2 and Mixer DSP helpers for Voltio → Mixer2 → Mixer → Audio Out signal flow, +5 V source output, main/inverted outputs, reverse-order rejection, legacy fallback, and the three previously missing runtime buckets.
- Extended the generated faceplate/descriptor audit from 42 DSP descriptors to 43 descriptors including the internal Audio Out sink.

### Local validation performed before commit

- V8 compilation of every inline HTML script and the updated/new test sources: passed.
- Engine smoke with actual Voltio, Mixer2 and Mixer DSP helpers: topological output and legacy fallback both produced L/R = `tanh(1)` from Voltio's +5 V setting; Mixer main/inverted outputs were +5 V/−5 V; reverse cable order was rejected.
- Runtime inventory smoke: CV Thing, DivKid Mutes and Joystick buckets all initialized and indexed.
- Generated template audit: 43 descriptors, zero jack ID/direction mismatches.
- Workflow [#87 / 43236747447](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43236747447) executed the full Node suite: 699/701 passed. The two failures were stale assertions in `index_scripts_syntax.test.cjs` (42 vs 43 descriptors, and the old cable-only post payload); the new engine-level scheduler/fallback tests passed. The test expectations were corrected in commit `383821b8af07b42bb83aa3953334f35f2f724973`; workflow #88 then passed. Emscripten, JUnit and Gradle/APK steps were skipped in #87; no artifact was produced by that run.
- Android/device validation: not claimed.

### Remaining

- Extend the active adapter set only after each module's dependencies, hidden-host links, normaling, state/reset semantics and per-sample behavior are verified.
- Add parameter-event queue and versioned state/reset/bypass contracts before broader real-time migration.
- Keep all other module types on legacy `step()` until their adapters are proven. STMix standalone DSP and its Hexmix rear-link host path now run in legacy `step()` and have integration coverage; keep both outside the scheduler until the implicit host dependency is encoded as an execution edge.


### Workflow #87 — test expectation corrections

- [x] Workflow [#87 / 43236747447](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43236747447) ran on code commit `e1f87f09efde0a237d709493189cbeadd999ad61`.
- [x] Node runner executed **701 tests: 699 passed, 2 failed**. The failures were test expectations only: `index_scripts_syntax.test.cjs` still expected 42 explicit descriptors after adding the internal Audio Out descriptor (actual 43), and still expected the previous cable-only `postCab` message instead of the new order-bearing payload.
- [x] The new topological Atte → Mixer2 → Audio Out runtime test passed, as did the legacy fallback and bucket inventory tests.
- [x] Emscripten, Android/JUnit, Gradle APK assembly and artifact upload were skipped because the Node gate failed. The final verifier's missing-WASM-wrapper message is downstream of those skipped build steps; workflow #87 produced no APK or WASM artifact.
- [x] Full CI validation completed successfully in workflow #88. No Android/device validation is claimed.


## Workflow #88 — correction verified in CI

- [x] Workflow [#88 / 43237185052](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43237185052) passed on correction commit `383821b8af07b42bb83aa3953334f35f2f724973`.
- [x] Node regression suite: **701/701 passed**.
- [x] Android JUnit reports inspected from `android-unit-test-report`: **13/13 passed** (9 MIDI decoder + 4 MIDI batch encoder; zero failures/errors/skips).
- [x] Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. The WASM log artifact reports successful builds, WebAssembly compilation and Beads native self-test.
- [x] Gradle `assembleDebug`: success.
- [x] Artifacts inspected:
  - `eurorack-study-debug-apk`, ID `13952457793`, archive SHA-256 `778e351f6e1fbbdbedc83d8a7a41e05e34dbb52d9a0d4a0a1d11c5d63e9c8b34`; contained APK SHA-256 `4845b5d7f2e62d2fba1a2fbd6ed1f6a9a6d7f7e8cdd6a22c2b53e9d59bfe88a1`.
  - `android-unit-test-report`, ID `13953466772`; inspected XML totals 13 tests, all passing.
  - `wasm-log`, ID `13952832187`; inspected; both WASM payloads and native Beads self-test succeeded.
- [x] APK contents inspected: packaged `index.html` includes the guarded scheduler and missing-bucket fixes; Atte, Mixer and Mixer2 DSP assets and both Plaits/Beads WASM wrappers are present.
- CI evidence only. No installation, audio playback, MIDI routing or physical Android validation is claimed.
- Workflow #87's two stale test expectations were corrected; #88 passed without a source/DSP regression.

## Mixer adapter extension — code commit `c9a5a69ca0e6cd7cb16f4da30934f4a17c3e5590`

- Implemented: added Mixer to the guarded scheduler whitelist and topological DSP dispatch.
- Runtime path: Atte → Mixer2 → Mixer → Audio Out.
- Deterministic coverage: Mixer main output +5 V, inverted output −5 V, stereo output after master stage, rejection of reverse cable order, and legacy fallback when an unsupported module is present.
- Local V8 checks passed with the actual Atte, Mixer2 and Mixer DSP helpers; updated inline scripts and test sources compile.
- GitHub Actions workflow #89 completed successfully on this code commit; APK contents were inspected for the active Mixer scheduler path. CI evidence only, not an Android device test.
- AudioWorklet and ScriptProcessor continue to use the same `step()` and synchronized execution-order setter.
- STMix standalone DSP and selectable Hexmix rear-link integration are implemented and CI-tested. The exact analog insertion node remains unverified, and the scheduler edge remains pending; both modules stay on legacy `step()`.


## Workflow #89 — Mixer scheduler validated

- [x] Workflow [#89 / 43238761546](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43238761546) passed on code commit `c9a5a69ca0e6cd7cb16f4da30934f4a17c3e5590`.
- [x] Node suite: **701/701 passed**.
- [x] Android JUnit XML inspected: **13/13 passed** (9 MIDI decoder, 4 MIDI batch encoder; zero failures/errors/skips).
- [x] Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**; WebAssembly compile checks passed; Beads native self-test reported `SELFTEST OK`.
- [x] Gradle `assembleDebug`: success.
- [x] Artifacts inspected:
  - `eurorack-study-debug-apk`, ID `13953643001`, archive SHA-256 `b7f70b0896d7827cc0c87e6275ef5e9d7658fff7f2557615b510444181154b96`; contained APK SHA-256 `7ed3d25872c3bad0a042b765538ccfeb52efb7a95d0b52815124f18b032fb92d`.
  - `android-unit-test-report`, ID `13953313230`, SHA-256 `9d03297fadc9847aae2521fba503e7521bcbf76c4ada0c1be11e93f96878e1fc`; XML totals 13 passing tests.
  - `wasm-log`, ID `13952603606`, SHA-256 `cb2a713f3aa890ef4dc6c30f53cf8a7c8e69f54eace914b8f5b69738b5820446`; inspected build log.
- [x] APK contents inspected: `index.html` contains the Atte/Mixer2/Mixer/Audio Out scheduler whitelist and `mixerF` dispatch; `mixer_dsp.js` is packaged.
- CI evidence only. No installation, live audio, MIDI routing or physical Android validation is claimed.

## STMix dependency audit — 2026-11-12

- Standalone DSP implementation is present: four stereo inputs with per-channel gain, right-input-to-left normaling, unity AUX stereo input, stereo outputs and level meters. Existing DSP and graph tests cover these behaviors and are included in the passing #89 Node suite.
- Official STMix manual: `https://befaco.org/docs/StMix/StMix_User_Manual.pdf`. It states the six-pin ribbon connection sends STMix output into the Hexmix master section; AUX is unattenuated and feeds the output directly.
- Gap found: current `stmixF` computes standalone stereo outputs, but `hexmixF` only consumes the Hexmix VCA expander's six `hostInputs`; there is no STMix-to-Hexmix stereo host path. Therefore the module is not yet complete as a Hexmix expansion.
- Decision: do not add STMix to the active scheduler whitelist yet. Its standalone DSP remains on the legacy path; the hidden Hexmix host dependency must be implemented and tested first.
- Official manuals confirm that STMix signal enters the Hexmix master section but do not specify the exact analog insertion node. Moldgf now uses a clearly labeled digital model assumption: master-sum injection before master EQ/level. This is tested as software behavior only and is not claimed to reproduce the analog PCB insertion point.


## Voltio scheduler adapter — workflow #91 validated

- [x] Code commit `ab9806de7b905b282860150e0fcc03204f33635f` added Voltio to the guarded scheduler whitelist and topological DSP dispatch.
- [x] Runtime route: Voltio (+5 V) → Mixer2 → Mixer → Audio Out; local V8 smoke verified the 5 V source, +5 V/−5 V Mixer outputs, stereo master output, reverse-order rejection and legacy fallback.
- [x] Workflow [#90 / 43241442280](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43241442280) executed 701 Node tests: **700 passed, 1 failed**. The only failure was a stale static assertion expecting an `else if` for Voltio; the implementation correctly uses the first `if` branch. The engine-level Voltio test passed.
- [x] Emscripten, JUnit, Gradle APK and artifact upload were skipped after the Node gate; no APK/WASM artifact was produced by #90.
- [x] The stale assertion was corrected in commit `d5549beef3cb58a4fa2132239fd7531344a929e1`; workflow #91 passed. No Android/device validation is claimed.


## Workflow #91 — Voltio scheduler validated

- [x] Workflow [#91 / 43242059403](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43242059403) passed on correction commit `d5549beef3cb58a4fa2132239fd7531344a929e1`.
- [x] Node regression suite: **701/701 passed**.
- [x] Android JUnit XML inspected: **13/13 passed** (9 MIDI decoder + 4 MIDI batch encoder; zero failures/errors/skips).
- [x] Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**; WebAssembly compile checks passed; Beads native self-test reported `SELFTEST OK`.
- [x] Gradle `assembleDebug`: success.
- [x] Artifacts inspected:
  - `eurorack-study-debug-apk`, ID `13955017283`, archive SHA-256 `24281bddea54dc307b96aa4a77a6c7cb4b57ac0409dc2c89dafa31be38ad37c0`; contained APK SHA-256 `3e5a9ebd43cbc82e3fe7d24d513aa52591ce00c0aa4c55d7489d8b1e4bfe0a00`.
  - `android-unit-test-report`, ID `13955271671`, SHA-256 `08bc4118424d5fc4b8e47335e7a32d1f5c2c9b625d6f28fdc29f1336846c49d4`; XML totals 13 passing tests.
  - `wasm-log`, ID `13956000741`, SHA-256 `9f1b8607b30d4eed92db957fd59aa22ef1b23870b1f1e693ba415235040b87eb`; inspected build log.
- [x] APK contents inspected: packaged `index.html` contains the Voltio/Atte/Mixer2/Mixer/Audio Out whitelist and Voltio DSP dispatch; `voltio_dsp.js`, `mixer2_dsp.js`, `mixer_dsp.js` and both Plaits/Beads WASM wrappers are present.
- CI evidence only. No installation, live audio, MIDI routing or physical Android validation is claimed.

## Voltio adapter runtime contract

- Voltio is a stateless CV source/precision-adder adapter in the scheduler. Its output is computed before downstream modules according to the typed graph order.
- Deterministic route tested in the engine harness: Voltio set to +5 V → Mixer2 → Mixer → Audio Out; output is `tanh(1)` on both channels, Mixer main/inverted remain +5 V/−5 V.
- Unsupported rack types still disable topological mode and use the legacy `step()`; no broader scheduler activation is implied.


## STMix → Hexmix internal expansion integration — 2026-11-13

### Implemented in code and validated in CI

- Added a persisted `STMIX REAR LINK` selector to Hexmix. It selects one STMix instance and routes its stereo sum into the Hexmix DSP master section; the STMix front-panel OUT L/R remain independently available.
- The engine's existing legacy `step()` order processes STMix before Hexmix, so the host signal is available in the same sample step. The active topological scheduler is deliberately unchanged and still excludes both STMix and Hexmix.
- Added a duplicate-sum guard: if either STMix front-panel output is explicitly patched into one of the selected Hexmix's six channel inputs, the internal rear-link injection is suppressed for that host. The patch path remains active.
- Added scalar `expansionLeft` / `expansionRight` inputs to `hexmix_dsp.js`. They are summed before the Hexmix master EQ and master-level/output-level stage.
- The official STMix manual says its six-pin connector places the STMix output into the Hexmix master section; the official Hexmix manual confirms a dedicated STMix expansion port. Neither document publishes the exact analog insertion node. Moldgf therefore documents a deliberate digital model assumption: inject at the master-sum input, before master EQ and level. This is not a claim of analog circuit equivalence.
- Added deterministic DSP tests for stereo expansion, master-level scaling, master-EQ processing, non-finite input handling, host selection, standalone mode and suppression of duplicate front-panel patch summing.
- No upstream VCV/Befaco implementation code or proprietary panel artwork was copied for this integration.

### CI and remaining limits

- **Validated in CI:** workflow #94, run ID `43432820162`, commit `0d2f42fafdbe22ab809334c0ac4cc41179424171`, conclusion `success`: [GitHub Actions #94](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43432820162).
- Node suite: **707 tests, 707 passed, 0 failed**.
- Android JUnit: **13 tests, 13 passed, 0 failures/errors** (MidiMessageDecoderTest 9/9; MidiBatchEncoderTest 4/4).
- Plaits WASM: **185,636 bytes**, wrapper verified with `WebAssembly.compile`; Beads WASM: **196,726 bytes**, native self-test reported `SELFTEST OK`, wrapper verified with `WebAssembly.compile`.
- Gradle `testDebugUnitTest` and `assembleDebug`: success.
- CI artifact `eurorack-study-debug-apk`: ID `14040178939`, 1,677,524-byte ZIP, SHA-256 `24a4cdbdeda8d1219d95c81ef85ea5911c051d32e56b21c28ba450f256370572`; embedded APK SHA-256 `83afda88f01a0c94eea498598a9b27695b0dbb6d942fea50f1d76069055ca236`. Inspected APK contents confirm the new Hexmix selector and `hexmix_dsp.js` expansion input, plus all 42 DSP assets and both WASM wrappers. This is CI packaging evidence only, not an Android-device test.
- JUnit report artifact ID `14040253766`, 9,893 bytes, SHA-256 `6f54077a95a3b61c7aba68768b7b66695bb9c22e695d76cc38c6d59c386466d8`; WASM log artifact ID `14038924453`, 1,381 bytes, SHA-256 `052dac41f4f085e171399dca3888e185f067319fc91fb4833f7e9cd98f273f6c`.
- Regression fixes: run #92 failed three new integration assertions because the test helper reused one fixture signal for both stereo channels; commit `2af48d39c3aef5032dc568e741c872db53a8bc4d` gave each input a distinct source. Run #93 then exposed two cross-realm array assertions; commit `0d2f42fafdbe22ab809334c0ac4cc41179424171` normalizes VM arrays before comparison. Run #94 passed all 707 Node tests.
- Implementation commit: `fac51a41b28ed71a508fbd1532ec22e3e27dcf7c`; test corrections: `2af48d39c3aef5032dc568e741c872db53a8bc4d`, `0d2f42fafdbe22ab809334c0ac4cc41179424171`. Roadmap validation record added in the following docs-only commit.
- Android APK/device validation: not claimed.
- Exact analog insertion point and electrical level calibration: not published in the reviewed official manuals and remain unverified.
- Keep STMix/Hexmix outside the active topological scheduler until the internal expansion dependency is represented in the execution plan and tested there.


### Workflow #94 validation record (2026-11-13)

- Implementation commit: `fac51a41b28ed71a508fbd1532ec22e3e27dcf7c`; test-harness correction: `2af48d39c3aef5032dc568e741c872db53a8bc4d`; final cross-realm assertion fix: `0d2f42fafdbe22ab809334c0ac4cc41179424171`.
- Workflow #94: `43432820162`, success, [Actions run](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43432820162). Node 707/707; JUnit 13/13; Plaits 185,636-byte WASM; Beads 196,726-byte WASM and native `SELFTEST OK`; Gradle tests and debug APK assembly succeeded.
- Artifacts: APK ZIP `14040178939` (SHA-256 `24a4cdbdeda8d1219d95c81ef85ea5911c051d32e56b21c28ba450f256370572`); JUnit report `14040253766` (SHA-256 `6f54077a95a3b61c7aba68768b7b66695bb9c22e695d76cc38c6d59c386466d8`); WASM log `14038924453` (SHA-256 `052dac41f4f085e171399dca3888e185f067319fc91fb4833f7e9cd98f273f6c`). Embedded APK SHA-256: `83afda88f01a0c94eea498598a9b27695b0dbb6d942fea50f1d76069055ca236`.
- APK inspection confirmed the `STMIX REAR LINK` selector, the `expansionLeft` DSP path, all 42 DSP assets and the Plaits/Beads WASM wrappers. No Android-device validation is inferred.
- The #92 and #93 test-only failures and their corrections are recorded in the STMix integration section above.


## Phase 1 — Explicit internal host dependencies in the graph plan (2026-11-13)

### Implemented in code

- Added `resolveIndexedHostDependencies` to the typed graph library. It resolves persisted 1-based host selections into dependency edges, distinguishes invalid indices from missing host instances, validates source/target module types, rejects duplicate/self edges, and includes internal links in cycle detection and deterministic topological sorting.
- The live rack planner now declares the three rear-panel relationships already consumed by the DSP:
  - Hexmix VCA → selected Hexmix (`vcaHost`);
  - STMix → selected Hexmix (`stmixHost`);
  - selected Hexmix → Hexpander (`hexmixHost`).
- The `window.MoldgfGraphPlan()` diagnostic now reports resolved internal dependencies. Changing any of the three host selectors refreshes the graph plan immediately.
- This is graph/diagnostic integration only. It does **not** activate Hexmix VCA, STMix, Hexmix or Hexpander in the audio scheduler; these modules remain on legacy `step()` until their complete runtime adapters and state/parameter contracts are proven.

### Tests authored; CI pending

- Added graph tests for 1-based host resolution and deterministic ordering, missing selected host rejection, duplicate dependencies, and cycles combining an internal host edge with a physical cable.
- Added a runtime integration test that extracts and executes the actual graph-planner code from `index.html`, verifying all three host relationships and their processing order.
- No workflow has been triggered by this edit yet. CI status and artifacts will be recorded after the source workflow completes.
- No VCV/Befaco implementation code or proprietary panel artwork was copied or adapted.
