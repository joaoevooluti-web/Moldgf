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
- [x] Phase 0 CI evidence is complete. At the historical Phase 0 checkpoint on 2026-11-10, the branch HEAD was documentation-only commit `1cc81b378735e9c7344c49a87af90c6c2c0e2f1c`, whose parent was the CI-validated code commit above; this is not a current-HEAD claim. The baseline artifact and run #75 artifacts are CI evidence only; no installation, audio output, MIDI reception, touch behavior, or visual validation on a physical Android device is claimed.
- Workflow #75 was triggered by four consecutive code pushes (#72–#75); all four completed successfully, but future work should continue to batch related files into a single commit to avoid redundant CI runs.

**Phase 0 status: complete in automated CI; physical-device validation remains unclaimed.**

### Phase 1 — Modular engine foundation
- [x] Add a standalone module descriptor registry and typed-port/graph validation contract.
- [x] Add automated Node tests for registry validation, signal direction/types, channel compatibility, topological order, and explicit feedback-delay handling (6/6 passed in workflow 42539116720, commit c231aaa4ecb3601f1423c84dbfa0710f7e59edc4).
- [x] Integrate endpoint/port-direction validation with the existing jack/cable model. Legacy ports retain permissive signal compatibility until their true audio/CV/gate metadata is declared, preserving existing patch behavior.
- [x] Integrate the deterministic graph plan and guarded active topological scheduler. Audio order is now enabled only when every rack instance is in the verified adapter set and all physical cable edges follow the validated plan; every unsupported or invalid rack retains the legacy `step()` fallback.
- [ ] Add the parameter event queue, per-module state schema/versioning, and explicit reset/bypass contract.
- [ ] Migrate existing module types through adapters; keep Worklet and ScriptProcessor paths behaviorally aligned.

#### Phase 1 incremental milestone — graph plan and guarded scheduler

- [x] The rack now rebuilds a deterministic topological execution plan through the existing typed registry whenever modules are added/removed or cables change. Legacy module descriptors are generated only when actual jack endpoints exist.
- [x] Exposed `window.MoldgfGraphPlan()` with validity, topological order, scheduled order, execution mode and graph errors. The graph remains diagnostic for unsupported racks; eligible fully typed racks activate the guarded order in the shared audio engine.
- [x] Added runtime tests for graph-plan refresh, UI/engine allowlist parity, actual topological DSP execution, reverse-order rejection and legacy fallback. AudioWorklet and ScriptProcessor still call the same shared `step()` implementation.
- [~] Active scheduler adoption is incremental, not global. The current verified set is Voltio, Atte, Joystick, Motion MTR, Dual Atenuverter (legacy), A*B+C V4 (`abc`), current A*B+C (`axbc`), Molten Bypass, Mixer2, Mixer and the internal Audio Out sink. Remaining modules stay on legacy `step()` until their normaling, hidden dependencies, state/reset and sample-rate contracts are verified.
- Workflow [#76 / 42829050147](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42829050147) was a failed intermediate run: 690 existing tests passed and only the three new assertions failed because the test assumed the UI inline script had an `id=ui`; the page uses its final inline script instead. The selector was corrected in commit `29c7dbb408b26851b3b2a5ea7fb5418e66002013`. Emscripten, Gradle/JUnit and APK steps were skipped after the Node gate; the final verifier consequently had no generated wrappers. No existing DSP/graph regression failed.
- [x] The correction and scheduler integration passed the complete feature workflow [#77 / 42829232566](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42829232566) on commit `29c7dbb408b26851b3b2a5ea7fb5418e66002013`: 693/693 Node tests, Gradle/JUnit, Plaits/Beads WASM, `WebAssembly.compile`, `assembleDebug` and APK artifact upload all succeeded.

### Phase 2 — Utility and routing modules
- [x] Atte — four attenuator/inverter channels, cascaded input normaling, fixed +10 V first-channel normal in the hardware-style panel, individual outputs and saved control state. The DSP normal is fixed at +10 V to match the hardware; the obsolete persisted normalledVoltage selector is ignored for saved-state compatibility. The dedicated DSP tests and scheduled runtime chain passed in workflow #104.
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
- [~] Motion MTR — three channels with CV INV, CV ATT and Audio modes; all inputs normalled to +10 V; individual outputs and OUT3 sum that removes OUT1/OUT2 when patched. The allocation-free `processInto` adapter now uses caller-owned input, patch-state and output buffers, exposes deterministic reset, and is admitted to the guarded topological scheduler. Ten direct DSP tests, four graph tests and three scheduled-runtime/fallback cases pass in workflow #107. The optional break-normal-in-audio-mode setting is an app-level compatibility/safety option; Befaco's hardware documentation describes +10 V normaling on every input.
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
- Befaco Atte is implemented in the rack and audio engine: four independent attenuator/inverter channels, cascaded input normaling, hardware-faithful fixed +10 V first-channel normal in the UI, per-channel gain/polarity controls, independent outputs, live polarity LEDs, and voltage readouts. The DSP now supplies fixed +10 V normaling and ignores the obsolete saved normalledVoltage selector. Seven dedicated DSP tests and the scheduled engine integration passed in workflow [#104 / 43602193521](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43602193521); the debug APK artifact is [13641045420](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295). Workflow [42539485722](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722) also succeeded and published APK artifact [13641021006](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722). These runs validate CI packaging, not installation/audio on a physical device. The engine currently processes mono signals, so polyphonic parity remains future work.
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
- [x] Removed the user-selectable +1/+5/+10 V normal control from the front panel. The official Atte specification normalled first input is +10 V; the DSP now enforces this fixed normal and ignores the obsolete saved normalledVoltage selector, while preserving the legacy state field for compatibility.
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
- [x] Active topological execution is enabled only for a fully typed, acyclic rack whose module types are in the verified adapter set: Voltio, Atte, Joystick, Motion MTR, Dual Atenuverter, ABC, AxBC, Bypass, Mixer2 and Mixer, plus the internal Audio Out sink. Cable order is checked in the UI and engine; unsupported modules, missing instances, cycles, invalid plans or incomplete worker sync automatically use legacy `step()`.
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

### Tests authored; CI validated in workflow #99

- Added graph tests for 1-based host resolution and deterministic ordering, missing selected host rejection, duplicate dependencies, and cycles combining an internal host edge with a physical cable.
- Added a runtime integration test that extracts and executes the actual graph-planner code from `index.html`, verifying all three host relationships and their processing order.
- The implementation and test harness were validated by workflow #99 after correcting the static runtime assertions; see the run record below.
- No VCV/Befaco implementation code or proprietary panel artwork was copied or adapted.


## Workflow #95 — internal host dependency graph regression and correction (2026-11-13)

- Code under test: `396d437fcd48be12c06aeb3cd48b4745b572d4ee`, which adds Hexmix VCA → Hexmix, STMix → Hexmix, and Hexmix → Hexpander indexed rear-panel dependencies to the typed graph plan.
- Workflow #95 / run ID `43438126213` failed at the Node gate. The only Node assertion failure identified in the job log was a stale static expectation in `graph_scheduler_runtime.test.cjs`: it still required the old three-argument `validateGraph(PORT_REGISTRY,modules,cables)` call. The runtime now correctly passes the fourth `runtimeHostDependencies(modules)` argument.
- Because the Node gate failed, Emscripten, Android JUnit, Gradle APK assembly and APK upload were skipped. The final WASM verifier then failed because the wrappers had not been built in this run. Run #95 produced no APK, JUnit or WASM artifacts. This downstream verifier failure is not evidence of a new WASM regression.
- First correction commit: `21d5df75adedfafc106ae3e9b2411999a621a618`. Its attempted assertion update introduced a literal escaped newline, exposed by #96.
- The follow-up commit `7b33558943e1fb3c9be63a7e694da56a0684b224` fixed that syntax defect; #97 then exposed a stale whitespace-sensitive assertion. The complete correction sequence and final CI evidence are recorded under workflows #97–#99 below.
- The graph/runtime implementation itself was not changed by this correction. No Android-device validation is claimed.


### Workflow #96 — correction-harness syntax regression

- Workflow #96 / run ID `43439573022` failed before executing the Node tests because the first correction commit (`21d5df75adedfafc106ae3e9b2411999a621a618`) inserted a literal escaped newline token between two JavaScript statements in `graph_scheduler_runtime.test.cjs`. The job log reports `SyntaxError: Invalid or unexpected token` at that line.
- This was a test-harness syntax defect introduced by the correction, not a failure in the graph runtime. The Emscripten/WASM, Android JUnit, Gradle and APK stages were skipped; the final WASM verifier had no wrappers to inspect. No artifacts were produced by #96.
- Follow-up correction commit: `7b33558943e1fb3c9be63a7e694da56a0684b224`; replaced the literal backslash-n with a real source newline.
- Workflow #97 then exposed the remaining whitespace-sensitive assertion, and #98 exposed an extra closing parenthesis in the updated regular expression. Both are corrected in `d6b5b60cfff93d332ce92018682adc8d2ffaba9f`; workflow #99 passed the complete CI pipeline.


## Workflow #97 — host-dependency assertion still whitespace-sensitive (2026-11-13)

- Workflow #97 / run ID `43439681637` failed at the Node gate on commit `7b33558943e1fb3c9be63a7e694da56a0684b224`.
- The prior syntax correction succeeded, but the test still required a compact `function runtimeHostDependencies(modules){` shape. The production UI formats the function body over multiple lines. This was a static test assertion defect; no DSP implementation change was involved.
- Emscripten, Android JUnit, Gradle APK assembly and upload were skipped after the Node gate. No artifacts were produced. The final unconditional WASM verifier also failed because no wrappers had been generated; that downstream failure is not evidence of a WASM regression.

## Workflow #98 — assertion grouping correction (2026-11-13)

- Workflow #98 / run ID `43442659620` failed at the Node gate on commit `e13acd26d92ca831393470fc6dcb04649f734273`.
- The updated regex correctly tolerated formatting whitespace in `runtimeHostDependencies`, but the `refreshGraphPlan` assertion contained one extra closing parenthesis and therefore did not match the actual four-argument `validateGraph` call.
- Corrected in commit `d6b5b60cfff93d332ce92018682adc8d2ffaba9f`. No production DSP or graph runtime code was changed by these test-only corrections.
- Emscripten, JUnit and Gradle/APK stages were skipped in #98; no artifacts were produced. The final verifier failed only because the wrappers were absent after the Node gate stopped the pipeline.

## Workflow #99 — internal host dependency graph tests and full CI validated (2026-11-13)

- Code under test: host-dependency implementation commit `396d437fcd48be12c06aeb3cd48b4745b572d4ee`; final test-harness correction `d6b5b60cfff93d332ce92018682adc8d2ffaba9f`.
- Workflow #99 / run ID `43443262866` completed with conclusion **success** on `d6b5b60cfff93d332ce92018682adc8d2ffaba9f`.
- Node suite: **711/711 passed**, including indexed rear-panel host resolution, deterministic topological ordering, missing-host rejection, duplicate/cycle checks and runtime planner extraction.
- Android JUnit: **13/13 passed** (MidiMessageDecoderTest 9/9; MidiBatchEncoderTest 4/4; zero failures/errors/skips).
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both wrappers passed `WebAssembly.compile`; Beads native self-test reported `SELFTEST OK` for all media/mode combinations, synth output and 44.1 kHz host / 24 kHz media resampling.
- Gradle `testDebugUnitTest` and `assembleDebug`: success.
- Artifacts inspected:
  - `eurorack-study-debug-apk`, ID `14048065195`, ZIP 1,678,731 bytes, SHA-256 `539073c1f38ca57cb69d8a0dd6afb235ba7dedef24b9d3b17f8fb0527dfa0515`; embedded `app-debug.apk` 1,713,295 bytes, SHA-256 `b81d8483583ca5d44d61986cc9d81e54007d5a6bb589d4710fee94fe3f343a63`.
  - `android-unit-test-report`, ID `14047361675`, ZIP 9,909 bytes, SHA-256 `a1bf39d071ef9bae7888c29fa381313da4de30b1b4f22763d9e537d237a59053`; XML confirms 9/9 decoder and 4/4 batch-encoder tests.
  - `wasm-log`, ID `14046117117`, ZIP 1,379 bytes, SHA-256 `a0c6c64dc4056ec807f048254620d5dd8c6918e9135fc1475356a2a3bdcbadb1`; inspected build log confirms both WASM outputs and `SELFTEST OK`.
- APK contents were inspected: the updated `index.html`, `module_graph.js`, all 42 `*_dsp.js` assets and both Plaits/Beads WASM wrappers are present. This is CI packaging evidence only; no Android installation, audio, MIDI, touch or physical-device validation is claimed.
- No VCV/Befaco implementation code or proprietary panel artwork was copied in this graph integration.


## Phase 1 — allocation-conscious utility scheduler expansion (2026-11-14)

### Implemented in code

- Added caller-owned output-buffer APIs to Mixer2 and Mixer (`processInto`, `meterInto`). Their engine adapters now write into per-instance output/meter objects allocated at module creation instead of constructing input arrays, result arrays and meter objects on every sample.
- Added `processPairInto` to both A*B+C revisions (`abc` and `axbc`). The shared engine adapters pass scalar jack values and write into each module's preallocated `r.out` buffer.
- Added `MoldgfBypassDSP.processInto`; its adapter mutates the existing per-module runtime state/output object, preserving launch/button edge state and crossfade state without allocating a result object per sample. Bypass runtime state is now created explicitly in `INITR`.
- Extended the guarded topological scheduler's UI and engine allowlists to Dual Atenuverter, both A*B+C revisions, and Molten Bypass. The legacy `step()` still handles all modules when any unsupported type is present.
- Added an actual engine-harness chain test: Dual Atenuverter → A*B+C V4 → current AxBC → Bypass → Mixer2 → Mixer → Audio Out. It checks topological order, reverse-order rejection, real DSP outputs, and the final stereo master output. A second test exercises Bypass latch state across successive sample calls.
- The AudioWorklet/ScriptProcessor parity test now asserts that these adapters are dispatched inside the one shared engine `step()`.

### Test status and CI history

- **Implemented:** code commits `bcbcbbe3d16de88003be942a1e4a57b1dff0082d` (reusable DSP APIs), `019370a680c4074d141af19beda80f7d04e350a3` (engine adapters, scheduler allowlists and runtime harness), and `bbd7fa37563c4aa11eff5e7d78c90f7d087b166c` (DSP buffer tests).
- **Tested in CI, but not yet fully passing:** workflow [#100 / 43600762843](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43600762843) ran 718 Node tests: 715 passed, 3 failed due to incorrect new test expectations (AxBC MIX test left A2 unpatched, Bypass exponential slew asserted exact 1, and the convergence test used too few samples). No WASM/JUnit/Gradle/APK stages ran because the Node gate stopped the job.
- Correction commit `80c2d46b5dc74223dc9a1ac2906e7e68d1240c22` fixed those three expectations. Workflow [#101 / 43600897378](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43600897378) then reached 717/718 passing; the remaining failure was another exact-equality assertion on the asymptotic Bypass send value. No WASM/JUnit/Gradle/APK stages ran.
- Correction commit `68c38e103120bd3d87709b6861a5ea2f98876fe8` fixed the exact-equality checks on smoothed Bypass values. Workflow [#102 / 43600988774](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43600988774) still failed 717/718 because the wet-return output tolerance was slightly narrower than the exponential crossfade's residual. No WASM/JUnit/Gradle/APK stages ran.
- Final test-only correction commit `d7280f98b278346769e050ef11f0b4e61b324b81` widened only the Bypass output comparison tolerance to (10^{-6}). Workflow [#103 / 43601171376](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43601171376) completed with **success**.
- No Android-device installation, physical audio, MIDI, touch or visual validation is claimed.

### Remaining Phase 1 work

- Add a bounded parameter-event queue and explicit versioned state/reset/bypass contract before migrating modules with more complex state or host dependencies.
- Add scheduler-side validation for internal host edges (not only physical cable order) before admitting STMix/Hexmix/Hexmix VCA/Hexpander.
- Continue the next adapters only after sample-rate, normaling, output-patch behavior and no-allocation contracts are covered by deterministic runtime tests.


### Workflow #103 — utility scheduler expansion validated (2026-11-14)

- [x] Workflow [#103 / 43601171376](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43601171376) completed with conclusion **success** on code commit `d7280f98b278346769e050ef11f0b4e61b324b81`.
- [x] Node suite: **718/718 passed**, including reusable DSP output/meter buffer tests, the topological Dual Atenuverter → ABC → AxBC → Bypass → Mixer2 → Mixer → Audio Out runtime chain, Bypass latch/crossfade state persistence, scheduler reverse-order rejection, and legacy fallback.
- [x] Android/JUnit: **13/13 passed**. Downloaded XML report artifact and inspected both suites: `MidiMessageDecoderTest` 9/9 and `MidiBatchEncoderTest` 4/4, zero failures/errors/skips.
- [x] Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed `WebAssembly.compile`. Downloaded and inspected the WASM log: Beads native self-test reported `SELFTEST OK` for all eight media/mode combinations, synth output and 44.1 kHz host / 24 kHz media resampling.
- [x] Gradle `testDebugUnitTest` and `assembleDebug`: success.
- [x] Artifacts:
  - `eurorack-study-debug-apk`, ID **14116710738**, ZIP **1,679,441 bytes**, SHA-256 `7de7aa1f3c13e6464904bf98be850e954bc8bc4000830e1e3e0729dc857c3c7a`; embedded `app-debug.apk` **1,713,835 bytes**, SHA-256 `bf549b9f2a6226d68f2e9749596b06d2bf6383f7297a6835b466a69134e1bbde`.
  - `android-unit-test-report`, ID **14116815293**, ZIP **9,914 bytes**, SHA-256 `53534a6550211be88f3a7693f1e1ed847587275b2c78ed6e00956df4ff3d0f62`.
  - `wasm-log`, ID **14115874829**, ZIP **1,379 bytes**, SHA-256 `1d121ceeb14c635f41ec30c431e3b0a4894b408158426f1be4da8591bc29a2ba`.
- [x] Downloaded APK archive inspected: contains `assets/index.html`, `assets/module_graph.js`, **42** DSP assets, Plaits/Beads wrappers, new DualAt/ABC/AxBC/Bypass scheduler dispatch and `processInto` paths for Mixer2, Mixer and Bypass.
- Code commits in this stage: `bcbcbbe3d16de88003be942a1e4a57b1dff0082d`, `019370a680c4074d141af19beda80f7d04e350a3`, `bbd7fa37563c4aa11eff5e7d78c90f7d087b166c`, `80c2d46b5dc74223dc9a1ac2906e7e68d1240c22`, `68c38e103120bd3d87709b6861a5ea2f98876fe8`, and final correction `d7280f98b278346769e050ef11f0b4e61b324b81`. The documentation update that preceded the final test correction is `0b528773b6b7ec85e077dc1b6ea295319c5f07d5`.
- At code commit `d7280f98`, branch comparison was **616 ahead / 0 behind** with merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`. No merge, force-push or write to `main`.
- CI evidence only: no APK installation, physical audio output, MIDI reception, touch, screen or Android-device validation is claimed.

**Phase 1 status:** guarded topological DSP execution now covers the ten listed utility/mixer/controller module types plus Audio Out. The other Befaco modules remain on legacy `step()` until their dependencies, state/reset behavior and sample-rate contracts are verified. The 34-module DSP/graph inventory remains broader than the active scheduler set; no claim of full 34-module hardware parity is made.


## Workflow #104 — Atte fixed normaling and allocation-conscious scheduled execution (2026-11-14)

### Implemented in code

- Code commit: `149d39ce0e9de7f513c579274b24d7516c0574c1` on `feature/befaco-modules`.
- Corrected Atte's first input normal to a fixed **+10 V**, matching Befaco's official user manual and product specification: https://www.befaco.org/atte/ and https://www.befaco.org/docs/ATTE/ATTE_User_Manual.pdf.
- Kept the legacy `normalledVoltage` state field when deserializing/saving old patches, but the DSP no longer reads it. Historical values 0/+1 V or 1/+5 V cannot change the hardware normal; the signal is always +10 V when IN A is unpatched.
- Added `MoldgfAtteDSP.processInto`, which accepts four scalar input samples and writes all four channel outputs into the caller-owned buffer. Each unpatched channel inherits the preceding **input** (not preceding output), while a patched input overrides the cascade.
- Replaced the Atte engine adapter's per-sample temporary channel-name/output arrays with the preallocated `m.r.out` buffer and direct output-jack writes. The adapter remains on the guarded topological scheduler and preserves the legacy `step()` fallback for unsupported racks.
- No Befaco firmware, VCV source or proprietary panel artwork was copied or adapted in this change.

### Test evidence

- `atte_dsp.test.cjs`: **7 deterministic tests**, including fixed +10 V normaling, patched-input override, inverted/attenuated output, caller-buffer identity, cascade behavior and undersized-buffer rejection.
- `scheduler_execution_runtime.test.cjs`: actual engine-harness chain `Voltio → Atte → Mixer → Audio Out`; verifies the 3.5 V patched B input, A/B/C/D outputs `[5, -3.5, 3.5, 3.5]`, stable caller-owned output buffer and final stereo master level.
- `graph_scheduler_runtime.test.cjs`: asserts the Atte scheduler adapter uses `processInto`.
- Workflow [#104 / run 43602193521](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43602193521) completed with conclusion **success** on code commit `149d39ce0e9de7f513c579274b24d7516c0574c1`.
- Node: **721/721 passed**, 0 failures.
- Android JUnit: **13/13 passed**, 0 failures/errors/skips. Inspected XML report: `MidiMessageDecoderTest` 9/9 and `MidiBatchEncoderTest` 4/4.
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed `WebAssembly.compile`; Beads native self-test reported `SELFTEST OK` for all eight media/mode combinations, synth output and host/media resampling.
- Gradle `testDebugUnitTest` and `assembleDebug`: success. The APK artifact was uploaded and its contents inspected; it contains the updated Atte adapter and DSP asset, `module_graph.js`, both WASM wrappers and **42** DSP assets.
- Artifacts:
  - `wasm-log`, ID **14116956669**, ZIP 1,381 bytes, SHA-256 `a029731af582714398a1123127b790a46473d306f5af589febdd8640ab9a4031`.
  - `android-unit-test-report`, ID **14116907052**, ZIP 9,908 bytes, SHA-256 `8d5e95fd635e62791aa4852dd8dd506d236ee0b0ddfb432bc1853669a752b6c9`.
  - `eurorack-study-debug-apk`, ID **14116837180**, ZIP 1,679,516 bytes, SHA-256 `58d68dcca8f99c1a9955ea98f41aabedef9386cae42d3a78ce119b9a821fa610`; embedded `app-debug.apk` 1,713,959 bytes, SHA-256 `08018fc533b945b63d6494bbc47e209d0f165263ce025145372ade85a98c416a`.
- The Emscripten log contains one non-fatal `PAGE_SIZE` macro-redefinition warning in Plaits; both WASM builds and the final payload verifier succeeded.
- CI evidence only: no APK installation, physical audio, MIDI, touch, visual or Android-device validation is claimed.

### Phase 1 status after #104

- **Implemented:** fixed Atte hardware normaling; allocation-conscious Atte runtime adapter; scheduled Voltio → Atte → Mixer → Audio Out path.
- **Tested:** 721 Node tests and 13 Android JUnit tests.
- **Validated in CI:** workflow #104; WASM builds/verifier; Gradle unit tests and APK assembly; artifact upload and package-content inspection.
- **Pending:** expand the active scheduler to further modules only after their parameter/state/reset, hidden-host dependency, normaling, sample-rate and no-allocation contracts are tested. The 34-module inventory is not evidence that all 34 run through the active scheduler or achieve hardware-level parity.

### Repository protection

- At code commit `149d39ce0e9de7f513c579274b24d7516c0574c1`, compare `main...feature/befaco-modules` reported **618 ahead / 0 behind**, with merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified. No merge or force-push was performed.


## Workflow #105 — Joystick scheduler adapter and caller-owned result buffer (2026-11-14)

### Implemented in code

- Code commit: `cb85781f7cb7b6d1da4921d7b36bb4cca8c31044` on `feature/befaco-modules`.
- Added `MoldgfJoystickDSP.processInto(params, xIn, yIn, result)`. It writes X/Y CV, independent 0/10 V gate outputs, mode and peak into the existing result object. The existing `process(params, inputs, state)` API remains as a compatibility wrapper.
- Reworked `joystickF` to pass scalar jack samples and `m.r.result` directly, removing the per-sample temporary `{xIn, yIn}` object.
- Added Joystick to both UI and engine scheduler allowlists and to the topological dispatcher. Its graph contract is already typed: two CV inputs, two CV outputs and two gate outputs. Unsupported module types still force the legacy `step()` path.
- Added a deterministic scheduled chain `Voltio → Joystick → Atte → Mixer → Audio Out`. It verifies the 3.5 V source, attenuverter-mode X output (−1.75 V), independent Y/gate outputs, Atte output (−0.875 V), final stereo master level and result-object identity across processing.
- Added two direct DSP tests for `processInto` output reuse, manual/CV modes, independent gates and invalid output handling. The existing stateful `process` API and legacy engine bucket dispatch remain covered.
- No firmware/VCV implementation source or proprietary panel artwork was copied.

### Test and CI evidence

- Workflow [#105 / run 43602659981](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43602659981) completed with conclusion **success** on code commit `cb85781f7cb7b6d1da4921d7b36bb4cca8c31044`.
- Node suite: **724/724 passed**, 0 failures. The actual runtime-harness test `topological Voltio -> Joystick -> Atte -> Mixer -> Audio Out preserves CV and gate outputs` passed.
- Android JUnit: **13/13 passed**, 0 failures/errors/skips. Inspected XML report: `MidiMessageDecoderTest` 9/9 and `MidiBatchEncoderTest` 4/4.
- Plaits WASM: **185,641 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed `WebAssembly.compile`; Beads native self-test reported `SELFTEST OK` for all eight media/mode combinations, synth output and host/media resampling.
- Gradle `testDebugUnitTest` and `assembleDebug`: success. APK artifact uploaded and inspected; it contains the updated `joystickF` adapter, `joystick_dsp.js`, Atte DSP, `module_graph.js`, both Plaits/Beads wrappers and **42** DSP assets.
- Artifacts:
  - `wasm-log`, ID **14116613603**, ZIP 1,382 bytes, SHA-256 `d54594a476f72d8913fcd647c06643056a179f0e49e548e32e57d0c51f37576d`.
  - `android-unit-test-report`, ID **14116044973**, ZIP 9,912 bytes, SHA-256 `3bab1f08c73f8828c38dc819ca597b0225f35b323f2bec905269f54847b1d8c5`.
  - `eurorack-study-debug-apk`, ID **14116264836**, ZIP 1,679,944 bytes, SHA-256 `e13cd0dd04d41f39b9e5a812401d78ab166cfaa50350284b903e8bc8701a9c0a`; embedded `app-debug.apk` 1,714,347 bytes, SHA-256 `fa3014a806ade827274d7d2187f78ad78971b6df02d0c892b537e709bee94ef1`.
- The Plaits build log retains the non-fatal `PAGE_SIZE` macro-redefinition warning; the WASM build and payload checks passed.
- CI evidence only: no APK installation, physical CV/audio, gate voltage, MIDI, touch, visual or Android-device validation is claimed.

### Phase 1 status after #105

- **Implemented:** Atte and Joystick caller-owned runtime buffers; Joystick's guarded topological adapter and mixed CV/gate routing.
- **Tested:** 724 Node tests and 13 Android JUnit tests.
- **Validated in CI:** workflow #105; Plaits/Beads WASM build and verifier; Beads native self-test; Gradle unit tests and APK assembly; artifact upload and APK content inspection.
- **Pending:** parameter-event queue; explicit versioned state/reset/bypass contracts; sample-rate and hidden-host dependency audits before admitting additional modules; full 34-module hardware parity and physical validation.

### Repository protection

- At code commit `cb85781f7cb7b6d1da4921d7b36bb4cca8c31044`, compare `main...feature/befaco-modules` reported **620 ahead / 0 behind**, with merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified. No merge or force-push was performed.


## Workflow #107 — Motion MTR allocation-free scheduler adapter (2026-11-15)

### Implemented in code

- DSP/engine commit: `5aed3d0dc3688818beede12f22be386eeefead91`.
- Test-fixture correction commit: `530e3b09c7c8cdd3cd155c89b550ece17f153727`.
- Added `MoldgfMotionMTRDSP.createState()`, `processInto()` and `reset()`. The runtime state owns a reusable three-input array, two output-patched flags and a three-value Float64 output buffer. The real-time adapter no longer constructs input/output arrays per sample; the old `process()` array-returning API remains as a compatibility wrapper.
- Implemented the documented three modes: CV inversion, CV attenuation and audio gain. Inputs 1–3 normalize to +10 V when unpatched; the existing optional break-normal-in-audio-mode behavior is preserved as an app-level setting. OUT3 sums channels 1 and 2 only while OUT1 and OUT2 are unpatched, then adds channel 3.
- Added Motion MTR to the engine allowlist, UI allowlist and topological dispatcher. Its graph input accepts audio and CV sources; its output routing is exercised into an audio mixer/sink. Unsupported racks still use the unchanged legacy `step()` path.
- Added deterministic DSP tests for mode polarity, gain, +10 V normaling, optional audio-mode normal break, OUT3 sum/removal, buffer identity/reuse, parameter/input boundaries, finite outputs and reset.
- Added graph tests for audio/CV input compatibility and OUT3 routing, plus actual engine-harness tests for the Voltio → Motion MTR → Mixer → Audio Out chain, patched OUT1/OUT2 removal from OUT3, and legacy fallback when an unsupported module is present.
- Official behavior references: https://www.befaco.org/motion_mtr/ and https://www.befaco.org/docs/Motion_MTR/mmm-manual.pdf. No Befaco firmware/VCV implementation source, logo or proprietary faceplate artwork was copied.

### Intermediate failure and correction

- Workflow [#106 / run 43719136010](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43719136010) was a failed test-only intermediate run: 730/732 Node tests passed. The two failures were test-fixture mistakes, not existing DSP regressions: the new graph test called a registry object as a function, and the boundary test forgot that an unpatched OUT2 is correctly included in OUT3's sum.
- Corrected both expectations in `530e3b09c7c8cdd3cd155c89b550ece17f153727`. No Gradle, WASM or APK gate ran in #106 because the Node test gate stopped the workflow.

### Test and CI evidence

- Workflow [#107 / run 43719206896](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43719206896) completed with conclusion **success** on commit `530e3b09c7c8cdd3cd155c89b550ece17f153727`.
- Node suite: **732/732 passed**, 0 failures. This includes all Motion MTR DSP, graph, scheduled-runtime and legacy-fallback cases.
- Android JUnit: **13/13 passed**, 0 failures/errors/skips. The downloaded XML report confirms `MidiMessageDecoderTest` 9/9 and `MidiBatchEncoderTest` 4/4.
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed the workflow's `WebAssembly.compile` verifier. Beads native self-test reported `SELFTEST OK` across its media/mode, synth and resampling checks.
- Gradle `testDebugUnitTest` and `assembleDebug`: success. The final WASM payload verification step also completed successfully.
- Artifact records:
  - `wasm-log`, ID **14163353882**, ZIP 1,380 bytes, SHA-256 `2f0cb3ca9e1748a8fdf797d3bbbe12dfa2dc6cf7bc94b17d68375a564e3bbb5b`.
  - `android-unit-test-report`, ID **14163956103**, ZIP 9,880 bytes, SHA-256 `6cc2d0014d2dbda2c2ba96ad9a16f5065e2a5f3ccc79fb856d329b7e5dbe97c0`.
  - `eurorack-study-debug-apk`, ID **14163891471**, ZIP 1,680,039 bytes, SHA-256 `35a1b194c4a622285674a467e0ef06eb42cc395f8132d70b7213f081b57495b1`; embedded `app-debug.apk` 1,714,591 bytes, SHA-256 `3c7ed8ce08a588d61c95e301665f3d5fe21f7905e397436566b7c7bfa3d172ef`.
- Inspected the APK ZIP contents: `assets/index.html` (335,551 bytes), `assets/motionmtr_dsp.js` (2,900 bytes), `assets/module_graph.js` (12,560 bytes), Plaits/Beads wrappers and **42 DSP assets** are present.
- The Plaits log retains a non-fatal Emscripten `PAGE_SIZE` macro-redefinition warning. Node also emits upstream `punycode` and `url.parse()` deprecation warnings; neither failed the workflow.
- CI evidence only: no APK installation, hardware CV voltage, audio output, MIDI reception, touch, visual or Android-device validation is claimed.

### Phase 1 status after #107

- **Implemented:** Motion MTR caller-owned DSP buffers, deterministic reset, audio/CV processing modes, +10 V normaling, OUT3 patch-aware summing and guarded topological adapter.
- **Tested:** 732 Node tests and 13 Android JUnit tests; the Motion MTR-specific scheduled chain and unsupported-rack fallback both passed.
- **Validated in CI:** workflow #107; Plaits/Beads WASM builds and payload compilation; Beads native self-test; Gradle unit tests and APK assembly; artifact upload and APK content inspection.
- **Pending:** broaden the scheduler only after each module's normaling, sample-rate, reset/state, hidden-host and no-allocation contracts are audited. Dynamic audio/CV output typing remains a graph-contract limitation to revisit; the current Motion MTR descriptor declares its outputs as audio for compatibility. Parameter-event queue, versioned state schema and explicit global reset/bypass contracts remain pending. Full 34-module hardware parity and physical validation are not claimed.

### Repository protection

- At code commit `530e3b09c7c8cdd3cd155c89b550ece17f153727`, `main...feature/befaco-modules` was **623 commits ahead / 0 behind**, with merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified. No merge or force-push was performed.


## Workflow #108 — Slew Limiter allocation-free topological adapter (2026-11-16)

### Implemented in code

- Code commit: `a3a36d181dfb2f8f6d47d53b33e4cc31f09e4f7f` on `feature/befaco-modules`.
- Added `MoldgfSlewLimiterDSP.createState()`, `reset()` and `processInto()`. The real-time method mutates the module-owned state and returns a numeric sample; it does not create a result object or array per sample. The previous `process()` result-record API remains as a compatibility wrapper.
- The host supplies `1 / sr` for every sample. The state has no cached sample-rate coefficient, so changing the engine sample rate changes the integration step immediately without reallocating the module state.
- Replaced the legacy `{out:0}` state initializer with `createState()`; changed `slewlimiterF` to call `processInto()`.
- Added Slew Limiter to both engine-side and UI-side scheduler allowlists and to `processTopologicalRack()`. Its existing typed graph descriptor remains: signal input accepts audio/CV/gate/trigger/clock/MIDI, independent RISE CV and FALL CV inputs accept CV, and OUT is CV.
- Kept the legacy `step()` bucket path intact. Unsupported racks still fall back to legacy processing.
- Added deterministic DSP tests for caller-owned state, primitive return value, reset, independent rise/fall CV, finite-value handling, compatibility API, and equal elapsed-time behavior at 48 kHz / 96 kHz.
- Added engine-harness tests for the actual chain `Voltio(signal/rise/fall) → Slew Limiter → Mixer → Audio Out`, a live 96 kHz-to-48 kHz change, independent falling CV, state identity, and legacy fallback when an unsupported module is present.
- Official behavior reference: https://www.befaco.org/slew-limiter/ . The product description confirms independent rise/fall time controls with their own CV and a SHAPE control moving from linear to logarithmic response. Assembly reference: https://befaco.org/docs/Slew_Limiter/Slew_Limiter_V1_2_Assembly_Manual.pdf.
- **DSP limitation kept explicit:** this commit preserves the pre-existing clean-room shape interpolation (constant-rate to delta-proportional). It is not yet calibrated to the official analog logarithmic curve. Do not claim exact analog/firmware parity until the schematic response is characterized and measured. No VCV/Befaco implementation source or proprietary panel artwork was copied.

### Test and CI evidence

- Workflow [#108 / run 43875761386](https://github.com/joaoevooluti-web/Moldgf/actions/runs/43875761386) completed with conclusion **success** on code commit `a3a36d181dfb2f8f6d47d53b33e4cc31f09e4f7f`.
- Node suite: **738/738 passed**, 0 failures, errors, skipped or todo. The run includes the Slew Limiter DSP, graph descriptor, topological engine chain, sample-rate transition and legacy-fallback tests.
- Android JUnit: **13/13 passed**, 0 failures/errors/skips. Downloaded and parsed XML: `MidiMessageDecoderTest` 9/9 and `MidiBatchEncoderTest` 4/4.
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed the final `WebAssembly.compile` verifier. Beads native self-test reported `SELFTEST OK` for all four media × two modes, synth output, and 44.1 kHz host / 24 kHz media resampling.
- Gradle `testDebugUnitTest` and `assembleDebug`: success. All workflow steps, including the final WASM payload verifier, completed successfully.
- Artifact records:
  - `eurorack-study-debug-apk`, ID **14229817946**, ZIP **1,680,540 bytes**, SHA-256 `bae3fafd87ee8c4fadf89db255b6c6ad9d5eedb879d1fa979455678b49d5b9d0`; embedded `app-debug.apk` **1,715,039 bytes**, SHA-256 `11e47418f5625ebbe68dea180cd4917063fd0e8f912a1158988b091146ccaf14`.
  - `android-unit-test-report`, ID **14230501493**, ZIP **9,911 bytes**, SHA-256 `4bf0d8e46685bc5bdceb874e41df67fee7d9221a9ecdf108a2dadb4f97af3124`.
  - `wasm-log`, ID **14229333789**, ZIP **1,379 bytes**, SHA-256 `02a2d78e9f7aee4348a48ec5ce3bfd7cdc6b6c18a077338429a98d9a3a535694`.
- Inspected the downloaded APK archive: `assets/index.html`, `assets/module_graph.js`, `assets/slewlimiter_dsp.js`, Plaits/Beads wrappers and **42 DSP assets** are present. The packaged `index.html` contains the `processInto` adapter, state initializer and topological dispatch.
- The WASM log has one non-fatal Plaits `PAGE_SIZE` macro-redefinition warning. GitHub also reported upstream deprecation notices for `actions/setup-java@v4` and Node 20-based actions; they did not fail this run.
- CI evidence only: APK assembly and package inspection are not an installation or physical-device test. No hardware CV/audio, MIDI, touch, visual or Android-device validation is claimed.

### Phase 1 status after #108

- **Implemented:** guarded topological execution now covers 11 processing module types (Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer), plus Audio Out.
- **Tested:** 738 Node tests and 13 Android JUnit tests; Slew Limiter DSP, graph routing, scheduled chain, sample-rate change and legacy fallback all passed.
- **Validated in CI:** workflow #108; Plaits/Beads WASM build and final payload verification; Beads native self-test; Gradle unit tests/APK assembly; artifact upload and APK content inspection.
- **Pending:** characterize and calibrate the SHAPE response against the analog logarithmic behavior; improve the Slew Limiter front panel from generic controls to a hardware-faithful original layout; integrate its reset into the future global versioned state/reset contract; continue migrating the other existing modules only after their sample-rate, normaling, state and no-allocation contracts pass.
- **Not claimed:** exact analog/firmware parity, APK installation, or physical Android validation.

### Repository protection

- At code commit `a3a36d181dfb2f8f6d47d53b33e4cc31f09e4f7f`, `main...feature/befaco-modules` reported **625 ahead / 0 behind**, merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified. No merge or force-push was performed.


## Workflow #110 — Slew allocation-free topological adapter (2026-11-17)

### Implemented in code

- Code commit: `0813861f83db1eebba20a1ce1f73d463f79e8fc2` on `feature/befaco-modules`.
- Follow-up regression expectation correction: `1dce6ef918a4433db3a0b5ffdcac04788998d331`.
- Added `MoldgfSlewDSP.createState()`, `reset()` and a real-time `processInto()` path. With a caller-owned state, `processInto()` returns a primitive output sample and updates `out`, `rising`, `falling`, and `rate` without constructing a result record or array per sample. The existing `process()` result-record API remains as a compatibility wrapper.
- Changed the runtime state factory from `{out:0}` to `MoldgfSlewDSP.createState()`.
- Reworked `slewF()` to use `processInto()` in both execution modes. It publishes the CV output and the two 0–10 V slope-detector gates directly into the shared signal table.
- Added Slew to both the UI scheduler allowlist and the audio-engine execution whitelist, and added its dispatcher in `processTopologicalRack()`. The legacy `step()` bucket remains intact and continues to call the same allocation-free adapter when an unsupported module forces fallback.
- Kept the existing five graph endpoints: voltage input, shared rise/fall CV input, CV output, rising gate output, and falling gate output. Tightened the voltage input contract to audio/CV/gate/trigger/clock; raw MIDI messages are not voltage and are rejected by this port.
- Preserved the existing parameter model: three time ranges, independent Rise/Fall faders, shared CV selector (Fall / Rise+Fall / Rise), and Shape response. The official manual describes CV input range 0–10 V, faders as CV attenuators, and gates held while the output rises/falls: https://www.befaco.org/docs/Slew/SLEW_User_manual.pdf.
- No VCV/Befaco implementation code or proprietary faceplate artwork was copied.

### Regression correction before final CI

- Workflow [#109 / run 44095521117](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44095521117) was an intermediate failed run: 744/746 Node tests passed. The two failures were stale/incorrect test expectations, not DSP or scheduler runtime regressions:
  - `graph_scheduler_runtime.test.cjs` still expected the pre-Slew allowlist; updated it to assert Slew admission and dispatcher parity.
  - The new manual-fall test set the Fall fader to 1 while expecting maximum speed; corrected the fixture to use 0 for the manual-fast case and 1 for the CV-controlled slow case.
- Both corrections are in commit `1dce6ef918a4433db3a0b5ffdcac04788998d331`.

### Test and CI evidence

- Workflow [#110 / run 44095927440](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44095927440) completed with conclusion **success** on commit `1dce6ef918a4433db3a0b5ffdcac04788998d331`.
- Node suite: **746/746 passed**, 0 failures, errors, skipped or todo. This includes the new allocation-free Slew DSP tests, graph rejection of raw MIDI, topological signal/CV/rising/falling routing through Mixer to Audio Out, direction-specific CV selection, sample-rate change, and legacy fallback.
- Android/JUnit: **13/13 passed**, 0 failures/errors/skips. The downloaded XML reports confirm `MidiMessageDecoderTest` 9/9 and `MidiBatchEncoderTest` 4/4.
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed the workflow's final `WebAssembly.compile` verifier.
- Beads native self-test: `SELFTEST OK`; all eight media/mode combinations, synth output, and 44.1 kHz host / 24 kHz media resampling checks were successful.
- Gradle `testDebugUnitTest` and `assembleDebug`: success. The final APK/WASM payload verification step also succeeded.
- Artifact records:
  - `eurorack-study-debug-apk`, ID **14334455794**, ZIP **1,680,884 bytes**, SHA-256 `4cb543875f72dc085b9f7bdf442bd328ce2ddcb74ebf3910ee76dba33c649dc9`; embedded `app-debug.apk` **1,715,467 bytes**, SHA-256 `cdc78c6441f437dcfcffe83ea35b100042af12d7b885b123d4389d1358e0ce8e`.
  - `android-unit-test-report`, ID **14333218616**, ZIP **9,899 bytes**, SHA-256 `0ced7ce197e49394074b5a1cd496cf59fc67d73d3dcb92c5355afcf880c91de9`.
  - `wasm-log`, ID **14333632633**, ZIP **1,381 bytes**, SHA-256 `a4f97a2ee8cafd3ed16f2104fd63e61895c243a00247bb16c8b11a8b443c9490`.
- Inspected the downloaded APK archive: `assets/index.html`, `assets/module_graph.js`, `assets/slew_dsp.js`, Plaits/Beads wrappers and **42 DSP assets** are present. The packaged engine contains the `processInto` dispatcher and Slew in the UI scheduler allowlist.
- Non-fatal warnings: Plaits still reports an Emscripten `PAGE_SIZE` macro redefinition; GitHub Actions logs include upstream Node/punycode deprecation notices. They did not fail the build.
- CI evidence only: APK assembly and archive inspection do not imply installation or physical-device testing. No hardware CV/audio, MIDI, touch, visual or Android-device validation is claimed.

### Phase 1 status after #110

- **Implemented:** guarded topological execution now covers 12 processing module types (Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer), plus Audio Out.
- **Tested:** 746 Node tests and 13 Android JUnit tests; Slew's DSP, CV routing, both slope-detector gates, downstream mixer routing, sample-rate changes and unsupported-rack fallback passed.
- **Validated in CI:** workflow #110; Plaits/Beads WASM builds and final payload compilation; Beads native self-test; Gradle unit tests/APK assembly; artifact upload and APK content inspection.
- **Pending:** characterize/calibrate Slew's analog shape curve and pitch tracking; improve its front panel separately; integrate its reset into the future versioned global state/reset contract; continue scheduler adoption only after each module's normaling, hidden dependencies, sample-rate, state and no-allocation contracts are verified.
- **Pending globally:** parameter event queue, versioned state schema, explicit reset/bypass contract, dynamic output signal typing and complete 34-module hardware parity.
- **Not claimed:** exact analog/firmware parity, APK installation, or physical Android validation.

### Repository protection

- At code commit `1dce6ef918a4433db3a0b5ffdcac04788998d331`, `main...feature/befaco-modules` was **628 commits ahead / 0 behind**. After the roadmap-only commit `f6e597280a212e075abcfd2b6dc751f8a243c041`, the current branch is **629 ahead / 0 behind**; merge base remains `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified. No merge or force-push was performed.


## ADSR — allocation-free topological adapter and Gate/Trigger mode (2026-11-18)

### Implemented

- DSP/scheduler commit: `36b1842d937e4223594c0aa9e9a2da2ac7791e22`.
- Mode semantics commit: `770464c55634c392d6a886fa53f088a415a0dc59`.
- Regression-fixture correction: `5e26713cde300eb645e3a90e6a86b0ba589e711e`.
- Replaced the ADSR runtime initializer with `MoldgfADSRDSP.createState()`. The state owns its four-element stage-gate buffer and a reusable input scratch object.
- Added `reset(state)` and `processInto(params, inputs, state, sampleTime)`. The real-time path mutates the existing state, updates the existing gate array and returns the envelope as a primitive number. With a state from `createState()`, it creates no result objects or arrays per sample. The existing `process()` API remains as an allocating compatibility wrapper for non-real-time callers.
- Reworked `adsrF()` to fill the state-owned input scratch fields, call `processInto()`, and publish ENV, ATTACK, DECAY, SUSTAIN and RELEASE outputs directly. The same adapter is used by both the topological dispatcher and the legacy `step()` bucket.
- Added ADSR to the engine execution whitelist, the UI active-scheduler allowlist and `processTopologicalRack()`. Its existing typed graph descriptor remains active: Gate, Trigger, four stage-CV inputs, envelope CV output and four 0–10 V stage-gate outputs.
- Added the explicit hardware operating mode: `mode=0` (GATE) begins Release immediately when the gate falls; `mode=1` (TRIGGER) completes Attack and Decay after a short gate pulse, then enters Release if the input is no longer high. The UI now exposes a GATE / TRIGGER selector instead of the previous RETRIGGER label. The old `retrigger` state field is retained for saved-patch compatibility but is no longer presented as a hardware control.
- Added automated coverage for reusable state/input/gate buffers, primitive return, reset/edge-memory clearing, compatibility-wrapper parity, both operating modes, topological ADSR → Mixer → Audio Out routing, stage-gate routing and unsupported-rack fallback.
- Official behavior reference: https://befaco.org/docs/ADSR/ADSR_User_Manual.pdf and https://www.befaco.org/vc-adsr/. The manual documents the Gate/Trigger mode distinction and one 0–10 V output for each active envelope stage.

### Test evidence and intermediate correction

- Workflow [#111 / run 44314632486](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44314632486) succeeded on commit `36b1842d937e4223594c0aa9e9a2da2ac7791e22`:
  - Node: **751/751 passed**, zero failures/skips.
  - Android JUnit: **13/13 passed** (MIDI decoder 9/9; MIDI batch encoder 4/4), confirmed from downloaded XML.
  - Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**.
  - Beads native self-test: `SELFTEST OK`; all eight media/mode combinations, synth output and 44.1 kHz host / 24 kHz media resampling checks passed.
  - Both embedded WASM payloads passed the workflow's `WebAssembly.compile` verification. Gradle `testDebugUnitTest` and `assembleDebug` succeeded.
  - Artifacts: APK ID **14432820133** (ZIP 1,681,352 bytes; SHA-256 `76ca536d7d95de2a8d8a1be9142b0c87f81fcc2c705367fc17ad6e3d83b28d25`; embedded APK 1,716,031 bytes, SHA-256 `c9d0a64f7839df0584ae6cde89c23dc49409cbac25f2594d5b3ab398e70fd8bb`); JUnit ID **14431084013** (9,912 bytes; SHA-256 `3e52d269f4acfbe850a1dc64cbb5093a26f2e4052850de9b65fc6596e397b19c`); WASM log ID **14431267670** (1,379 bytes; SHA-256 `c1022c31f39f61f3bc7fb88ee8fe9bba1c19cc183dbea9243000b8f0167be02b`).
  - APK archive inspection confirmed `adsr_dsp.js`, `index.html`, `module_graph.js`, 42 DSP assets and both Plaits/Beads wrappers. This is CI packaging evidence only.
- Workflow [#112 / run 44315360822](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44315360822) was an intermediate failure on `770464c`: **753/754** Node tests passed. The only failure was an off-by-one in the new trigger-mode test fixture: it advanced one extra 1 ms sample and therefore expected DECAY after the envelope had correctly entered RELEASE. No existing DSP or graph test failed. Because the Node gate stopped the build, WASM and Gradle/APK stages were skipped; the always-run payload verifier then reported missing wrappers. This was not a WASM regression.
- Corrected the fixture in `5e26713cde300eb645e3a90e6a86b0ba589e711e`. Final workflow [#114 / run 44315582651](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44315582651) succeeded on that commit:
  - Node: **754/754 passed**, zero failures, cancellations, skips or todo.
  - Android JUnit: **13/13 passed**, zero failures/errors/skips; XML confirms decoder 9/9 and encoder 4/4.
  - Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**; both passed `WebAssembly.compile`.
  - Beads native self-test: `SELFTEST OK`.
  - Gradle `testDebugUnitTest`, `assembleDebug`, APK upload and final payload verification: success.
  - Artifacts: APK ID **14432032418** (ZIP 1,681,400 bytes; SHA-256 `d0f12c4c3d6979731754ea4377ba842a78840615343573ba92945baeb58068c1`; embedded APK 1,716,023 bytes, SHA-256 `a3285f171731118c63e418de91c58937a5ac33e19fdbd8d6a95069eda6d3c837`); JUnit ID **14432786032** (9,887 bytes; SHA-256 `378da3a7e792b807470104947b81e71052291a499459db42caf8fd9998c21c`); WASM log ID **14432980357** (1,381 bytes; SHA-256 `f2246b54bdef8ecd3bcbf6c018f73279f97db9b384d473d0a7a6c3230190a6a5`).
  - Inspected the downloaded APK: `assets/adsr_dsp.js` (6,272 bytes), updated `assets/index.html` (335,684 bytes), `assets/module_graph.js` (12,560 bytes), all **42 DSP assets**, and both WASM wrappers are present. The packaged HTML contains the ADSR `processInto` adapter, Gate/Trigger selector and scheduler admission. CI evidence only; no installation or device test is implied.
- Non-fatal warnings: Plaits emits an Emscripten `PAGE_SIZE` macro-redefinition warning; Node/GitHub Actions emit upstream `punycode` / Node 20 deprecation warnings. They did not fail workflow #114.

### ADSR status after #114

- **Implemented:** allocation-free per-sample ADSR adapter, persistent stage state, explicit Gate/Trigger mode, four stage-gate outputs, reset API and guarded topological dispatcher; legacy `process()` and legacy `step()` remain available.
- **Tested:** DSP limits/stages/CV, short-pulse Trigger behavior, immediate Gate release, reset, buffer identity, compatibility wrapper, real ADSR → Mixer → Audio Out chain and legacy fallback.
- **Validated in CI:** workflow #114, 754/754 Node, 13/13 Android JUnit, Plaits/Beads WASM build and payload compilation, Beads native self-test, Gradle tests/APK assembly and APK content inspection.
- **Pending / limitations:** the application retains a separate TRIG jack alongside GATE as an extra compatibility input, whereas the physical VC ADSR manual describes one combined Gate/Trigger input; the two-port app extension is not a literal hardware-panel match. The DSP is a clean-room envelope model, not a transistor-level current-mirror simulation; the response curve and stage timing have not been calibrated against measured hardware. Full panel fidelity and physical voltage/audio validation remain unclaimed.
- **Global pending:** parameter event queue, versioned state schema, shared reset/bypass contract, dynamic output signal typing and migration of the remaining Befaco modules.

### Scheduler inventory after #114

The guarded topological scheduler now admits **13 processing module types**, plus the Audio Out sink: Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, ADSR, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer. The remaining catalog modules continue on the legacy path until their normaling, hidden dependencies, sample-rate, state/reset and no-allocation contracts are audited.

### Repository protection

- At code commit `5e26713cde300eb645e3a90e6a86b0ba589e711e`, `main...feature/befaco-modules` was **633 commits ahead / 0 behind**, merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified. No merge or force-push was performed.

## Workflow #116 — Percall allocation-free topological adapter (2026-11-19)

### Implemented
- DSP/runtime commit: `a7e795318ebb8e214bd00001957e2f3242e9f7e9`.
- Regression correction: `aa972582bff9874a460a9955261a1da8950b8d3e`.
- Replaced the PerCall runtime initializer with `MoldgfPercallDSP.createState()`; the state owns four envelope/stage/edge arrays, normalized audio/channel scratch, reusable inputs, output/envelope/gain buffers and a stable result record.
- Added `reset(state)` and `processInto(inputs, params, state, sampleTime)`. The caller-owned path mutates state and returns the same result object/buffers without per-sample array or result-object creation. The older `process()` result-copy API remains as a compatibility wrapper.
- Reworked `percallF()` to fill state-owned input/patch-status scratch and call `processInto()`, publishing audio and envelope outputs directly. The same adapter is used by the guarded topological dispatcher and legacy `step()`.
- Added PerCall to the audio-engine whitelist, UI active-scheduler allowlist and `processTopologicalRack()` dispatcher. Its existing typed graph descriptor remains unchanged.
- Preserved the four-channel audio normaling (odd channels normal to the previous even channel), individual outputs, channel-four master sum that removes OUT1/OUT2/OUT3 when patched, Strength CV, Decay CV, trigger edge/hysteresis and Choke behavior. No VCV/Befaco source implementation or proprietary panel artwork was copied.

### Tests and intermediate regression
- Added three DSP tests: stable `processInto` result/buffer identities, reset clearing envelope/edge/scratch/output state without replacing buffers, and patched-master/Strength scaling.
- Added two scheduler-runtime tests: PerCall → Mixer → Audio Out in topological mode, and PerCall routing when an unsupported module forces legacy execution.
- Workflow [#115 / run 44532606879](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44532606879) failed at the Node gate on commit `a7e7953`: **758/759** tests passed. The single failure was an overstrict legacy-fallback fixture that expected same-sample equality despite the fixed legacy bucket order processing Mixer before PerCall. The adapter itself produced its output; the fallback test was corrected to assert downstream positive routing/output and document the one-sample legacy ordering limitation.
- Final workflow [#116 / run 44532791672](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44532791672) completed with **success** on commit `aa972582bff9874a460a9955261a1da8950b8d3e`.
- Node: **759/759 passed**, zero failures, skips or todo.
- Android/JUnit: **13/13 passed**, zero failures/errors/skips. The downloaded XML confirms MIDI decoder 9/9 and MIDI batch encoder 4/4.
- Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**. Both embedded payloads passed the final `WebAssembly.compile` verifier.
- Beads native self-test: `SELFTEST OK`; all eight media/mode combinations, synth output and 44.1 kHz host / 24 kHz media resampling checks passed.
- Gradle `testDebugUnitTest` and `assembleDebug`: success; APK upload and final WASM payload verification succeeded.
- Artifacts:
  - `eurorack-study-debug-apk`, ID **14533543484**, ZIP **1,681,902 bytes**, SHA-256 `c848dcdcf8ad61bc50b8890e347d6a27ca868a0a2b781c0afbee3923b5b63580`; embedded APK **1,716,707 bytes**, SHA-256 `fcaabb7000b58c075f4b1819c2f9ad0d479a51e8bc5866f805a80b052713abdd`.
  - `android-unit-test-report`, ID **14533808199**, ZIP **9,914 bytes**, SHA-256 `3a519b259f35d09ee69b9bfe235a7c39cc8fbf058f198c0c566a4ba1f0dbd048`.
  - `wasm-log`, ID **14535012022**, ZIP **1,380 bytes** (downloaded and inspected; build log records both real payloads and Beads self-test).
- APK archive inspection confirms `percall_dsp.js` (5,329 bytes), updated `index.html` (335,887 bytes), `module_graph.js` (12,560 bytes), 42 DSP assets and both Plaits/Beads wrappers. The packaged HTML includes the PerCall `createState()` factory, dispatcher and scheduler allowlist. This is CI packaging evidence only.
- Non-fatal warnings: Plaits `PAGE_SIZE` macro redefinition; upstream GitHub Actions Node 20 deprecation, `punycode` and `url.parse()` warnings. None failed #116.

### PerCall status after #116
- **Implemented:** reusable DSP state/reset and `processInto()`, legacy compatibility wrapper, typed-graph scheduler admission and both topological/legacy adapter paths.
- **Tested:** DSP limits/strength, master patch-normaling, reset/edge state, buffer identity, topological audio routing and legacy downstream routing.
- **Validated in CI:** #116; 759/759 Node, 13/13 JUnit, Plaits/Beads build and payload verification, Beads native self-test, Gradle unit tests/APK assembly and artifact inspection.
- **Pending / limitations:** legacy fallback's fixed bucket order can leave Mixer one sample behind PerCall; topological execution removes that ordering issue when the rack is fully supported. The model remains a clean-room behavioral approximation, not analog/firmware parity. Choke/decay/strength response and visual faceplate fidelity have not been calibrated against physical hardware. The global versioned state/reset and parameter event queue remain pending.
- **Scheduler inventory:** **14 processing module types** plus Audio Out — Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, ADSR, Percall, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer. Remaining catalog modules continue on legacy execution until their contracts are audited.
- **Not claimed:** APK installation, audio/CV, MIDI, touch, visual or physical Android-device validation.

### Repository protection after #116
- At code commit `aa972582bff9874a460a9955261a1da8950b8d3e`, `main...feature/befaco-modules` is **637 commits ahead / 0 behind**, merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` was not modified; no merge or force-push was performed.


## Workflow #119 — MuDi allocation-conscious scheduler migration (2026-11-20)

### Implemented
- DSP commit: `f141612d515be6b5479f9792496a9d1a298017ed`; graph-test correction: `ca17f70f18cdf055c2fb33c684c7fda08fc61e0d`; scheduler-admission test correction: `b4dcc27257aa7e5086a113769431b7310ff8c9fe`.
- Reworked MuDi around `createState()`, `reset()`, and `processInto()`. The caller-owned `Float32Array(7)` and `Uint8Array(5)` remain stable; `processInto()` does not create per-sample objects or arrays. The legacy `process()` wrapper preserves the original five-output shape for compatibility.
- Implemented three conditioned base-clock copies and four square-wave divisions (1/2, 1/4, 1/8, 1/16), 0–10 V scaling, the optional application bipolar offset, Schmitt clock/reset thresholds, reset dominance and divider state.
- Added seven typed gate outputs to the descriptor, jack renderer and graph contracts; admitted MuDi to the engine/UI scheduler allowlists and topological dispatcher. The legacy `step()` bucket still calls the same adapter when a rack falls back.
- The app renders separate CLOCK and RESET jacks rather than the hardware TRS tip/ring connector. The optional ±5 V selector is an app compatibility feature. This clean-room port did not reuse VCV/Befaco source or proprietary panel artwork.

### Tests and corrections
- Added nine deterministic DSP tests, four graph/faceplate tests, two scheduler runtime routing tests and a scheduler-admission regression.
- Intermediate workflow #117 (run 44744774475) failed at the scheduler allowlist assertion because its expected list had not yet been updated for MuDi; run #118 (44744849805) exposed the same stale assertion after the graph-test regex correction. Updated the audio-engine whitelist assertion in commit `b4dcc272`.
- Final workflow [#119 / run 44745021819](https://github.com/joaoevooluti-web/Moldgf/actions/runs/44745021819) succeeded on `b4dcc27257aa7e5086a113769431b7310ff8c9fe`:
  - Node: **766 tests**, successful, zero failures (run log summary).
  - Android `testDebugUnitTest`: success; uploaded JUnit artifact.
  - Plaits WASM: **185,636 bytes**; Beads WASM: **196,726 bytes**; both passed the final `WebAssembly.compile` verification.
  - Beads native self-test: `SELFTEST OK`.
  - Gradle `assembleDebug`: success; APK artifact uploaded.
- Artifacts (metadata verified; binary downloads unavailable in this run, so contents/hashes inside the APK were not independently inspected):
  - `eurorack-study-debug-apk`, ID **14633305236**, 1,682,502 bytes, GitHub SHA-256 digest `76b94ecd956adefab146c41538453b63e27eec987c3d40f3360e5628c8f42e86`.
  - `android-unit-test-report`, ID **14631509878**, 9,898 bytes, SHA-256 `096ff0c5039296aea8bf41f60c026371aff266a1cc1c32b69baabb54f439341f`.
  - `wasm-log`, ID **14631979009**, 1,379 bytes, SHA-256 `d9702a4a3d3af718f3e1a97f8db75d3a7c1f882d2670142ca9b58c6709cd6b3f`.
- The successful workflow is CI packaging/build evidence only; no APK installation, audio/CV output, MIDI, touch, visual or physical Android-device validation is claimed.

### MuDi status after #119
- **Implemented:** seven outputs, typed routing, stable-state adapter, reset and topological/legacy dispatch.
- **Tested:** deterministic clock thresholds, divider sequence, reset, level offset, output buffer identity, faceplate/descriptor ports and downstream routing/fallback.
- **Validated in CI:** #119, 766 Node tests, Gradle unit tests, WASM builds/verification, Beads native self-test and APK assembly/upload.
- **Pending/limitations:** the square-wave divider model and hysteresis remain clean-room approximations, not measured hardware calibration; TRS clock/reset is represented by two app jacks; the optional bipolar selector is not a literal hardware feature. Parameter event queue, versioned runtime state/reset contracts, dynamic output typing and visual/device validation remain pending.
- **Scheduler inventory:** **15 processing types** plus Audio Out — Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, ADSR, PerCall, MuDi, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer. Other catalog modules remain on legacy execution until audited.

### Repository protection after #119
- `main...feature/befaco-modules`: **641 commits ahead / 0 behind**; merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`.
- `main` remains unchanged; no merge or force-push.



## IROI — allocation-conscious adapter and guarded scheduler migration (2026-11-21, CI #121 validated)

- **Implemented:** added `processInto()` while preserving `process()`; state now owns a reusable input scratch record and result record. `iroiF()` fills the scratch fields and dispatches the DSP without constructing an input object per sample. Added a buffer-preserving `reset()` for filter, comb, resonator, echo, reverb/allpass and modulation state. Iroi is admitted to both scheduler allowlists and the topological dispatcher; its existing legacy `step()` path remains available.
- **Tests added:** stable scratch/result identity, reset memory clearing with buffer identity preservation, right-input normaling and independent stereo paths, topological Iroi → Mixer → Audio Out routing, legacy fallback, and scheduler-admission assertions. Existing typed ports and jack audit are unchanged.
- **Intermediate CI #120:** 771/772 Node tests passed. The only failure was the new reset fixture asserting an echo buffer had been populated after one sample, although the full-wet resonator initially yielded zero. The scheduler/routing integration tests passed; WASM/Gradle/APK stages were gated off by the Node failure. The fixture now drives 2,000 samples through the dry-resonator/half-echo path before checking reset; correction commit `074902d58d2e0062f212ae89b8eac12e93473d22` was validated by #121.
- **Validated in CI #121:** run `44908498389`, head `074902d58d2e0062f212ae89b8eac12e93473d22`, success. Node **772/772**; Android JUnit **13/13** (MIDI decoder 9/9, encoder 4/4); Gradle `testDebugUnitTest` and `assembleDebug` successful; Plaits WASM **185,640 bytes**, Beads WASM **196,726 bytes**, Beads native self-test `SELFTEST OK`, and both payloads passed `WebAssembly.compile` verification.
- **Artifacts #121:** APK artifact ID **14708932892**, ZIP 1,682,724 bytes, SHA-256 `b759da4a061464f2eceef5a147fdccb2f2f4f30fb153e6ae181b81c3df4e1c30`; internal APK 1,717,631 bytes, SHA-256 `b04a02538ce1fefada5318869892e5847d8d2e28947c128e777c27462f7a3121`. JUnit artifact ID **14708628627**, 9,899 bytes, SHA-256 `2477efff520794652b9f87eb6df627668cbafbc591a0ecd17db00d3e611ebffc`; XML reports contain 9 + 4 tests, no failures/errors/skips. WASM log artifact ID **14709136143**, 1,381 bytes, SHA-256 `c20cf5054bc12d6484233d8fe19cbe53d63f41511a1a751b0f9f1a24279e49c3`.
- **APK inspection:** the ZIP and APK were downloaded and inspected. The APK contains 42 DSP assets, `assets/iroi_dsp.js` (10,854 bytes; SHA-256 `16dbe058a3854af73b728b11dff7e20d4a8988183f8b6bb52537e84ebf3a3b2c`) with `processInto()` and `reset()`, updated `assets/index.html` (335,584 bytes; SHA-256 `c245cbbdb76c7ffad2746c91515d3c397104e8cf6b8df1782132df052f5fbf73`), and both WASM wrappers. This is CI package evidence, not device validation.
- **Warnings:** non-fatal Plaits `PAGE_SIZE` macro redefinition and GitHub Actions/dependency deprecation warnings remain.
- **Scheduler inventory:** now **16 processing types** plus Audio Out: Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, ADSR, PerCall, MuDi, Iroi, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer.
- **Repository protection after #121:** expected `main...feature/befaco-modules` **647 commits ahead / 0 behind**, merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`; `main` unchanged, no merge or force-push.
- No local Node/Gradle execution or physical Android validation was performed in this session.
- **Limitations:** Iroi still models L/R as two scalar mono ports; filter/resonator/echo/ambience algorithms remain clean-room approximations, not firmware/analog parity. The sample-rate change path rebuilds effect buffers when the rate changes; the steady-state processing path reuses scratch/result and does not allocate per sample.
- **License:** no VCV/Befaco source or proprietary panel artwork was reused in this adapter change.

## Bandit — allocation-conscious adapter and scheduler migration (2026-11-22; CI #125 success)

- **Code commits:** `df1bf2c73ca541cf62058429ff7b83472144528a`; syntax correction `adac5906bb496c87aa2a6f322813d2ad4f3affd6`; scheduler/reset assertions `f76b1359f9d66ec6e4e383e9c68425a0eb861ad2`; faceplate patch-status assertion `c7bc518905fca336f3420510eacfbde09b9f9bd7`.
- **Implemented:** allocation-conscious `processInto()` using state-owned reusable input scratch, band output and patch-status buffers; buffer-preserving `reset()`; sample-rate filter rebuild without replacing result/output scratch; stable `process()` compatibility wrapper. The engine adapter fills scratch, dispatches Bandit in the guarded topological scheduler and preserves the same DSP adapter in the legacy step path. Bandit was added to the engine and UI scheduler allowlists.
- **Tested:** DSP normaling and individual-input override, CV summing and VCA bounds, patched send removal from MIX OUT, post-filter returns, soft clip and meter, finite-value handling, sample-rate change, scratch identity and reset. Graph plan, topological Bandit sends + return-only MIX OUT to stereo Audio Out, legacy fallback, scheduler admission and AudioWorklet/ScriptProcessor shared-step contract also passed.
- **Validated in CI:** workflow [#125 / 45030119488](https://github.com/joaoevooluti-web/Moldgf/actions/runs/45030119488), code commit `c7bc518905fca336f3420510eacfbde09b9f9bd7): Node **777 passed / 0 failed**; Android/JUnit **9/9 MIDI decoder + 4/4 batch encoder**, zero failures/errors/skips; Gradle `testDebugUnitTest` and `assembleDebug` succeeded; Plaits WASM **185,441 bytes** and Beads WASM **196,401 bytes**; Beads native self-test `SELFTEST OK`; both embedded payloads passed `WebAssembly.compile`.
- **Artifacts inspected:** `eurorack-study-debug-apk` ID `14757740822`, ZIP 1,684,502 bytes, SHA-256 `007e4bb0c60326b4fa19367fd93dd6aa49eac4ea1fecba0c2b44959180f88b8a`; APK 1,719,115 bytes, SHA-256 `874334b41176f4a4261c21e185abbf7f5bd5d4687d9d2f9773ff5a831902fd23`. The package contains 42 DSP assets; `bandit_dsp.js` 3,770 bytes (SHA-256 `b003a8f58b5a1af701f56f1767e6daba59b7c432bf4ac2176f3f71046b31c09a)); updated `index.html` 336,202 bytes and `module_graph.js` 12,560 bytes. JUnit artifact ID `14757502371`, 9,905 bytes, SHA-256 `98f073db66a79f917ecadc4798a46498c6158212734c6304476f688201c30c33`; WASM log artifact ID `14756893220`, 1,379 bytes, SHA-256 `e1ea2864edf1686fe1edc4563a1b910de160357ddb8cb8e7dd84c1fb85c128dc`.
- **Intermediate CI failures and corrections:** #122 exposed adapter syntax; #123 exposed two stale assertions; #124 exposed one remaining stale Bandit patch-status assertion. All were corrected in the commits above; #125 passed.
- **Pending fidelity work:** current clean-room DSP remains a low-pass / band-pass / high-pass approximation, not calibrated shelf/peak analog topology. No hardware response calibration or Android-device test is claimed.
- **License:** no VCV/Befaco source code or proprietary artwork was copied in this migration.
- **Historical status after #125:** implemented, tested and validated in CI. The scheduler admitted **17 processing module types** plus Audio Out at that point; Hexmix VCA was the next target and is migrated in the following dated section.


## Hexmix VCA — allocation-conscious topological adapter (2026-11-23; CI #127 validated)

- **Code commits:** DSP/scheduler/test batch `4682094b6d6b124ce2b164fe5e12736acc68d048`; correction to the stale scheduler-order expectation `4bf35b85a5a44b09e01b4a95fc552cc97d9055c9`.
- **Implemented:** added `createState()`, buffer-preserving `reset()`, and `processInto()`. The state owns reusable six-channel signal/CV scratch arrays, a five-bit patch-status buffer, and six output values. The engine adapter fills these buffers in place, dispatches the DSP in the guarded topological scheduler, and retains the same adapter in the legacy `step()` path. The `process()` wrapper remains compatible with the six-value array contract.
- **Behavior:** unpatched CV inputs normalize to +10 V; CV and level bounds are applied; shape spans the clean-room fourth-power/linear/log response. Outputs 1–5 remain individual channels. Output 6 can remain channel 6 alone or sum channel 6 with unpatched channels 1–5, excluding channels whose individual outputs are patched. Hexmix VCA was added to the engine/UI scheduler allowlists and topological dispatch.
- **Tests:** eight DSP tests now cover normalization, shape response, bounds, independent mode, patch-aware mixing, reset and wrapper compatibility; three graph tests cover six signal/CV/output ports, direction and VCA → Mixer → sink connectivity; two scheduler runtime tests cover VCA → Mixer → Audio Out and the legacy fallback. The scheduler shared-step/AudioWorklet-ScriptProcessor contract and admission assertions are included in the existing suite.
- **Intermediate workflow #126:** run `45185018410` failed at one stale Slew scheduler-order assertion after the new type was inserted. The module DSP, graph and two runtime tests themselves passed; the failure prevented the WASM build and downstream verification. Updated the expected order in commit `4bf35b8`.
- **Validated in CI:** workflow [#127 / run 45185175286](https://github.com/joaoevooluti-web/Moldgf/actions/runs/45185175286), head `4bf35b85a5a44b09e01b4a95fc552cc97d9055c9`, success. Node **782/782**; Android/JUnit **13/13** (MIDI decoder 9/9 and batch encoder 4/4, no failures/errors/skips); Gradle `testDebugUnitTest` and `assembleDebug` succeeded; Plaits WASM **185,441 bytes**, Beads WASM **196,401 bytes**; Beads native self-test `SELFTEST OK`; both embedded WASM payloads passed `WebAssembly.compile`.
- **Artifacts inspected:** `eurorack-study-debug-apk` ID **14824330208**, ZIP **1,684,831 bytes**, SHA-256 `bbd6f2e3390ae0ddbcb6949a04da7aafecbba093cba04557260f25b1cc21f2bd`; internal APK **1,719,443 bytes**, SHA-256 `f53fa1a1352b2d3660379c79ef5d7b9390606b36eaf21b3ad55a046ac3ab757c`. APK inspection confirmed 46 assets total (42 DSP assets plus four support assets), `hexmixvca_dsp.js` (2,915 bytes; SHA-256 `b30f55e94d7e1384bcac9f6be99712b0e7a3e1c54f8dd57b5738e266c62a12ca`), updated `index.html` (336,163 bytes; SHA-256 `5e10877cbfe955782eb5ae7ed75c523743a8f65f1142826c0f26e182c1c78ad8`), and `module_graph.js` (12,560 bytes; SHA-256 `aafa499f931aa8ba09afdd6ef894acfed79b8d248a1e4d3d2f0aba3ac787a448`). JUnit artifact ID **14824330142**, 9,913 bytes, SHA-256 `f96d136ef1616dd16e433fb1a1f9f6aac30c6f99d6d4e730c6768eee94e2d0dd`; both XML reports were inspected and contain 9 + 4 tests with no failures, errors or skips. WASM log artifact ID **14822684121**, 1,379 bytes, SHA-256 `a3c4b98a7346bf91247e639feb95ba4a74e651e60f1ac08a3a6d31bb3d88f427`; log inspection confirms the two payloads and `SELFTEST OK`.
- **Warnings/limits:** the non-fatal Plaits `PAGE_SIZE` redefinition warning and Actions/Node deprecation notices remain. The gain curve is a clean-room behavioral approximation, not analog calibration or circuit/firmware parity. No local Node/Gradle run was possible because the container could not clone the repository; CI provides the test/build evidence. No Android device installation or physical CV/audio validation is claimed.
- **Licensing:** no VCV/Befaco code or proprietary artwork was copied/adapted in this migration.
- **Historical scheduler inventory after #127:** **18 processing module types** plus Audio Out — Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, ADSR, PerCall, MuDi, Iroi, Bandit, Hexmix VCA, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer. Chopping Kinky is migrated in the following dated section.
- **Repository protection after #127:** `main...feature/befaco-modules` remains ahead-only; `main` is unchanged and no merge or force-push was performed. The baseline Phase 0 record remains corrected and completed.
- **Next objective at #127:** audit Chopping Kinky’s fold/drive CV, input normaling, output level/DC behavior and state/reset before enabling it in the scheduler.


## Chopping Kinky — topological scheduler migration (2026-11-24; CI #129 success)

- **Code commits:** scheduler/DSP/test batch `0001ebe49b7ee1678ea99b3cbdf06f05a5356ad3`; compatibility wrapper and boundary-test correction `78bb9e686c4112c50a2c82d0861279b5a6538030`.
- **Implemented:** the existing clean-room fold/drive DSP now exposes `createState()`, buffer-preserving `reset()`, and allocation-conscious `processInto()`. State owns reusable input scratch and result storage; the compatibility `process()` wrapper returns a fresh snapshot, preserving the previous object-per-call API. The engine fills scratch in place and routes CHOPP, OUT A and OUT B through the guarded topological scheduler; legacy `step()` remains supported. Chopping Kinky was added to the engine and UI scheduler allowlists and topological dispatch. Existing B-IN→A-IN and CV-B→CV-A normaling, gate selection, zero-crossing selection and optional DC block remain.
- **Tested:** three additional DSP tests cover scratch/result identity, reset of gate/fold/DC memory, and non-finite/boundary handling; the graph scheduler admission test and two runtime tests cover CK→Audio Out topological routing and legacy fallback. Existing typed-jack descriptors and faceplate were retained.
- **Intermediate failure:** workflow #128 / run `45403804294` (commit `0001ebe`) reported 788 Node tests, 786 passed / 2 failed. One failure exposed the `process()` wrapper returning the state-owned result object rather than the legacy snapshot; the second expectation incorrectly required the asymmetric Fold B path to be zero at zero gain (its offset is 0.8 V in this clean-room model). Both were corrected in `78bb9e`; the #128 WASM verification was skipped after the Node failure, not a payload defect.
- **Validated in CI:** workflow [#129 / run 45403950754](https://github.com/joaoevooluti-web/Moldgf/actions/runs/45403950754), head `78bb9e686c4112c50a2c82d0861279b5a6538030`, success. Node **788/788**; Gradle/JUnit **13/13** (MIDI decoder 9/9 and batch encoder 4/4, no failures/errors/skips); `testDebugUnitTest` and `assembleDebug` succeeded; Plaits WASM **185,441 bytes**, Beads WASM **196,401 bytes**; Beads native self-test `SELFTEST OK`; both embedded payloads passed `WebAssembly.compile`.
- **Artifacts inspected:** `eurorack-study-debug-apk` ID **14924359061**, ZIP **1,685,265 bytes**, SHA-256 `876bd64ad1be2e5bf340db8578501b85becad367047894e8383fc74fb69b826a`; internal APK **1,719,791 bytes**, SHA-256 `3f385b995c37905d4e703dcb6fc78cac12ea72560e4282a74efd5cfa211ac041`. APK inspection confirmed **46 assets** (42 DSP), `chopping_kinky_dsp.js` **2,945 bytes** (SHA-256 `88a9bac74e185e04621c85be4d9ec4cfcbfea0fe06bc1a4d854c9362ac0b8db8`), updated `index.html` **336,278 bytes** (SHA-256 `1f4cb5f82bc1dacf6ede9586b324a76b8bed5f0df3acae1cf845f2747819ca7a`), and `module_graph.js` **12,560 bytes** (SHA-256 `aafa499f931aa8ba09afdd6ef894acfed79b8d248a1e4d3d2f0aba3ac787a448`). The packaged HTML contains the CK scratch adapter, scheduler allowlist and dispatch. JUnit artifact ID **14923639481**, 9,907 bytes, SHA-256 `59acf478d46edee437ff1d974d3d074d1c6c6332b9f46acd33cbeb7fb91e9456`; both XML reports were inspected (9 + 4 tests, no failures/errors/skips). WASM log artifact ID **14923609345**, 1,381 bytes, SHA-256 `d9c243decff3b099c349c0fd05bc31c21eb6aaedf84a9a5aa7e743433bc2e687`; downloaded and inspected, confirms Plaits/Beads builds and `SELFTEST OK`.
- **Limitations/warnings:** no hardware calibration or physical CV/audio test; this remains a clean-room approximation rather than analog/firmware parity and does not claim oversampling parity. Non-fatal Plaits `PAGE_SIZE` and Actions/Node deprecation notices remain. Local Node/Gradle execution was not possible because the container could not resolve GitHub during clone; CI provides the validation evidence. No Android device installation or test is claimed.
- **License:** no VCV/Befaco code or proprietary panel artwork was reused/adapted in this migration.
- **Current scheduler inventory:** **19 processing module types** plus Audio Out — Voltio, Atte, Joystick, Motion MTR, Slew Limiter, Slew, ADSR, PerCall, MuDi, Iroi, Bandit, Hexmix VCA, Chopping Kinky, Dual Atenuverter, A*B+C V1, AxBC, Molten Bypass, Mixer2 and Mixer. Other catalogue modules remain on legacy execution until audited and migrated.
- **Repository protection after #129:** `main...feature/befaco-modules` is **660 commits ahead / 0 behind**, merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`; `main` unchanged, no merge or force-push. Phase 0 baseline remains corrected and recorded.
- **Next objective:** audit Even VCO waveform generation, pitch/FM/sync and PWM CV/state/reset before migrating its DSP to the scheduler.



## Even VCO — allocation-conscious topological scheduler migration (2026-11-25; CI validated #131)

- **Implemented:** the existing clean-room polyBLEP oscillator now exposes `processInto()` with a state-owned five-waveform `Float32Array`, reusable input scratch, frequency/pulse-width readouts, and `reset()` that clears oscillator state without replacing buffers. The legacy `process()` API still returns an independent output snapshot. Numeric UI switch values (0/1) and boolean test/API values are accepted.
- **Scheduler:** the engine adapter fills state-owned CV/gate scratch and dispatches Even VCO in the guarded topological scheduler; the UI admission set and engine admission guard are aligned. Legacy `step()` uses the same allocation-conscious adapter when the graph is not eligible for topological execution.
- **Implementation commits:** DSP/adapter integration `9cbe4c3974402d2136294ab1f30c9c4e9c8fa1bf`; corrected scheduler-inventory test `502dbf43eaf57d41440714145625d2a0bcff5033`.
- **Tested:** direct DSP tests, typed graph, topological chain and legacy fallback passed; the corrected Node suite reports **795/795**.
- **CI #130 correction history:** [run 45625195448](https://github.com/joaoevooluti-web/Moldgf/actions/runs/45625195448) initially failed at one stale Slew scheduler-inventory assertion (794/795 Node). The assertion was corrected in commit `502dbf43eaf57d41440714145625d2a0bcff5033`; no APK/WASM artifacts were produced by #130.
- **Validated in CI #131:** [run 45625464770](https://github.com/joaoevooluti-web/Moldgf/actions/runs/45625464770) **success**. Node **795/795**; Android JUnit **13/13** (9 MIDI decoder + 4 MIDI encoder, zero failures/errors/skips); Plaits WASM **185,441 bytes**; Beads WASM **196,401 bytes**; Beads native `SELFTEST OK`; both payloads passed `WebAssembly.compile`; Gradle `testDebugUnitTest` and `assembleDebug` succeeded.
- **APK artifact inspected:** `eurorack-study-debug-apk` ID **15027048546**, ZIP **1,685,596 bytes**, SHA-256 `340658a979dd5c549e4d9ee6a2ea7043bf5b66ef04fcc726b7d8c91df587774d`; internal APK **1,720,115 bytes**, SHA-256 `4633196f297e242436ac9c9ed4f0930a7151507d52efb45b9a806529503333fd`. ZIP inspection confirmed 46 assets (42 DSP), `even_vco_dsp.js` **3,199 bytes** (SHA-256 `2d4a0817d2666433e6e4ac38ce110fd5960366f246185bd50f12e28c878dc343`), `index.html` **336,274 bytes** (SHA-256 `dffe0d84b867d2321e62083d61ac876a42f1bda4c4f301ae5382172396745b25`), and `module_graph.js` **12,560 bytes** (SHA-256 `aafa499f931aa8ba09afdd6ef894acfed79b8d248a1e4d3d2f0aba3ac787a448`). The package contains the `processInto()` adapter and topological dispatch.
- **JUnit artifact:** ID **15027003629**, ZIP **9,873 bytes**, SHA-256 `27e0d5bdb6454a291de44778458e6b2723862e932f70af0b8d3ce97525be4f32`; downloaded and XML-inspected, 13 tests with zero failures/errors/skips.
- **WASM log artifact:** ID **15028256962**, ZIP metadata **1,379 bytes**, SHA-256 `bb509132648a7acfa111e25684aa230073d32e2c3d8658059cda3e0b86efbf9c`; downloaded and inspected.
- **Repository protection after #131:** `main...feature/befaco-modules` is **663 commits ahead / 0 behind**, merge base `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`; `main` unchanged, no merge or force-push.
- **Scheduler inventory:** 20 processing module types plus Audio Out, with Even VCO now admitted alongside the prior 19.
- **Pending fidelity:** waveform/pitch/FM/sync/PWM behavior is a clean-room polyBLEP approximation, without analog/firmware parity, oversampling parity, or physical calibration. No VCV/Befaco source or proprietary artwork was copied/adapted.

- **Next objective:** migrate PonyVCO to the guarded topological scheduler with reusable state, deterministic pitch/waveform/FM tests, typed graph connectivity and legacy fallback.
