#!/usr/bin/env bash
# Join captured frames and a mixed audio file into the master MP4.
#
#   scripts/assemble.sh <frames-dir> <fps> <audio.wav|none> <out.mp4> [--blend K]
#
# Frames are the PNGs capture.js wrote (f00000.png ...). The video stream is H.264 at
# CRF 16, preset slow, yuv420p so every player opens it. Audio becomes AAC at 192 kbps.
# The output is cut to the shorter of picture and sound.
# --blend K averages every K consecutive frames into one (after capture.js --supersample K).
set -euo pipefail

if [ $# -lt 4 ]; then
  echo "usage: $0 <frames-dir> <fps> <audio.wav|none> <out.mp4> [--blend K]" >&2
  exit 2
fi

FRAMES=$1; FPS=$2; AUDIO=$3; OUT=$4; shift 4
BLEND=1
while [ $# -gt 0 ]; do
  case "$1" in
    --blend) BLEND=$2; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# A glob, not `ls | head`: with pipefail, head closing the pipe early makes ls fail the script.
shopt -s nullglob
FILES=("$FRAMES"/f*.png)
shopt -u nullglob
if [ ${#FILES[@]} -eq 0 ]; then
  echo "no frames found in $FRAMES (expected f00000.png ...)" >&2
  exit 1
fi
FIRST=${FILES[0]}
COUNT=${#FILES[@]}
NUMBER=$(basename "$FIRST" .png | sed 's/^f//')
DIGITS=${#NUMBER}
START=$((10#$NUMBER))
PATTERN="$FRAMES/f%0${DIGITS}d.png"

# H.264 needs even dimensions; crop a stray pixel rather than fail.
EVEN="crop=trunc(iw/2)*2:trunc(ih/2)*2"
VF="${EVEN},format=yuv420p"
IN_RATE=$FPS
if [ "$BLEND" -gt 1 ]; then
  IN_RATE=$((FPS * BLEND))
  VF="tmix=frames=${BLEND},select='eq(mod(n\,${BLEND})\,$((BLEND - 1)))',setpts=N/(${FPS}*TB),${EVEN},format=yuv420p"
fi

if [ "$AUDIO" = "none" ]; then
  ffmpeg -y -hide_banner -loglevel error -stats \
    -framerate "$IN_RATE" -start_number "$START" -i "$PATTERN" \
    -vf "$VF" -r "$FPS" -c:v libx264 -preset slow -crf 16 -movflags +faststart \
    "$OUT"
else
  ffmpeg -y -hide_banner -loglevel error -stats \
    -framerate "$IN_RATE" -start_number "$START" -i "$PATTERN" -i "$AUDIO" \
    -vf "$VF" -r "$FPS" -c:v libx264 -preset slow -crf 16 -movflags +faststart \
    -c:a aac -b:a 192k -shortest \
    "$OUT"
fi

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
SIZE=$(du -h "$OUT" | cut -f1)
echo "Wrote $OUT: $((COUNT / BLEND)) frames at $FPS fps, ${DUR%.*} s, $SIZE"
