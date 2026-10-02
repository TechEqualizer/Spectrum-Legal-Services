#!/usr/bin/env bash
# Turns any video clip into a phone-ready reel: 720x1280 (9:16, center
# cropped), H.264 MP4 that starts playing before it finishes downloading,
# plus a JPEG cover image from the first second.
#
#   scripts/prepare-reel.sh <input> <output-name> [start-seconds] [max-seconds]
#   scripts/prepare-reel.sh ~/Downloads/clip.mov public/reels/medspa/lip-filler 2 20
#
# Writes <output-name>.mp4 and <output-name>.jpg. Needs ffmpeg.
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

input=$1
out=$2
start=${3:-0}
length=${4:-30}

command -v ffmpeg >/dev/null || { echo "ffmpeg is required (brew install ffmpeg / apt install ffmpeg)" >&2; exit 1; }
mkdir -p "$(dirname "$out")"

# Fill a 9:16 frame: scale up until it covers, then crop the middle.
frame="scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p"

ffmpeg -hide_banner -loglevel error -y \
  -ss "$start" -t "$length" -i "$input" \
  -map 0:v:0 -map "0:a:0?" \
  -vf "$frame" \
  -c:v libx264 -preset slow -crf 26 -profile:v high \
  -c:a aac -b:a 96k -ac 2 \
  -movflags +faststart \
  "$out.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -ss 1 -i "$out.mp4" -frames:v 1 -q:v 4 "$out.jpg"

echo "$out.mp4 ($(du -h "$out.mp4" | cut -f1)), $out.jpg"
