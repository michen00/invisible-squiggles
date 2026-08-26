#!/usr/bin/env bash

# Count the commits between a release commit and a ref that git-cliff would print.
#
# A rider is a commit that reached main after the release commit but before the tag.
# Riders are not forbidden, because most are harmless: the only one this repository has
# actually seen was #238, build(deps-dev), which cliff.toml skips and which touched no
# shipped byte -- `dependencies` is empty, so dev-tree changes never reach the VSIX.
# Refusing that tag would have cost a revert or a burnt version for no gain.
#
# What is forbidden is a rider that would have earned a changelog entry. It ships under a
# version whose notes were written before it existed, and the entry is lost permanently:
# the next release's range starts at this tag, so nothing ever prints it. v0.2.1 shipped
# two feat: riders that way.
#
# git-cliff decides rather than a regex over subjects, which is the drift this repository
# refuses elsewhere -- check-pr-title.mjs parses cliff.toml for the same reason.
# `--context` reports the commits surviving the filter, so an empty list means nothing
# would have printed.
#
# Lives here rather than inline in release-tag.sh so it can be tested: that script
# fetches, signs and pushes, and cannot be exercised against historical tags.
#
# Prints a count to stdout. Any failure is fatal and explains itself on stderr rather
# than printing something a caller would compare against "0" and misread.

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
REF="${1:-HEAD}"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME [ref]

Print how many commits between <ref>'s release commit and <ref> would appear in the
changelog. Prints 0 when <ref> is itself the commit that bumped the manifest.

Arguments:
  [ref]   Commit-ish to examine (default: HEAD)
EOF
}

die() {
  echo "Error: $1" >&2
  shift
  for line in "$@"; do echo "  $line" >&2; done
  exit 1
}

case "${1:-}" in
  -h | --help)
    usage
    exit 0
    ;;
esac

version_at() {
  git show "$1:package.json" 2> /dev/null |
    node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version" 2> /dev/null || true
}

head_version=$(version_at "$REF")
[ -n "$head_version" ] || die "cannot read a version from $REF:package.json."

# A ref whose parent carries a different version is itself the release commit, so there
# is nothing after it to judge. Checked before anything else because it is the ordinary
# case, and it keeps git-cliff off the common path entirely.
# The path taken goes to stderr so a caller -- and the test suite -- can tell "no riders
# to judge" from "riders judged and all skipped". Both print 0, and a bug that always
# took this branch would disable the guard while still looking correct.
parent_version=$(version_at "${REF}^")
if [ "$parent_version" != "$head_version" ]; then
  echo "release-commit: $REF bumped the manifest, so there is nothing after it." >&2
  echo 0
  exit 0
fi

command -v git-cliff > /dev/null 2>&1 ||
  die "$REF is not the release commit, and git-cliff is not installed to judge whether" \
    "the commits since it would reach the changelog." \
    "Install git-cliff, or tag the commit that bumped the manifest."

bump=$(git log --format=%H -S"\"version\": \"$head_version\"" -- package.json | tail -1)
[ -n "$bump" ] || die "cannot find the commit that set the version to $head_version."

if ! context=$(git cliff "$bump..$REF" --context 2> /dev/null); then
  die "git-cliff failed to describe $bump..$REF." \
    "Run 'git cliff $bump..$REF --context' to see why."
fi

if ! count=$(printf '%s' "$context" | node -p \
  "JSON.parse(require('fs').readFileSync(0, 'utf8')).reduce((n, r) => n + (r.commits || []).length, 0)" \
  2> /dev/null); then
  die "could not count commits in git-cliff's output." \
    "Its --context format may have changed; scripts/test-release-tag.sh covers this."
fi

case "$count" in
  '' | *[!0-9]*)
    die "expected a commit count from git-cliff, got '$count'."
    ;;
esac

echo "judged: $bump..$REF via git-cliff." >&2
if [ "$count" != "0" ]; then
  # Taken from git-cliff's own surviving set, not from git log over the range: most
  # commits in that range are skipped types, and listing them all under this heading
  # would name commits that are not the problem.
  echo "commits that would appear in the changelog:" >&2
  printf '%s' "$context" | node -p \
    "JSON.parse(require('fs').readFileSync(0, 'utf8'))
      .flatMap((r) => r.commits || [])
      .map((c) => '  ' + String(c.id).slice(0, 7) + ' ' + String(c.message).split('\n')[0])
      .join('\n')" >&2
fi
echo "$count"
