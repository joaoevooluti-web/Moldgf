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
- [ ] Slew Limiter, Slew, ADSR, Percall, Burst, MuDi, and Sampling Modulator.
- [~] **Random8 — next batch module 1/5 (CI validated):** eight independently seeded 0–10 V CV generators with cascading trigger normaling, per-channel output attenuation and mode selection (random, loop, evolve, lock), loop capture up to 32 steps, eight random distributions, 15 quantizer choices including octave steps, probability, trigger division, slide and offset. Added the DSP helper with reusable output/readout buffers, eight typed trigger/CV endpoints, AudioWorklet/fallback engine dispatch, and an original 8 HP-inspired eight-column panel with per-channel edit controls. Sixteen DSP tests and five graph tests are authored; the actual Node runner and CI/APK gate are intentionally deferred until all five modules in this batch are integrated. This is a clean-room behavioral model based on Befaco's published Random8 documentation, not its firmware.
- [~] **MEX — next batch module 2/5 (CI validated):** 4 HP eight-step gate expander for Muxlicer. Each step has three modes matching the manual: PASS IN (thresholded Gate In signal), NO GATES, or ALL GATES (copies that step's Muxlicer gate output, including its gate count). Gate In accepts audio/CV/gate signals and defaults to the selected Muxlicer's Clock Out when unpatched. Added DSP, typed Gate In/Gate Out ports, a selectable internal Muxlicer host link, and an original 4 HP-inspired panel with eight three-position switches and live output status. Ten DSP tests and five graph tests are authored; actual Node execution and CI/APK validation remain deferred until all five next-batch modules are integrated. Daisy-chain expansion through the rear THRU connector is not yet modeled.
- [~] **Muxlicer — module 5/5:** eight-step sequential signal processor with MUX/DEMUX routing, eight step levels, selectable 0–5 V / 0–10 V / ±5 V sequencer CV, internal BPM and external falling-edge clock, clock division/multiplication, address CV, play/stop/reset/one-shot/tap-tempo controls, gate modes from sustained/half-step to eight retriggers, eight per-step gate outputs, ALL GATES and EOC. Added a 16 HP-inspired panel with eight vertical faders, transport, clock/address/gate controls, mode-dependent step-jack groups and distinct audio/CV endpoints. Twenty DSP tests and six graph tests passed in the local V8 harness. Because the graph model has unidirectional typed ports, each physical bidirectional MUX I/O is represented by separate input and output endpoints; the panel shows the matching endpoint set for MUX or DEMUX mode. This is a clean-room digital model; Node tests and Android build passed in workflow #22; physical-device validation remains pending.
- [~] **Rampage — first module in the five-module gate:** dual rise/fall function generators with one-shot/cycle operation, trigger/manual retrigger, external-signal slew processing, CV control of rise/fall/EXP, three time ranges, nonlinear shape, rising/falling slope gates, one-shot/cycle EOC pulses, and balanced B>A/MIN/MAX logic. Added dedicated 18 HP-inspired original Moldgf faceplate, persisted controls, engine processing, typed audio/CV/gate graph ports, and live stage/voltage readouts. Fourteen DSP tests and five graph tests were executed in the local V8 validation harness; the Node tests and consolidated CI/APK passed in workflow #22; physical-device validation remains pending. This is a documented-behavior JS model, not a transistor-level analog clone.
- [ ] Validate gate edge handling, clock accuracy, retrigger behavior, deterministic seeded random tests, and expander synchronization.

### Phase 4 — Oscillators, voices, and noise
- [ ] Even VCO and PonyVCO.
- [~] **Octaves VCO — next batch module 3/5 (CI validated):** 12 HP six-octave additive pulse oscillator. Implemented two summed 1 V/oct pitch inputs, tune/range controls (full, octave, semitone), base-octave selector, hard-sync reset, symmetrical shared PWM with attenuated CV, six level VCAs with level-CV attenuation, and six cascaded multi-mix outputs that split at patched jacks. Added a clean-room band-limited pulse DSP using polyBLEP edge correction, typed pitch/sync/PWM/level CV and six audio outputs, plus an original 12 HP-inspired panel with six octave strips and all controls/jacks. Fifteen DSP tests and five graph tests are authored; actual Node execution and CI/APK validation remain deferred until the five-module batch is complete. The model is not a transistor-level recreation of the triangle/comparator core.
- [~] **Kickall — module 3/5:** 6 HP kick voice with stable sine oscillator, V/Oct tune tracking (0–10 V input, ten-octave span), sine-to-square waveshaper and shape CV, independent pitch and volume envelopes, pitch Time/Bend controls, Decay control with ±10 V CV, general post-envelope VCA with 0–10 V normalled Volume input, 3.5 V trigger edge and manual trigger. Added original hardware-layout-inspired panel with Tune/Shape/Time/Bend controls, manual trigger, vertical Decay fader, all six documented jacks, engine state and typed graph integration. Fifteen DSP tests and five graph tests passed in the local V8 harness. This is a clean-room digital drum-voice approximation, not analog circuit emulation; Node tests and Android build passed in workflow #22; physical-device audio remains pending.
- [~] **Noise Plethora — module 4/5:** three independent generators; A/B expose three banks of ten program slots each with separate X/Y controls, program CV selection and LP/BP/HP multimode filters with cutoff CV attenuators and resonance; C provides independent White and Gritty outputs plus a selectable-source filtered output, grit quantity CV and a cascaded 24 dB-style filter. Added a clean-room 30-program algorithm set derived from published program descriptions, seeded deterministic noise sources, preallocated oscillator/walker/delay/filter state, typed CV/audio ports, persisted controls and a dedicated 14 HP-inspired three-column panel with bank/program displays and A/B selection. Fourteen DSP tests and five graph tests passed in the local V8 harness. This is not a bit-exact reproduction of Befaco firmware or analog filters; Node tests and Android build passed in workflow #22; physical audio remains pending. Official firmware/plugin repositories have separate CC BY-NC-SA / CC BY-SA terms; no firmware source code was copied into this implementation.
- [ ] Validate pitch tracking, anti-aliasing, FM behavior, waveform levels, envelope response, and CPU cost.

### Phase 5 — Effects and spectral processing
- [ ] Chopping Kinky and Stereo Strip.
- [ ] Validate stability, denormals, parameter smoothing, stereo image, tail handling, and CPU/memory budgets.
- [~] **Bandit — next batch module 5/5 (CI validated):** 8 HP four-band spectral processor with ALL AUDIO IN normalled to the four band inputs, ALL CV summed with each band CV, fixed low-pass shelf (300 Hz), mid-low and mid-high band-pass peaks (700 Hz / 1.5 kHz), and high-pass shelf (5 kHz), each followed by an independently controlled VCA. Individual band outputs break their bands out of MIX OUT; four post-filter RETURN inputs are summed back in, and the final mix uses a soft clip limiter with peak/clipping meter. Added preallocated biquad DSP, typed audio/CV ports, patch-aware break-out routing, four fader/CV channels and an original 8 HP-inspired panel. Eighteen DSP tests and five graph tests are authored; final Node/CI/APK validation will run only after auditing all five modules and integration tests. The filter bank is a clean-room approximation of the published frequency bands, not a circuit-level model.
- [~] **IROI — next batch module 4/5 (CI validated):** 18 HP stereo effects processor with normalized L input to R, four filter modes (LP/BP/HP/comb), VCA/filter block movable to four chain positions, three-band resonator with feedback and shift-page dissonance, two-tap ping-pong echo (10 ms–6 s) with sync/divider behavior and tone control, and Schroeder-style ambience/reverb with space, decay and direction. Implemented two independent mono signal paths as a stereo pair of graph jacks (L/R), eight CV inputs for VCA/dry-wet and mapped parameters, sync and random gates, seven modulation sources/waves, MAP arming and target selection, SHIFT secondary controls, randomizer with undo/redo, peak meter and sample-rate-aware preallocated buffers. Added an original 18 HP-inspired panel and 19 DSP plus five graph tests. The host still models L/R as separate scalar ports, not a native two-channel bus; actual Node/CI/APK and device validation are deferred until all five modules are integrated. The effect algorithms are clean-room approximations, not the original OWL firmware.- [~] **Spring Reverb — module 2/5:** two independent CV-controlled input VCAs, IN1 dry plus tank routing, IN2 tank-only routing, +10 V CV normaling, additive MIX CV, HPF before the tank, independent WET and DRY/WET MIX outputs, input/wet peak meters, and an 8 HP-inspired original Moldgf panel with vertical faders, rotary HPF/MIX controls, CV jacks and meters. Added a preallocated delay/comb/allpass spring-style tank model, sample-rate-aware state, typed audio/CV graph ports, and persisted controls. Eleven DSP tests and five graph tests execute in the local V8 validation harness. This is a digital spring-style approximation, not a physical tank or circuit-level emulation; Node tests and CI/APK passed in workflow #22; physical-device audio remains pending.

### Phase 6 — MIDI, UI, and release validation
- [ ] MIDI Thing V2 integration with the existing Android MIDI service.
- [ ] Complete patch save/load, UI accessibility, touch interaction, automation, and preset coverage.
- [ ] Run CI, install/build verification, audio graph regression suite, and target-device performance tests.

## Phase 7 — MIDI, mixers, filters, and stereo channel strips

The next five-module batch has been selected after auditing the official Befaco catalog and confirming all five are absent from the current 32 DSP assets and 32 module registry entries:

1. **MIDI Thing V2** — 6 HP, 12 assignable CV/gate ports, polyphonic voice allocation, note CV/glide/gate/velocity, ADSR, oscillator, LFO, MIDI clock, merge/routing and configuration UI. Integrate with the existing Android MIDI service; model its 12 configurable outputs as typed graph ports. Official resources: https://www.befaco.org/midi-thing-v2/ and https://befaco.org/docs/Midi_thing_V2/Midi%20Thing%20V2_User_Manual_v1.2.pdf.
2. **Hexmix** — 28 HP six-channel performance mixer, per-channel three-band EQ, volume, vactrol-style latch/momentary mute and constant-power pan, plus master EQ/level and stereo output. Official resources: https://www.befaco.org/hexmix/ and https://befaco.org/docs/Hexmix/Hex_Mix_System_User_Manual.pdf.
3. **Hexpander** — 28 HP Hexmix expansion: three aux sends per channel, stereo returns, pre/post fader/EQ send paths, PFL/cue monitor, direct post-EQ channel outputs, master and headphone outputs. Model its host dependency as an internal expansion link to Hexmix; do not require physical expansion hardware. Official resources: https://www.befaco.org/hexpander/ and https://befaco.org/docs/Hexpander/Hex_Mix_System_User_Manual.pdf.
4. **Pony VCF** — 6 HP four-pole 24 dB/oct low-pass filter, three-input attenuated mixer with output-to-input-3 feedback normaling, resonance/Q CV, two cutoff CVs, CV1 routing to cutoff or cutoff+VCA, and volume CV with 10 V/CV1 normalization. Official resources: https://www.befaco.org/pony-vcf/ and https://www.befaco.org/docs/Pony_VCF/Pony_VCF_User_Manual.pdf.
5. **DivKid Stereo Strip** — 6 HP stereo/mono channel strip with low-shelf/mid-bell/high-shelf EQ, constant-power pan and pan CV attenuator, stereo VCA and level CV, on/off/momentary mute, Eurorack/line input-output level switches and soft-clipping limiter. Keep L/R as separate scalar graph ports until the engine has a native stereo bus. Official resources: https://www.befaco.org/stereo-strip/ and https://befaco.org/docs/stereo_strip/Stereo_Strip_manual.pdf.

Implementation order is Hexmix, Hexpander (after its host), Pony VCF, Stereo Strip, then MIDI Thing V2. Hexmix is now the first module in this batch: its six-channel DSP, stereo graph, VCA-expander normalization, panel and dedicated tests are in place; Node/CI validation is deferred until all five modules are complete.

- [~] **Hexmix — next batch module 1/5:** six-channel three-band EQ mixer with vactrol-style latch/momentary mute, constant-power pan, master EQ/level, modular/line output selection and optional Hexmix VCA host normalization. DSP, 28 HP-inspired six-strip panel, stereo graph outputs and 19 DSP + five graph tests are in place. Momentary mute is modeled as a short one-shot gate rather than a held pointer switch; CI is deferred until the batch is complete.
- [~] **Hexpander — next batch module 2/5:** internal Hexmix expansion with three pre/post aux buses, three stereo returns, six post-fader/EQ direct outs, PFL cue sum, monitor crossfade, headphone volume and balanced line-level main outputs. DSP, 28 HP-inspired panel, internal Hexmix host link, typed return/send/direct/main/headphone ports and 15 DSP + five graph tests are in place; CI is deferred until the batch is complete.
- [~] **Pony VCF — next batch module 3/5:** 6 HP four-pole 24 dB/oct low-pass ladder approximation with nonlinear feedback/resonance compensation, three-channel attenuated mixer, output-normalled feedback into IN3, CV1/CV2 cutoff modulation, resonance CV, CV1-to-VCA/10 V-normal mode switch and external volume-CV override. Added sample-rate-aware DSP, peak/saturation meter, original 6 HP-inspired panel, typed audio/CV graph ports and 17 DSP + five graph tests. The SSI2144 enhanced-ladder circuit and temperature compensation are not reproduced at component level; CI is deferred until the five-module batch is complete.
- [~] **DivKid Stereo Strip — next batch module 4/5:** 6 HP mono/stereo channel strip with L-to-R mono normaling, low-shelf/mid-bell/high-shelf EQ (±12 dB), constant-power mono pan and stereo balance, audio-rate pan CV with attenuator, 5 V-unity VCA with smoothed level CV, three-position on/off/momentary mute, Eurorack/line input boost and output attenuation, and soft-clipping output protection. Added two independent EQ/VCA states, stereo scalar graph pair, sample-rate-aware DSP, original 6 HP-inspired panel and 18 DSP + five graph tests. The momentary switch is currently a 120 ms one-shot approximation rather than pointer-held hardware behavior; CI is deferred until MIDI Thing V2 completes. Preserve the main branch and do not start another workflow until all five modules are implemented and their automated DSP/graph/UI tests are authored.


## Licensing and provenance

The VCVRack/Befaco repository identifies its plugin as GPL-3.0-or-later. If Moldgf copies or adapts that source, preserve copyright and license notices, provide the corresponding source and GPL obligations for distributed derivative work, and review all bundled dependencies and assets individually. A clean-room implementation based on published behavior/specifications may have a different provenance; obtain legal review before distribution if licensing is uncertain.

## Current status — 2026-11-09

- Working boundary: all changes are confined to `feature/befaco-modules`; `main` remains untouched (last verified SHA `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`).
- Build gate: five additional modules (Rampage, Spring Reverb, Kickall, Noise Plethora and Muxlicer) are integrated and CI-validated.
- **Second five-module implementation gate is CI-validated:** Random8, MEX, Octaves VCO, IROI and Bandit each have a DSP asset, AudioWorklet/ScriptProcessor dispatch, dedicated hardware-inspired panel, typed graph descriptor, persisted parameters and module-specific DSP/graph tests. Workflow #25 (`42588983012`) succeeded on commit `ea7a21f98b597d027a0941aae748d13fc9090e59`: **418/418 Node tests passed**, Plaits and Beads produced real WASM payloads (185,636 and 196,726 bytes), Gradle `assembleDebug` succeeded, APK artifact `13661065670` uploaded, and both WASM wrappers passed `WebAssembly.compile`. The batch contributes 105 module-specific DSP/graph tests plus five panel/integration assertions; 32 DSP assets and 32 registered graph module types are present. IROI uses two independent mono paths as L/R, MEX rear THRU daisy chaining is not modeled, and all five are clean-room behavioral approximations. Workflow #22 (`42557029992`) completed successfully on the final code commit; Node tests, Plaits/Beads WASM validation, Gradle APK build, artifact upload and the final WebAssembly.compile checks passed. Interim documentation commits use `[skip ci]`.
- Source extraction: [workflow 42537553688](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537553688) succeeded; extracted tree is committed under `source/` at `c673d68296a3308482c66f02cc4507aad32bd9d2`.
- Baseline APK: [workflow 42537612041](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42537612041) completed with `success` on commit `712383976ff952f0aa83312fd6b5d12d7b5b5339`. Emscripten setup, Plaits/Beads WASM build step, Gradle `assembleDebug`, and APK upload all passed. The graph-contract change is undergoing a fresh full APK build in [workflow 42539116720](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539116720); its 6 Node graph tests have passed.
- Published artifact: `eurorack-study-debug-apk`, artifact ID `13640156829`, 1,262,191 bytes, SHA-256 `8664bd134566e44435993bfa9c7586fc499fcef9846c684b48cbd87ac6709e56`; GitHub retention through 2027-02-06. This proves CI packaging only, not installation or audio validation on a device.
- Existing engine audit: the 129 KB `index.html` embeds the engine, has AudioWorklet and ScriptProcessor fallback, a string-keyed signal store, summed input lookup, cable list, and hard-coded `step()` processing order. Current module registration and UI are distributed across `INIT`, `INITR`, `byT`, `mkInst`, `idxE`, `step`, `TY`, and handlers.
- Existing rack types: MIDI→CV, Pamela PRO, Scales, Plaits, Mixer 4→2, Axon-2, PPEXP1, PPEXP2, Polaris, CV→MIDI, BBD, Beads, and Audio Out. Befaco Atte is implemented; Dual Atenuverter is now integrated in the feature branch but awaits batch validation. The remaining catalogue modules are not yet ported.
- The new graph contract validates live jack endpoints and output-to-input direction. Legacy ports are mapped to the engine's actual mono channel model and permissive signal compatibility; typed audio/CV/gate semantics and cycle scheduling will be enabled module-by-module.
- Befaco Atte is implemented in the rack and audio engine: four independent attenuator/inverter channels, cascaded input normaling, hardware-faithful fixed +10 V first-channel normal in the UI, per-channel gain/polarity controls, independent outputs, live polarity LEDs, and voltage readouts. The DSP helper retains its selectable normaling function for legacy-state compatibility, but the panel no longer exposes non-hardware +1/+5 V options. Five dedicated DSP tests and the inline WebView/AudioWorklet syntax test passed in workflow [42539523295](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295); the debug APK artifact is [13641045420](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539523295). Workflow [42539485722](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722) also succeeded and published APK artifact [13641021006](https://github.com/joaoevooluti-web/Moldgf/actions/runs/42539485722). These runs validate CI packaging, not installation/audio on a physical device. The engine currently processes mono signals, so polyphonic parity remains future work.
- The five-module batch beyond Atte is implemented: Dual Atenuverter, Voltio, A*B+C (ABC), AxBC and Molten Bypass. Their DSP and graph tests are prepared: Dual Atenuverter (5 DSP + 3 graph), Voltio (4 + 3), ABC (6 + 2), AxBC (6 + 3), and Bypass (8 + 3). The local synchronous harness executed all 55 DSP/graph tests successfully; all inline scripts and six DSP files pass V8 syntax compilation. The inline-script CI test now asserts all six DSP assets and six registered module types, and both syntax/integration assertions pass in local V8 validation. Initial five-module CI validation succeeded in GitHub Actions run #9 at commit 46ae7aa2966582c7599b54fbce78263ca8324a0a. All jobs/steps passed: module graph and DSP Node tests, Emscripten/WASM build for Plaits and Beads, Gradle debug APK assembly, and APK upload. Published artifact: eurorack-study-debug-apk, artifact ID 13641392734. This run validated Atte plus Dual Atenuverter, Voltio, ABC, AxBC and Bypass; the 15 modules ported afterward still require a fresh consolidated CI/APK run. Physical-device/audio validation remains outstanding. The AudioWorklet bundle now loads twenty DSP files (Atte, Dual Atenuverter, Voltio, ABC, AxBC, Bypass, Mixer2, Mixer, STMix, Morphader, Hexmix VCA, Motion MTR, Slew Limiter, Slew, Pony VCO, ADSR, Percall, MuDi, Burst and Sampling Modulator); readouts use published audio-graph signals. Mixer2, Mixer, STMix, Morphader, Hexmix VCA, Motion MTR and Slew Limiter are integrated after the initial five-module batch, with dedicated DSP/graph tests and local syntax/direct-DSP checks. Across the current branch there are 194 Node tests authored. A local synchronous harness has executed all 192 DSP/graph tests successfully (initial batch 55, subsequent modules 137), and both inline-script/asset integration tests pass; both inline scripts compile in V8. The actual Node runner, Emscripten/WASM and APK packaging for the current 21-module branch still await the next consolidated GitHub Actions run. Pony VCO intentionally uses polyBLEP rather than the original VCV 12× oversampling pipeline; the difference is recorded as a fidelity limitation.
- Android host uses WebViewAssetLoader, Android MIDI APIs, SharedPreferences bridge, and document picker. Plaits and Beads have optional WASM builds with JS fallbacks; Beads also has a native self-test in the build script.

## Immediate next steps

1. **First five-module gate remains validated:** Rampage, Spring Reverb, Kickall, Noise Plethora and Muxlicer passed workflow #22.
2. **Second five-module gate also passed:** Random8, MEX, Octaves VCO, IROI and Bandit passed workflow #25 with 418/418 Node tests, real Plaits/Beads WASM, Gradle APK and payload verification.
3. Continue on `feature/befaco-modules` only; `main` remains untouched. Audit the current official catalog and asset/registry inventory to choose five further distinct modules, without duplicating existing ports.
4. Preserve documented limitations: IROI stereo is two independent mono paths, MEX rear THRU daisy chaining is not modeled, and the five new DSP implementations are clean-room approximations rather than circuit/firmware clones.
5. Defer the next CI/APK workflow until five more distinct modules have DSP, panels, graph integration and automated tests. Physical-device audio/touch validation remains outstanding.

## Repository audit — 2026-11-09

- Last code commit validated by workflow #22: `c24cf7f07acdf193f4322cd1374b309b6294f811`. The current branch HEAD `ea7a21f98b597d027a0941aae748d13fc9090e59` includes the final source documentation trigger for workflow #25.
- Compared against protected main baseline `8e81fcb36fb1bedbf63019b6ee5d890f694fb165`: feature branch is 353 commits ahead, 0 behind. `main` remains exactly at the baseline SHA (0 ahead, 0 behind); no changes were made to `main`.
- The current `source/app/src/main/assets/index.html` already registers and processes **Even VCO** and **Chopping Kinky**, each with a dedicated DSP asset and DSP/graph tests. They must not be counted as unported or reimplemented.
- The current assets include the following additional module implementations beyond the first batch: Mixer2, Mixer, STMix, Morphader, Hexmix VCA, Motion MTR, Slew Limiter, Slew, Pony VCO, ADSR, Percall, MuDi, Burst, Sampling Modulator, Chopping Kinky, and Even VCO. The roadmap's earlier count of 21 modules needs a separate inventory reconciliation before the next release gate.
- Rampage implementation is committed on `feature/befaco-modules` across commits `fd59eee8` (DSP/test foundation), `13a7eb32` (engine/panel/graph integration), and subsequent DSP/UI/test corrections through `7a1d5add`. The current files are `source/app/src/main/assets/rampage_dsp.js`, `source/tests/rampage_dsp.test.cjs`, `source/tests/rampage_graph.test.cjs`, and the integrated `index.html`.
- Local V8 validation compiled the AudioWorklet engine, rack UI, and Rampage DSP; it executed all 19 authored Rampage DSP/graph test cases successfully. This is not a claim that `node --test`, Android packaging, or hardware audio validation has passed.
- Spring Reverb implementation is committed on `feature/befaco-modules` across DSP, test, engine/UI and follow-up panel commits, ending with `d2f7b988`. The current files are `source/app/src/main/assets/spring_reverb_dsp.js`, `source/tests/spring_reverb_dsp.test.cjs`, `source/tests/spring_reverb_graph.test.cjs`, and the integrated `index.html`.
- Local V8 validation compiled the AudioWorklet engine, rack UI, and both new DSP assets; it executed all 35 authored DSP/graph test cases across Rampage and Spring Reverb successfully (Rampage 14 DSP + 5 graph; Spring Reverb 11 DSP + 5 graph). The actual `node --test` runner, Android packaging, and hardware audio validation remain unverified and are deferred until the five-module gate.
- Kickall implementation is committed on `feature/befaco-modules` in `source/app/src/main/assets/kickall_dsp.js`, `source/tests/kickall_dsp.test.cjs`, `source/tests/kickall_graph.test.cjs`, and the integrated `index.html`; the integration includes the DSP script, persisted controls, audio-engine processor, typed graph ports, manual trigger handler, rack menu entry and original 6 HP-inspired panel layout.
- Local V8 validation compiled the AudioWorklet engine, rack UI and all three new DSP assets, and executed all 55 authored DSP/graph test cases successfully: Rampage 14 DSP + 5 graph, Spring Reverb 11 DSP + 5 graph, Kickall 15 DSP + 5 graph. This does not claim the actual Node test runner, Android packaging, or physical-device audio has passed; those remain deferred until the five-module gate.
- Noise Plethora is committed in `source/app/src/main/assets/noise_plethora_dsp.js`, `source/tests/noise_plethora_dsp.test.cjs`, `source/tests/noise_plethora_graph.test.cjs`, and the integrated `index.html`. It adds three generator paths, thirty named A/B program slots in three banks, X/Y and program CV, three multimode filter paths, the independent C white/gritty/filtered outputs, and 14 HP-inspired panel controls/ports. The DSP is a clean-room JS approximation based on published manual behavior; it does not copy the official firmware or claim bit-exact algorithm parity.
- Local V8 validation compiled the AudioWorklet engine, rack UI and all four new DSP assets, and executed all 74 authored DSP/graph cases successfully: Rampage 14+5, Spring Reverb 11+5, Kickall 15+5, Noise Plethora 14+5. Actual `node --test`, Android packaging and physical-device audio remain deferred until Muxlicer completes and the five-module gate opens.
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
- [ ] Execute the expanded Node suite and inspect the panels on Android WebView in the next approved consolidated build. The test file has been committed but not executed in this turn.
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

- [x] **MIDI Thing V2 — module 5/5:** 12 assignable CV/gate output ports; per-port function/channel/voice/CC mapping; global MIDI channel filter; up to 12 voices with LAST/LOW/HIGH/NO STEAL allocation; V/Oct note CV; gate, velocity, CC, pitch bend, channel pressure, program change, MIDI clock, start/stop, ADSR, note oscillator, LFO, RPN and NRPN; sustain pedal; linear/exponential glide; global 0–5 V / ±5 V / 0–10 V output range; NEW VOICE macro (NOTE CV / VELOCITY / GATE); ALL NOTES OFF. Added Android MIDI input dispatch through the existing `window.midiIn` / AudioWorklet message path, persistent port configuration, 6 HP-inspired panel with 12 output jacks and per-port function controls, typed graph descriptor, 28 DSP tests, five graph tests, and static panel/engine integration assertions. The oscillator pitch is precomputed per note and glide coefficients are cached to reduce per-sample CPU.
- The implementation uses the Android MIDI service's existing input endpoints; physical TRS sockets, USB-host power/role negotiation, and hardware MIDI-merge routing are not emulated. The 12 outputs are statically typed as CV graph endpoints so they can feed CV destinations and destinations that explicitly accept CV as gate/audio input. This is a clean-room digital mapping implementation, not firmware-level reproduction.
- [x] Five-module gate is complete: Hexmix (18 DSP + 5 graph), Hexpander (15 + 5), Pony VCF (17 + 5), Stereo Strip (18 + 5), MIDI Thing V2 (26 + 5). Total: **97 DSP tests + 25 graph tests**, plus rack inline-script, registry, asset and hardware-panel assertions. The test suite is now eligible for the first consolidated Node/WASM/Android APK run for this batch.
- [ ] Run the actual `node --test tests/*.test.cjs` suite, build/validate Plaits and Beads WASM, assemble the Android debug APK, inspect the artifact and logs. Fix any failures with interim commits marked `[skip ci]`; do not claim validation until the workflow reports success.
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
