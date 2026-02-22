#!/bin/bash
set -euo pipefail

EXT_DIR="$HOME/Projects/x-geo-filter-extension"

if [ ! -d "$EXT_DIR" ]; then
  echo "Extension directory not found: $EXT_DIR"
  exit 1
fi

open -a "Google Chrome" --args --load-extension="$EXT_DIR" --new-window "https://x.com/home"

echo "Launched Chrome with X Geo Filter Guard loaded (session mode)."
