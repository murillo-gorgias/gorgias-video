#!/usr/bin/env bash
# Find silent stretches in a recording, for trimming dead air.
#
#   scripts/silence.sh <audio-or-video> [min-seconds]
#
# Measures the file's loudness first and uses its gating threshold as the silence cut-off,
# so quiet and loud recordings both work. Silences shorter than min-seconds (default 0.5)
# are ignored. Prints start, end and length of each silence, and flags the leading and
# trailing ones.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <audio-or-video> [min-seconds]" >&2
  exit 2
fi
IN=$1; MIN=${2:-0.5}

THRESH=$(ffmpeg -nostats -hide_banner -i "$IN" -map 0:a:0 -af loudnorm=print_format=json -f null - 2>&1 \
  | awk -F'"' '/input_thresh/ {print $4}')
TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")

echo "$IN: gating threshold ${THRESH} dB, length ${TOTAL%.*} s, minimum silence ${MIN} s"

ffmpeg -nostats -hide_banner -i "$IN" -map 0:a:0 -af "silencedetect=noise=${THRESH}dB:d=${MIN}" -f null - 2>&1 \
  | awk -v total="$TOTAL" '
    /silence_start/ { start = $NF }
    /silence_end/ {
      end = $(NF-3); len = $NF
      tag = ""
      if (start < 0.5) tag = "  (leading)"
      if (total - end < 0.5) tag = "  (trailing)"
      printf "  %7.2f  to  %7.2f   %5.2f s%s\n", start, end, len, tag
      n++
    }
    END { if (!n) print "  no silence found" }
  '
