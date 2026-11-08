#!/usr/bin/env bash
# Baixa o código ORIGINAL da Mutable Instruments (pichenettes/eurorack, com o submódulo stmlib) e compila para WebAssembly:
#   - Plaits  -> app/src/main/assets/plaits_wasm.js
#   - Beads   -> app/src/main/assets/beads_wasm.js   (antes roda um autoteste nativo com g++)
# Cada um é independente: se um falhar, o app continua com a versão aproximada em JS daquele módulo.
set -o pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/app/src/main/assets"
LOG="$ROOT/native/wasm_build.log"
: > "$LOG"
say() { echo "$@" | tee -a "$LOG"; }

W="$(mktemp -d)"
say "== clonando pichenettes/eurorack (com submódulos) em $W"
if ! git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/pichenettes/eurorack.git "$W/mi" >>"$LOG" 2>&1; then
  say "clone recursivo falhou; tentando sem submódulos + stmlib separado"
  git clone --depth 1 https://github.com/pichenettes/eurorack.git "$W/mi" >>"$LOG" 2>&1 || { say "FALHA: não foi possível clonar"; exit 1; }
  (cd "$W/mi" && rm -rf stmlib && git clone --depth 1 https://github.com/pichenettes/stmlib.git stmlib) >>"$LOG" 2>&1
fi
if [ ! -f "$W/mi/stmlib/stmlib.h" ]; then
  say "stmlib ausente; tentando git submodule update"
  (cd "$W/mi" && git submodule update --init --depth 1 stmlib) >>"$LOG" 2>&1
fi
[ -f "$W/mi/stmlib/stmlib.h" ] && say "stmlib OK" || say "AVISO: stmlib continua ausente — os builds abaixo vão falhar"
cd "$W/mi"
STM=""
for f in stmlib/dsp/atan.cc stmlib/dsp/units.cc stmlib/utils/random.cc; do [ -f "$f" ] && STM="$STM $f"; done
RC=0

build_plaits() {
  set -e
  cp "$ROOT/native/plaits_wrap.cc" .
  ENG=16; NF=0
  grep -q six_op_engine plaits/dsp/voice.cc && ENG=24 || true
  grep -m1 RegisterInstance plaits/dsp/voice.cc | grep -q vcf && NF=1 || true
  echo "plaits: motores $ENG, novos primeiro: $NF"
  SRC="plaits_wrap.cc plaits/resources.cc"
  for f in $(find plaits/dsp -name '*.cc' ! -name '*test*'); do SRC="$SRC $f"; done
  emcc -O3 -std=c++14 -fno-exceptions -fno-rtti -I. -DPX_ENGINES=$ENG -DPX_NEWFIRST=$NF $SRC $STM -o plaits.wasm \
    --no-entry -sSTANDALONE_WASM -sERROR_ON_UNDEFINED_SYMBOLS=0 -sINITIAL_MEMORY=16MB -sSTACK_SIZE=1048576 \
    -sEXPORTED_FUNCTIONS=_px_init,_px_buf,_px_params,_px_render,_px_info
  ls -l plaits.wasm
  echo "window.PLAITS_WASM='$(base64 -w0 plaits.wasm)';" > "$ASSETS/plaits_wasm.js"
  echo "OK: plaits_wasm.js gerado"
}

build_beads() {
  set -e
  [ -f beads/dsp/processor.cc ] || { echo "beads/dsp/processor.cc não existe neste commit"; return 1; }
  cp "$ROOT/native/beads_wrap.cc" .
  SRC="beads_wrap.cc beads/resources.cc"
  for f in $(find beads/dsp -name '*.cc' ! -name '*test*'); do SRC="$SRC $f"; done
  echo "beads: fontes: $SRC"
  echo "--- autoteste nativo (g++)"
  g++ -O1 -std=c++14 -fpermissive -w -I. -DBD_SELFTEST $SRC $STM -o beads_selftest
  ./beads_selftest
  echo "--- WebAssembly (emcc)"
  emcc -O3 -std=c++14 -fno-exceptions -fno-rtti -Wno-vla-extension -w -I. $SRC $STM -o beads.wasm \
    --no-entry -sSTANDALONE_WASM -sERROR_ON_UNDEFINED_SYMBOLS=0 -sINITIAL_MEMORY=32MB -sSTACK_SIZE=1048576 \
    -sEXPORTED_FUNCTIONS=_bd_init,_bd_params,_bd_in,_bd_out,_bd_gate,_bd_frz,_bd_process,_bd_hostmax
  ls -l beads.wasm
  echo "window.BEADS_WASM='$(base64 -w0 beads.wasm)';" > "$ASSETS/beads_wasm.js"
  echo "OK: beads_wasm.js gerado"
}

say "================ PLAITS ================"
( build_plaits ) >>"$LOG" 2>&1 && say "Plaits: OK" || { say "Plaits: FALHOU (veja o log acima)"; RC=1; }
say "================ BEADS ================="
( build_beads ) >>"$LOG" 2>&1 && say "Beads: OK" || { say "Beads: FALHOU (veja o log acima)"; RC=1; }
tail -n 60 "$LOG" | cat
exit $RC
