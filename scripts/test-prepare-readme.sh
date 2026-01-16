#!/usr/bin/env bash

set -euo pipefail

INPUT="test-workspace/README.md"
EXPECTED="scripts/fixtures/test-readme-expected.md"
TMP_OUT=""

cleanup() {
  rm -f "$TMP_OUT"
}
trap cleanup EXIT

TMP_OUT=$(mktemp)

# Run the prepare script
src/bin/prepare-readme.sh "$INPUT" "$TMP_OUT"

# Compare with expected output
if ! diff -u "$EXPECTED" "$TMP_OUT"; then
  echo "FAIL: Output does not match expected" >&2
  exit 1
fi

echo "prepare-readme.sh test passed"
