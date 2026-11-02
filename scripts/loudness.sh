#!/usr/bin/env bash
# Report integrated loudness, loudness range and true peak of an audio or video file.
#
#   scripts/loudness.sh <file.wav|file.mp4>
#
# Target for social video: about -12 LUFS integrated, true peak at or below -1 dB.
# Uses ffmpeg's EBU R128 meter. Run it on the finished MP4, since the AAC encode moves the peak.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <audio-or-video-file>" >&2
  exit 2
fi

REPORT=$(ffmpeg -nostats -hide_banner -i "$1" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p')
I=$(echo "$REPORT" | awk '/I:/ {print $2}')
LRA=$(echo "$REPORT" | awk '/LRA:/ {print $2}')
PEAK=$(echo "$REPORT" | awk '/Peak:/ {print $2}')

printf '%s\n' "$1"
printf '  integrated loudness  %s LUFS   (target about -12)\n' "$I"
printf '  loudness range       %s LU\n' "$LRA"
printf '  true peak            %s dBTP   (target at or below -1)\n' "$PEAK"

VERDICT="ok"
if awk "BEGIN{exit !($PEAK > -1)}"; then VERDICT="peak too hot"; fi
if awk "BEGIN{exit !($I < -14 || $I > -10)}"; then VERDICT="$VERDICT, loudness off target"; fi
echo "  verdict: $VERDICT"
