#!/usr/bin/env bash
# Gera o trio de assets do mapa (1x, @2x, @3x) a partir de uma PNG em resolução @3x.
# Requer macOS (`sips`).
#
# Uso (a partir da raiz do monorepo ou de apps/mobile):
#   ./apps/mobile/scripts/scale-map-marker-from-3x.sh <entrada-3x.png> <stem>
#
# Exemplo:
#   ./apps/mobile/scripts/scale-map-marker-from-3x.sh \
#     ~/Pins/marker-meetup-yugioh@3x.png marker-meetup-yugioh
#
# Escreve em apps/mobile/assets/map/:
#   <stem>.png      → dimensões ÷3 (pontos lógicos 1x)
#   <stem>@2x.png   → dimensões ×2/3 do 3x
#   <stem>@3x.png   → cópia do ficheiro de entrada
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$MOBILE_ROOT/assets/map"

usage() {
  echo "Uso: $0 <entrada-3x.png> <stem>" >&2
  echo "  stem: nome sem extensão, ex.: marker-meetup-yugioh ou marker-meetup-pokemon-overdue-5" >&2
  echo "  Saída: $OUT_DIR/<stem>.png, <stem>@2x.png, <stem>@3x.png" >&2
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 2 ]]; then
  usage
  exit 1
fi

SRC="$1"
STEM="$2"

if [[ ! -f "$SRC" ]]; then
  echo "erro: ficheiro inexistente: $SRC" >&2
  exit 1
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "erro: precisa de \`sips\` (macOS)." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

abs_path() {
  local d
  d="$(cd "$(dirname "$1")" && pwd)"
  echo "$d/$(basename "$1")"
}

SRC_ABS="$(abs_path "$SRC")"
DEST_3X_ABS="$OUT_DIR/${STEM}@3x.png"

w3=$(sips -g pixelWidth "$SRC" 2>/dev/null | tail -1 | awk '{print $2}')
h3=$(sips -g pixelHeight "$SRC" 2>/dev/null | tail -1 | awk '{print $2}')

if [[ -z "${w3:-}" || -z "${h3:-}" || "$w3" == "pixelWidth" ]]; then
  echo "erro: não foi possível ler pixelWidth/pixelHeight de: $SRC" >&2
  exit 1
fi

w1=$(( (w3 + 2) / 3 ))
h1=$(( (h3 + 2) / 3 ))
w2=$(( (w3 * 2 + 2) / 3 ))
h2=$(( (h3 * 2 + 2) / 3 ))

if [[ "$SRC_ABS" != "$DEST_3X_ABS" ]]; then
  cp "$SRC" "$DEST_3X_ABS"
fi
sips -z "$h1" "$w1" "$SRC" --out "$OUT_DIR/${STEM}.png" >/dev/null
sips -z "$h2" "$w2" "$SRC" --out "$OUT_DIR/${STEM}@2x.png" >/dev/null

echo "OK: $OUT_DIR/${STEM}.png (${w1}×${h1}), ${STEM}@2x.png (${w2}×${h2}), ${STEM}@3x.png (${w3}×${h3})"
