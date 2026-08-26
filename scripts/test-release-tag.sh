#!/usr/bin/env bash

# Tests for scripts/changelog-riders.sh, the rider guard release-tag.sh depends on.
#
# The guard decides whether `make tag` refuses, so getting it wrong either blocks a
# legitimate release or lets a commit ship under notes written before it existed. It
# cannot be tested through release-tag.sh, which fetches, signs and pushes, which is why
# it lives in a script of its own.
#
# The cases are this repository's own tags. That makes them real rather than synthetic:
# v0.4.0 is the release that actually took a rider, and v0.2.1 is the one that actually
# shipped two feat: commits nobody documented. History does not move, so the expected
# values do not either.
#
# Counting is not enough on its own. A ref that bumped the manifest short-circuits and
# prints 0 without consulting git-cliff, and a ref judged clean also prints 0 -- so a bug
# that always took the short circuit would disable the guard while every count still
# looked right. The path is asserted alongside the count for that reason.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RIDERS="$REPO_ROOT/scripts/changelog-riders.sh"
FAILURES=0

cd "$REPO_ROOT"

if ! command -v git-cliff > /dev/null 2>&1; then
  echo "git-cliff is not installed, and every judged case below needs it." >&2
  echo "Install it (https://git-cliff.org) and re-run; skipping would leave this" >&2
  echo "suite reporting success while testing nothing." >&2
  exit 1
fi

# expect <tag> <count> <release-commit|judged>
expect() {
  local tag="$1" want_count="$2" want_path="$3"
  local sha stdout stderr rc=0

  if ! sha=$(git rev-list -n1 "$tag" 2> /dev/null); then
    echo "FAIL: $tag is not a tag in this repository" >&2
    FAILURES=$((FAILURES + 1))
    return
  fi

  stderr=$(mktemp)
  stdout=$("$RIDERS" "$sha" 2> "$stderr") || rc=$?

  if [ "$rc" != "0" ]; then
    echo "FAIL: $tag exited $rc" >&2
    sed 's/^/       /' "$stderr" >&2
    FAILURES=$((FAILURES + 1))
    rm -f "$stderr"
    return
  fi

  if [ "$stdout" != "$want_count" ]; then
    echo "FAIL: $tag expected count $want_count, got '$stdout'" >&2
    FAILURES=$((FAILURES + 1))
  fi

  if ! grep -q "^${want_path}:" "$stderr"; then
    echo "FAIL: $tag expected the $want_path path; stderr was:" >&2
    sed 's/^/       /' "$stderr" >&2
    FAILURES=$((FAILURES + 1))
  fi

  rm -f "$stderr"
}

# --- Tags whose own commit bumped the manifest: nothing after them to judge -----------
expect v0.1.0 0 release-commit
expect v0.1.1 0 release-commit
expect v0.2.0 0 release-commit
expect v0.3.0 0 release-commit
expect v0.3.1 0 release-commit
expect v0.4.1 0 release-commit
expect v0.4.2 0 release-commit

# --- The release that took a rider, and the rider was a type cliff.toml skips ---------
# v0.4.0 is tagged on 41054dc, build(deps-dev), not on the bump commit 682087f. Refusing
# this tag is the false positive a strict anchor would have produced: the rider earned no
# changelog entry and touched no shipped byte, because `dependencies` is empty.
expect v0.4.0 0 judged

# --- The release that shipped undocumented features -----------------------------------
# Two feat(package.json) commits landed after the bump and were never written up.
expect v0.2.1 2 judged

# --- The offending commits are named, and only they ------------------------------------
# The range at v0.2.1 holds 13 commits, 11 of them skipped types. Listing the range would
# name commits that are not the problem.
listing=$("$RIDERS" "$(git rev-list -n1 v0.2.1)" 2>&1 > /dev/null | sed -n '/would appear in the changelog/,$p' | tail -n +2)
listed=$(printf '%s\n' "$listing" | grep -c . || true)
if [ "$listed" != "2" ]; then
  echo "FAIL: expected exactly 2 commits listed for v0.2.1, got $listed:" >&2
  printf '%s\n' "$listing" | sed 's/^/       /' >&2
  FAILURES=$((FAILURES + 1))
fi

# --- Degradation: a missing git-cliff must stop the run, not report zero ---------------
# Reporting 0 without consulting anything is the failure that would silently disable the
# guard, so the script has to refuse instead. v0.4.0 is used because it is the case that
# reaches git-cliff at all.
stripped=$(mktemp -d)
for tool in git node; do ln -s "$(command -v $tool)" "$stripped/$tool"; done
if PATH="$stripped" "$RIDERS" "$(git rev-list -n1 v0.4.0)" > /dev/null 2>&1; then
  echo "FAIL: expected a failure when git-cliff is absent, got success" >&2
  FAILURES=$((FAILURES + 1))
fi
rm -rf "$stripped"

# --- Degradation: an unreadable ref must fail rather than default -----------------------
if "$RIDERS" not-a-real-ref > /dev/null 2>&1; then
  echo "FAIL: expected a failure for an unreadable ref, got success" >&2
  FAILURES=$((FAILURES + 1))
fi

if [ "$FAILURES" -ne 0 ]; then
  echo "changelog-riders.sh: $FAILURES test(s) failed" >&2
  exit 1
fi

echo "changelog-riders.sh test passed"
