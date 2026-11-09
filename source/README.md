# Eurorack Study Rack (Android)
Rack modular de estudo: Pamela's PRO Workout (+ Axon-2, PPEXP1/2), Intellijel Scales, Mutable Plaits, **Intellijel Polaris**, **Erica Synths EDU DIY BBD**, **Mutable Beads**, Mixer, **Audio Out**, MIDI→CV e **CV→MIDI**.

- Interface e motor: `app/src/main/assets/index.html` (motor em AudioWorklet, thread de áudio própria).
- **Befaco Random8 (branch `feature/befaco-modules`, próximo lote em andamento):** oito saídas CV independentes de 0–10 V, triggers normalizados em cascata, looping/evolução/lock, quantização, distribuição, probabilidade, divisor de trigger, slide e offset. A integração e os testes automatizados estão sendo preparados; a validação Node/CI/APK aguarda o fechamento dos cinco módulos do lote. Referência de comportamento: [manual e recursos oficiais Random8](https://www.befaco.org/random8/).
- **Befaco MEX (branch `feature/befaco-modules`, próximo lote em andamento):** expansor de oito etapas para Muxlicer com modos PASS IN, NO GATES e ALL GATES por etapa, Gate In com normalização para Clock Out e seletor de host interno. DSP, painel e testes estão preparados; a cadeia traseira THRU ainda não foi modelada e a validação Node/CI aguarda os cinco módulos do lote.
- **Befaco Octaves VCO (branch `feature/befaco-modules`, próximo lote em andamento):** oscilador aditivo de seis oitavas com dois V/Oct somados, hard sync, PWM e CV, seis VCAs por nível e seis saídas com normalização de mix em cascata. DSP com correção polyBLEP, painel e testes preparados; validação Node/CI aguarda o fechamento do lote.
- **Befaco IROI (branch `feature/befaco-modules`, próximo lote em andamento):** efeitos estéreo com filtro multimodo, VCA, ressonador de três bandas, echo ping-pong de dois taps e reverb, além de modulação mapeável, CV, sync e randomizer com undo/redo. O DSP mantém dois caminhos mono independentes como par L/R; não representa um barramento estéreo nativo do motor. Validação Node/CI aguarda o fechamento do lote.
- **Befaco Bandit (branch `feature/befaco-modules`, próximo lote em andamento):** processador espectral de quatro bandas com filtros LP/BP/BP/HP, VCAs por banda, entradas de áudio/CV normalizadas, saídas individuais com break-out, quatro retornos e MIX OUT com soft clip/medidor. DSP, painel e testes preparados; validação Node/CI/APK aguarda auditoria final do lote.
- **Polaris:** filtro multimodo de 4 estágios (26 tipos no MULTI + saídas LP/BP/HP), phaser, drive com clip, MULTI DISTORT, FM1 (1 V/oit) e FM2.
  Os coeficientes de cada tipo foram ajustados às curvas do PDF `polaris_frequency-responses` (erro ~0,3 dB); a ressonância de 90% do PDF corresponde a k=3,25.
- **Audio Out:** única saída para o alto-falante. O Mixer só mistura (saídas L/R em jacks) e não toca sozinho: ligue `Mixer L/R → Audio Out L/R`.
  Só L ligado = mono nos dois lados; vários Audio Out se somam. Racks salvos antes disso (autosave e Patches) são migrados com um Audio Out ligado a todos os mixers.
- **BBD (mki x es.EDU):** delay de linha de balde (chip V3205, 4096 estágios) com clock de CD4046. O anel avança no domínio do clock, então mexer no TIME re-afina o que já está no chip.
  TIME + TIME CV somam como no circuito, RANGE LONG (1 nF) / SHORT (220 pF), INHIBIT congela o clock (efeito de stutter), saídas WET e MIX, FEEDBACK até auto-oscilação.
  Atraso = estágios / clock (convenção do manual: 220 pF → 4–112 kHz → ~1 s a ~35 ms); no editor dá para trocar para 2048 (N/2f do datasheet).
  O clock do chip roda a 4× a taxa de áudio com filtros polifásicos (espúrios < −55 dB em clock alto). Em clock baixo o "crunch" é o sample&hold sem filtro do módulo real; o editor tem **Saída: Suave** para filtrar essas imagens.
- **Beads:** o painel segue a foto do módulo. O motor tem **duas versões**:
  1. **Original (WebAssembly):** compilado no CI a partir do firmware real da Mutable (`pichenettes/eurorack/beads`, MIT) por `native/beads_wrap.cc`.
     Usa as 4 mídias do firmware (fita suja 24 kHz, fita limpa, digital vintage 32 kHz, digital), modo wavetable, delay, reverb e leis dos knobs/escala dos CVs originais.
     Até 2 instâncias, blocos de 32 amostras. O editor do módulo mostra `motor ORIGINAL (WASM)` quando está ativo.
  2. **Aproximado (JS):** reimplementação a partir do manual, usada quando o WASM não está disponível (ou a partir do 3º Beads).
  O CI roda um **autoteste nativo** do Beads com g++ antes de gerar o `.wasm`; o log fica no artefato `wasm-log`.
- **CV→MIDI:** V/OCT + GATE viram note on/off (0 V = C4), VEL por CV, 4 entradas CC (0–127). Só envia com o áudio ligado.
  No Android o MIDI sai (a) para todos os dispositivos/apps conectados e (b) pela porta virtual **"Rack MIDI"** (outros apps a enxergam como dispositivo).
- **Reordenar módulos:** segure a alça ⠿ do cabeçalho e arraste; a tela rola sozinha nas bordas, os cabos acompanham e a ordem é salva no patch.
- **Presets e patches:** botão 💾 em cada módulo (presets do usuário + de fábrica), botão **Patches** (rack inteiro), salvamento automático do patch,
  exportar/importar `.json` (seletor de arquivos do Android) e backup completo. Os dados ficam em SharedPreferences (ponte `Native`).
- Ponte nativa: `MainActivity.kt` (MIDI entrada/saída, armazenamento, arquivos), `EurorackMidiService.kt` (porta virtual), `MidiParser.kt`.
- **Plaits original:** (o script agora clona com submódulos: antes o `stmlib` ficava vazio e o WASM não compilava) o workflow `.github/workflows/android.yml` clona https://github.com/pichenettes/eurorack (MIT, (c) Emilie Gillet),
  compila o DSP real do Plaits para WebAssembly (`native/plaits_wrap.cc` + `native/build_wasm.sh`) e o inclui no APK.
  Se essa etapa falhar, o app continua funcionando com uma aproximação em JS. O log fica no artefato `plaits-wasm-log`.
- Build: suba esta pasta num repositório GitHub (branch main) → **Actions** → "Build APK" → baixe `eurorack-study-debug-apk`.


## Befaco implementation batch — 2026-11-09

The feature/befaco-modules branch now includes five additional clean-room module ports with dedicated DSP assets, rack panels, persisted controls, typed graph endpoints, and DSP/graph regression tests:

- **Rampage** — dual rise/fall function generators, one-shot/cycle, trigger/retrigger, slew processing, slope gates, EOC and B>A/MIN/MAX logic.
- **Spring Reverb** — dual CV-controlled tank sends, IN1 dry path, IN2 tank-only path, HPF, WET and MIX outputs, meters. The spring tank is a digital delay/comb/allpass approximation, not a physical spring model.
- **Kickall** — V/Oct sine voice, sine-to-square waveshaping, pitch/volume envelopes, CV-controlled decay/shape/volume and trigger. This is a digital drum-voice approximation, not analog circuit emulation.
- **Noise Plethora** — three generators, thirty A/B program slots across three banks, X/Y/program CV, multimode filters, and independent white/gritty/filtered C outputs. Algorithms are clean-room approximations based on published program descriptions, not bit-exact firmware ports.
- **Muxlicer** — eight-step sequencer, MUX/DEMUX signal routing, CV ranges, internal/external clock, address, one-shot, gate modes, eight gate outputs, ALL GATES and EOC. The graph represents physical bidirectional step jacks with separate input and output endpoints because the current graph contract is unidirectional.

The current engine is mono. These ports do not claim stereo or polyphonic parity, transistor-level emulation, or physical-device audio validation.

### Validation

The five modules add 100 authored DSP/graph test cases (Rampage 19, Spring Reverb 16, Kickall 20, Noise Plethora 19, Muxlicer 26). A local V8 harness compiled the AudioWorklet engine, rack UI and all five DSP assets and executed all 100 test callbacks. This is not a substitute for the repository's Node test runner. The next consolidated workflow runs:

\`\`\`sh
node --test tests/*.test.cjs
gradle assembleDebug --no-daemon
\`\`\`

Workflow #22 (run 42557029992) completed successfully on code commit c24cf7f07acdf193f4322cd1374b309b6294f811: the repository Node suite passed 308/308, Plaits and Beads generated real WebAssembly payloads (185,636 and 196,726 bytes), Beads native selftests passed, the final CI step validated both payloads with WebAssembly.compile, and Gradle produced the debug APK. The APK SHA-256 is 217e71cf119ae417b7d0fb2abfb603f991f8cbd5f070035afb98d410302bbbb1. Physical-device audio/UI testing remains pending.

### Befaco port status — 2026-11-09

The second five-module implementation batch is now complete on `feature/befaco-modules`: Random8, MEX, Octaves VCO, IROI and Bandit. Each module has a DSP asset, engine dispatch, dedicated front panel, typed graph descriptor and dedicated tests. The batch adds **105 DSP/graph test cases** and five static panel/integration assertions; the page now loads 32 DSP assets and registers 32 graph module types.

The consolidated gate passed in GitHub Actions workflow #25 (`42588983012`) on commit `ea7a21f98b597d027a0941aae748d13fc9090e59`: **418/418 Node tests passed**, Plaits and Beads generated valid WebAssembly payloads (185,636 and 196,726 bytes), Gradle `assembleDebug` succeeded, artifact `eurorack-study-debug-apk` (`13661065670`) was uploaded, and the final `WebAssembly.compile` checks passed. No physical-device audio or touch validation is claimed.

Known limitations: IROI exposes left/right as two independent mono paths rather than a native stereo bus; MEX's rear THRU daisy-chain expander is not modeled. The new DSP algorithms are clean-room behavioral approximations, not firmware or circuit-level clones. All work remains on `feature/befaco-modules`; `main` is protected.
CI rerun note: workflow #23 exposed five test issues (signed-zero assertions, stale uniqueness counts, and literal escaped newlines in two test files). Those test-only defects have been corrected; this source documentation update triggers the next consolidated Node/WASM/APK validation. No production module behavior was changed by these test fixes.
Second CI rerun note: workflow #24 executed all 418 test entries and passed 415; three remaining assertions exposed an IROI cutoff-saturation test setup and two Octaves V/Oct/Nyquist test assumptions. The DSP now preserves the full core V/Oct range while muting octave outputs above Nyquist, and the tests use non-saturated modulation and isolated DSP states. A third consolidated validation run is triggered by this update.

APK validation details: APK SHA-256 `2c0a33b059dca8aae69eec9fd32e9d7a1350fdd242a8ebebb3df461484981b2f`; the package contains `index.html`, all five new DSP assets, and both Plaits/Beads WASM wrappers. Physical-device audio and UI checks remain pending.
### Next Befaco batch selected
The next modules to port, in order, are Hexmix, Hexpander, Pony VCF, DivKid Stereo Strip and MIDI Thing V2. Hexmix is now the first module implemented in this batch: six-channel EQ/VCA/mute/pan/master DSP, VCA-expander normalization, stereo outputs and typed graph ports are in place; Node/CI remains deferred until the other four modules are complete. The catalog/registry audit confirms that none is present in the current assets or module types. Hexpander will attach to Hexmix through an internal expansion relationship. MIDI Thing V2 must integrate with Android MIDI; Stereo Strip will use separate L/R scalar ports until a native stereo bus exists. The next CI/APK workflow remains blocked until all five are implemented and tested.
**Hexmix and Hexpander implementation status:** Hexmix now has six channel strips, three-band EQ, vactrol-style mute states, pan, master EQ/level and VCA-expander normalization. Hexpander is linked internally to Hexmix and adds three pre/post aux send buses, stereo returns, six direct outs, PFL, monitor crossfade, balanced line outputs and headphones. DSP, panels, typed graph ports and dedicated tests are prepared; no workflow is run until Pony VCF, Stereo Strip and MIDI Thing V2 are also complete.
**Pony VCF implementation status:** added the 6 HP four-pole low-pass filter/VCA/mixer with three inputs, IN3 output feedback normaling, CV1/CV2 cutoff, resonance CV, CV1-to-VCA mode and external volume CV. DSP, peak meter, panel, typed graph ports and dedicated tests are prepared. This is a clean-room ladder-filter approximation, not an SSI2144 circuit clone; CI remains blocked until Stereo Strip and MIDI Thing V2 are complete.
**DivKid Stereo Strip implementation status:** stereo/mono input normalization, 3-band EQ, constant-power mono pan and stereo balance, pan CV, smoothed 5 V-unity VCA CV, three-position mute, line/Eurorack input/output switches and soft-clipping limiter are integrated with a dedicated 6 HP-inspired panel and typed L/R graph ports. The momentary mute is a 120 ms one-shot model, not a held pointer switch. CI remains deferred until MIDI Thing V2 is complete.


## Current Befaco status — 2026-11-09

The Phase 7 batch is now complete (5/5): Hexmix, Hexpander, Pony VCF, DivKid Stereo Strip and MIDI Thing V2. MIDI Thing V2 adds 12 configurable CV/gate outputs, per-port mapping for note CV, gate, velocity, CC, pitch bend, pressure, program, clock, transport, ADSR, oscillator, LFO, RPN and NRPN; 12-voice allocation/priority, sustain, glide, and 0–5 V / ±5 V / 0–10 V range selection. It receives events from the existing Android MIDI input bridge and AudioWorklet. Its 6 HP-inspired panel includes a 12-port configuration matrix, NEW VOICE macro and ALL NOTES OFF. Physical TRS/USB-host hardware routing and MIDI merge are not emulated.

Dedicated tests for the five-module batch currently cover 100 DSP cases and 25 graph-contract cases, plus inline-script, module-registry, asset-loading and panel assertions. The next consolidated Node/WASM/APK workflow is now permitted and is the first CI run for these five modules; device-level MIDI/audio/touch verification remains pending. All work stays on `feature/befaco-modules`; `main` is preserved.


Phase 7 CI validation snapshot: this commit closes the five-module implementation gate and triggers the consolidated Node, Plaits/Beads WebAssembly, Gradle debug APK and artifact checks. Physical-device validation remains a separate pending step.


### Phase 7 CI correction log — run #26

- Workflow #26 executed the full Node suite: **551 tests, 545 passed, 6 failed**. The six failures were isolated to one Float32 exact-equality assertion in Hexpander, stale 36-vs-37 asset/registry uniqueness expectations, an outdated Pony VCF panel assertion, a missing explicit CHANNEL PRESSURE label, a MIDI Thing voice-count assertion checked before process(), and Pony VCF CV2 scaling that was not 1 V/oct.
- Corrected the Float32 assertion to use tolerance, updated uniqueness counts to 37, aligned the Pony VCF UI assertion with the actual DSP contract, clarified the MIDI Thing label, advanced the MIDI voice allocator before checking active voice count, and corrected Pony VCF cutoff CV scaling to true 1 V/oct.
- All corrections are committed on `feature/befaco-modules` with `[skip ci]`. Workflow #27 will rerun the full suite and continue to WASM/Gradle only if Node passes. No APK from #26 was produced; `main` remains untouched.


Phase 7 rerun: the six Node test failures from workflow #26 have been corrected; this source commit triggers workflow #27 for the full Node/WASM/Android APK gate.


### Phase 7 CI correction log — run #27

- Workflow #27 ran all **551 Node tests: 550 passed, one failed**. The only remaining failure was a static UI label assertion: the MIDI Thing V2 footer shortened PROGRAM CHANGE to PROGRAM. The full label is now displayed. No DSP or graph test failed in this run.
- Workflow #28 is the final full-suite/WASM/Gradle/APK rerun. The module batch remains unvalidated until it completes successfully.

Phase 7 CI rerun: workflow #27 passed 550/551 tests; the final PROGRAM CHANGE panel label assertion is corrected in the current branch. This commit triggers the final Node/WASM/APK rerun.


### Phase 7 CI correction log — run #28

- Workflow #28 again ran 551 Node tests: 550 passed and one static panel assertion failed because the faceplate footer abbreviated OSCILLATOR as OSC. The faceplate now spells out OSCILLATOR. The regression assertion continues to check the full visible label and the panel's selector controls.
- Workflow #29 will rerun the complete Node/WASM/Gradle/APK gate. No APK was produced by #28.


Phase 7 final rerun: the MIDI Thing V2 faceplate now displays the full OSCILLATOR function label; this commit starts workflow #29.


### Phase 7 implementation refinement and CI log — run #29

- The latest branch now includes MIDI Thing V2's additional **0–8 V** range, per-port drum-trigger note selector, and **DRUM TRIGGER** mapping. The compact port matrix was expanded to show PORT / FUNCTION / CHANNEL / VOICE / CC / NOTE / OUTPUT / JACK in a two-row layout.
- The Phase 7 module-specific tests now total **100 DSP tests + 25 graph tests**: Hexmix 18+5, Hexpander 15+5, Pony VCF 17+5, Stereo Strip 19+5, MIDI Thing V2 31+5. The repository-wide Node suite reported 554 tests in run #29.
- Workflow #29 failed one assertion: the second voice's gate was expected to be 5 V even though its configured range was 0–10 V. The expected value is now 10 V, consistent with the module's range-aware gate output. This correction is committed on the current branch.
- [ ] Workflow #30 must run the full Node/WASM/Gradle/APK gate on the current branch HEAD. Do not mark the batch validated until every required step and artifact inspection succeeds.


Phase 7 validation run #30: this commit triggers the full Node test suite, Plaits/Beads WASM build and validation, Android debug APK assembly and artifact checks on the latest five-module implementation.


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
