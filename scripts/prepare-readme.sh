#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME=$(basename "$0")

usage() {
  cat << EOF
Usage: $SCRIPT_NAME <input-file> <output-file>

Strips zenodo badge and Documentation section from a README, normalizes trailing newline.

Arguments:
  <input-file>   Path to the input README.md
  <output-file>  Path to write the processed README.md

Examples:
  $SCRIPT_NAME README.md.bak README.md
  $SCRIPT_NAME test-workspace/README.md /tmp/README.out.md
EOF
  exit "${1:-0}"
}

if [ "$#" -ne 2 ]; then
  usage 1
fi

in="$1"
out="$2"

if [ ! -f "$in" ]; then
  echo "Error: Input file not found: $in" >&2
  exit 1
fi

sed -e '/zenodo\.org.*\.svg/d' -e '/## .*Documentation/,$d' "$in" | perl -0777 -pe 's/\s+$/\n/' > "$out"
