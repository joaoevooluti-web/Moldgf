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

The second five-module implementation batch is now complete on `feature/befaco-modules`: Random8, MEX, Octaves VCO, IROI and Bandit. Each module has a DSP asset, engine dispatch, dedicated front panel, typed graph descriptor and dedicated tests. The batch adds **104 DSP/graph test cases** and five static panel/integration assertions; the page now loads 32 DSP assets and registers 32 graph module types.

The consolidated Node/Android CI gate is now being opened for this batch. Its run must confirm the actual `node --test tests/*.test.cjs` suite, Plaits/Beads WebAssembly validation, Gradle debug APK assembly and uploaded artifacts before this batch is called CI-validated. No physical-device audio or touch validation is claimed.

Known limitations: IROI exposes left/right as two independent mono paths rather than a native stereo bus; MEX's rear THRU daisy-chain expander is not modeled. The new DSP algorithms are clean-room behavioral approximations, not firmware or circuit-level clones. All work remains on `feature/befaco-modules`; `main` is protected.
