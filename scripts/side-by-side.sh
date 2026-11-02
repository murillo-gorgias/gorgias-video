#!/usr/bin/env bash
# Stack two videos next to each other, for comparing a light copy with its master.
#
#   scripts/side-by-side.sh <left.mp4> <right.mp4> <out.mp4>
#
# Both are scaled to the same height. Audio comes from the left file.
set -euo pipefail

if [ $# -ne 3 ]; then
  echo "usage: $0 <left.mp4> <right.mp4> <out.mp4>" >&2
  exit 2
fi

ffmpeg -y -hide_banner -loglevel error -stats -i "$1" -i "$2" \
  -filter_complex "[0:v]scale=-2:1080[a];[1:v]scale=-2:1080[b];[a][b]hstack=inputs=2,format=yuv420p[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k -shortest "$3"

echo "Wrote $3. Scrub the busiest moments and look for smearing on flat fields."
