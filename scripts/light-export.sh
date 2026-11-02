#!/usr/bin/env bash
# Make a small shareable copy of a master. Compresses by quality, never by a size cap.
#
#   scripts/light-export.sh <master.mp4> <light.mp4>            CRF 22, slow preset
#   scripts/light-export.sh <master.mp4> <light.mp4> --grain    smooth film grain first
#
# Grain changes every frame and takes most of the file size. Smoothing it (hqdn3d) took
# one grainy 25 s master from 181 MB to 27 MB with no visible loss. A fixed size cap smears
# flat backgrounds; this script never uses one. The audio is copied, not re-encoded, so the
# peak measured on the master still holds. Compare the result with side-by-side.sh.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: $0 <master.mp4> <light.mp4> [--grain]" >&2
  exit 2
fi
IN=$1; OUT=$2; shift 2
VF="format=yuv420p"
if [ "${1:-}" = "--grain" ]; then VF="hqdn3d=4:3:8:6,format=yuv420p"; fi

ffmpeg -y -hide_banner -loglevel error -stats -i "$IN" \
  -vf "$VF" -c:v libx264 -preset slow -crf 22 -tune animation -movflags +faststart \
  -c:a copy "$OUT"

echo "Wrote $OUT: $(du -h "$IN" | cut -f1) -> $(du -h "$OUT" | cut -f1)"
