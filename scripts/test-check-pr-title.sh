#!/usr/bin/env bash

# Tests for scripts/check-pr-title.mjs.
#
# The checker exists because two mislabelled titles reached main, so the cases that
# actually happened are in here by name. The degradation cases matter as much as the
# ordinary ones: a checker that quietly stops checking is worse than no checker, since
# it produces a green mark that means nothing.
#
# Everything runs against a *copy* of cliff.toml in a temporary directory. The checker
# reads `cliff.toml` from the working directory, so changing directory is enough to
# swap the configuration under it. That matters because some cases below need a broken
# config, and `make check` -- which runs this file -- is the pre-release gate. Editing
# the real cliff.toml in place would put a window, however short, where an interrupted
# release run leaves the repository holding a mangled config.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKER="$REPO_ROOT/scripts/check-pr-title.mjs"
WORKSPACE=""
FAILURES=0

cleanup() {
  [ -n "$WORKSPACE" ] && rm -rf "$WORKSPACE"
}
trap cleanup EXIT

WORKSPACE="$(mktemp -d)"
cp "$REPO_ROOT/cliff.toml" "$WORKSPACE/cliff.toml"
cd "$WORKSPACE"

# expect <want-rc> <title> [changed files...]
expect() {
  local want="$1" title="$2"
  shift 2
  local got=0
  printf '%s\n' "$@" | node "$CHECKER" "$title" > /dev/null 2>&1 || got=$?
  if [ "$got" != "$want" ]; then
    echo "FAIL: expected $want, got $got for: $title" >&2
    printf '  files: %s\n' "$*" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

# --- Titles that belong in the changelog, backed by user-facing changes -------------
expect 0 'feat: add a startHidden setting' src/extension.ts package.json
expect 0 'fix: restore colors on toggle' src/extension.ts
expect 0 'perf: avoid a redundant write' src/extension.ts
expect 0 'feat(extension)!: change the default' src/extension.ts

# --- Titles cliff.toml skips, so the diff does not matter --------------------------
expect 0 'ci: add prep-release and tag make targets' Makefile scripts/prep-release.sh
expect 0 'docs: document settings' README.md
expect 0 'build(deps): bump undici' package-lock.json
expect 0 'chore(deps-dev): bump sinon' package-lock.json
expect 0 'test: cover the toggle path' src/test/unit/extension.test.ts
expect 0 'refactor: extract a helper' src/extension.ts

# --- The two that actually reached main -------------------------------------------
expect 1 'feat: draft releases so they carry the vsix' \
  .github/workflows/publish.yml CONTRIBUTING.md
expect 1 'feat: add prep-release and tag make targets' Makefile scripts/prep-release.sh

# --- Other user-facing claims with nothing user-facing in the diff -----------------
expect 1 'fix: correct a workflow condition' .github/workflows/ci.yml
expect 1 'feat: only tests changed' src/test/unit/foo.test.ts
expect 1 'perf: speed up packaging' scripts/normalize-vsix.mjs

# --- Non-conventional titles, which cliff's catch-all keeps ------------------------
expect 1 'add a thing without a type' src/extension.ts
expect 1 'Update README' README.md

# --- Misuse of the checker itself --------------------------------------------------
if printf 'src/extension.ts\n' | node "$CHECKER" > /dev/null 2>&1; then
  echo "FAIL: expected a usage error with no title argument" >&2
  FAILURES=$((FAILURES + 1))
fi

# --- Degradation: a cliff.toml the checker cannot read must fail, not pass ---------
# Without the self-check the checker asserts, removing commit_parsers would classify
# every title as "not in the changelog" and every run would come back green.
sed '/^commit_parsers = \[/,/^\]/d' cliff.toml > stripped.toml
mv stripped.toml cliff.toml
expect 2 'feat: a real feature' src/extension.ts

# Policy changed rather than format outgrown: marking feat as skipped must also stop
# the checker, because its expectations no longer describe the configuration.
cp "$REPO_ROOT/cliff.toml" cliff.toml
sed 's|{ message = "\^feat", group = "<!-- 00 -->✨ Features" },|{ message = "^feat", group = "<!-- 00 -->✨ Features", skip = true },|' \
  cliff.toml > policy.toml
mv policy.toml cliff.toml
expect 2 'feat: a real feature' src/extension.ts

# Sanity: the copy really was modified, so the two cases above tested what they claim.
if grep -q '"\^feat", group = "<!-- 00 -->✨ Features" },' cliff.toml; then
  echo "FAIL: the cliff.toml copy was not modified; degradation cases proved nothing" >&2
  FAILURES=$((FAILURES + 1))
fi

if [ "$FAILURES" -ne 0 ]; then
  echo "check-pr-title.mjs: $FAILURES test(s) failed" >&2
  exit 1
fi

echo "check-pr-title.mjs test passed"
