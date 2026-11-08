# Eurorack Study Rack (Android)
Rack modular de estudo: Pamela's PRO Workout (+ Axon-2, PPEXP1/2), Intellijel Scales, Mutable Plaits, **Intellijel Polaris**, **Erica Synths EDU DIY BBD**, **Mutable Beads**, Mixer, **Audio Out**, MIDI→CV e **CV→MIDI**.

- Interface e motor: `app/src/main/assets/index.html` (motor em AudioWorklet, thread de áudio própria).
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
