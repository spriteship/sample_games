#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
assets="$root/public/assets"
output="$root/media/cover.png"
mkdir -p "$root/media"

magick \
  \( "$assets/sky.png" -resize '1600x900^' -gravity center -extent 1600x900 \) \
  -gravity northwest \
  -fill '#fff9d580' -draw 'circle 1260,398 1260,140' \
  -fill '#eafff1dc' -stroke white -strokewidth 8 -draw 'roundrectangle 64,158 937,758 48,48' \
  \( "$assets/island.png" -resize 920x \) -geometry +839+656 -composite \
  \( "$assets/island-small.png" -resize 370x \) -geometry +1195+738 -composite \
  \( "$assets/pip.png" -resize 525x \) -geometry +1010+165 -composite \
  \( "$assets/mallow.png" -resize 125x \) -geometry +964+140 -composite \
  -stroke none -font '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf' \
  -fill '#298a91' -pointsize 26 -annotate +121+234 'AN ORIGINAL 10-LEVEL ADVENTURE' \
  -fill '#236a78' -pointsize 103 -annotate +114+370 'PIP & THE' \
  -fill '#e47e4b' -pointsize 108 -annotate +114+490 'SKY ORCHARD' \
  -fill '#497783' -pointsize 32 -annotate +122+593 'Leap across the floating isles.' \
  -pointsize 32 -annotate +122+637 'Bring every sun seed home.' \
  -fill '#e99b31' -draw 'roundrectangle 119,681 575,743 18,18' \
  -fill '#704821' -pointsize 28 -annotate +144+695 'PLAY THE ADVENTURE  →' \
  -fill '#245c72' -pointsize 25 -annotate +70+854 'PIP & THE SKY ORCHARD  •  MADE WITH PHASER + SPRITESHIP' \
  "$output"

echo "Wrote $output"
