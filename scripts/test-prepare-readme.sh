#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME=$(basename "$0")

usage() {
  cat << EOF
Usage: $SCRIPT_NAME [OPTIONS] [<input-file>]

Test prepare-readme.sh by running it on a README file and validating the output.

This script runs prepare-readme.sh on the specified input file and verifies:
  - The processed file is 4 lines shorter than the original
  - The Documentation section is removed
  - The processed file matches the original (minus the last 4 lines)

Arguments:
  <input-file>   Path to the input README.md file to test.
                 Defaults to test-workspace/README.md if not specified.

Options:
  -h, --help    Show this help message and exit.

Examples:
  $SCRIPT_NAME                              # Test with default input file
  $SCRIPT_NAME README.md                    # Test with specific file
  $SCRIPT_NAME test-workspace/README.md     # Test with test workspace file

Requirements:
  - prepare-readme.sh must be available at src/bin/prepare-readme.sh
  - Input file must exist and be readable
EOF
  exit "${1:-0}"
}

# Parse arguments
INPUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage 0
      ;;
    -*)
      echo "Error: Unknown option: $1" >&2
      usage 1
      ;;
    *)
      if [[ -z $INPUT ]]; then
        INPUT="$1"
      else
        echo "Error: Multiple input files specified: '$INPUT' and '$1'" >&2
        usage 1
      fi
      shift
      ;;
  esac
done

# Default to test-workspace/README.md if no input specified
if [[ -z $INPUT ]]; then
  INPUT="test-workspace/README.md"
fi

# Validate input file exists
if [[ ! -f "$INPUT" ]]; then
  echo "Error: Input file not found: $INPUT" >&2
  exit 1
fi

# Temp file variables (initialized empty for cleanup trap)
TMP_ORIG=""
TMP_OUT=""

# Cleanup temp files on exit
cleanup() {
  rm -f "$TMP_ORIG" "$TMP_OUT" "$TMP_OUT.processed"
}
trap cleanup EXIT

TMP_ORIG="/tmp/prepare-readme-orig-$$.md"
TMP_OUT="/tmp/prepare-readme-out-$$.md"

# Copy input files
cp "$INPUT" "$TMP_ORIG"
cp "$INPUT" "$TMP_OUT"

# Run the prepare script
src/bin/prepare-readme.sh "$TMP_OUT" "$TMP_OUT.processed"

# Check: processed file is a prefix of original (minus last 4 lines)
head -n $(($(wc -l < "$TMP_OUT") - 4)) "$TMP_ORIG" | diff - "$TMP_OUT.processed"

# Check: processed file is 4 lines shorter
LINES_ORIG=$(wc -l < "$TMP_ORIG")
LINES_PROC=$(wc -l < "$TMP_OUT.processed")
if [ $((LINES_ORIG - LINES_PROC)) -ne 4 ]; then
  echo "FAIL: Expected processed file to be 4 lines shorter" >&2
  exit 1
fi

# Check: processed file does not contain '## Documentation'
if grep -q '## Documentation' "$TMP_OUT.processed"; then
  echo "FAIL: Documentation section still present" >&2
  exit 1
fi

echo "prepare-readme.sh test passed"
