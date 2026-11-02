#!/usr/bin/env bash
# Make a looping GIF from a video or a folder of captured frames, for email headers, LinkedIn
# and chat.
#
#   scripts/gif-export.sh <in.mp4 | frames/> <out.gif> [width] [fps] [--from S --to S]
#
# Defaults: width 600, 12 fps. With a frames folder (f00000.png ...), fps is the rate the frames
# were captured at; capture them at the GIF's rate.
# Builds one palette from the whole clip with no dithering, then runs gifsicle's light lossy
# pass. Ordered dithering gave the same look at a bigger file.
# Email wants under 1 MB: cut the length or the width before going under 10 fps.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: $0 <in.mp4 | frames/> <out.gif> [width] [fps] [--from S --to S]" >&2
  exit 2
fi
if ! command -v gifsicle >/dev/null; then
  echo "gifsicle is missing. Install it with: brew install gifsicle" >&2
  exit 1
fi
IN=$1; OUT=$2; WIDTH=${3:-600}; FPS=${4:-12}
shift 2; [ $# -gt 0 ] && [[ "$1" != --* ]] && shift; [ $# -gt 0 ] && [[ "$1" != --* ]] && shift
RANGE=()
while [ $# -gt 0 ]; do
  case "$1" in
    --from) RANGE+=(-ss "$2"); shift 2 ;;
    --to) RANGE+=(-to "$2"); shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

if [ -d "$IN" ]; then
  INPUT=(-framerate "$FPS" -i "$IN/f%05d.png")
  FILTERS="scale=${WIDTH}:-1:flags=lanczos"
else
  INPUT=(-i "$IN")
  FILTERS="fps=${FPS},scale=${WIDTH}:-1:flags=lanczos"
fi

RAW="${OUT%.gif}.raw.gif"
# The ${RANGE[@]+...} form keeps macOS's bash 3.2 from failing on an empty list under set -u.
ffmpeg -y -hide_banner -loglevel error ${RANGE[@]+"${RANGE[@]}"} "${INPUT[@]}" \
  -filter_complex "${FILTERS},split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
  -loop 0 "$RAW"
gifsicle -O3 --lossy=30 "$RAW" -o "$OUT"
rm -f "$RAW"

echo "Wrote $OUT: $(du -h "$OUT" | cut -f1) at ${WIDTH} px wide, ${FPS} fps"
