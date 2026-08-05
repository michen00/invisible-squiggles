#!/usr/bin/env bash

# Prepare a release branch: bump the version, open the changelog section, verify.
#
# Every step here was previously hand-typed, and each has a way of going quietly
# wrong that this script removes:
#
#   - The version lives in package.json *and* twice in package-lock.json, where a
#     third identical "version": "x.y.z" belongs to an unrelated dependency. Editing
#     the lockfile by hand means hitting two of three matching lines. `npm version`
#     updates exactly the right ones.
#   - The changelog heading needs a compare link and today's date. A date typed by
#     hand is a date typed on whichever day the branch was prepared, which is not
#     necessarily the day the tag gets cut.
#
# Deliberately stops before committing. The changelog *body* is prose, and for a
# release whose commits are all ci/build/docs, git-cliff generates nothing at all --
# cliff.toml skips those types. So the section this opens is often empty, and an
# empty section needs a human sentence rather than a default one.

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
CHANGELOG="CHANGELOG.md"
REPO_URL="https://github.com/michen00/invisible-squiggles"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME <version>

Create a release branch, bump the version in package.json and
package-lock.json, open a dated changelog section, and run the full
check suite. Stops before committing so the changelog entry can be
written by hand.

Arguments:
  <version>   Release version of the form vX.Y.Z (e.g. v0.4.2)

Example:
  $SCRIPT_NAME v0.4.2
EOF
  exit "${1:-0}"
}

die() {
  echo "Error: $1" >&2
  shift
  for line in "$@"; do
    echo "  $line" >&2
  done
  exit 1
}

if [ "$#" -ne 1 ]; then
  usage 1
fi

case "$1" in
  -h | --help) usage 0 ;;
esac

VERSION="$1"

# Anchored regex rather than a glob. `v[0-9]*.[0-9]*.[0-9]*` reads as if it means
# digits, but glob `*` is any-characters, so it admits v1abc.2.3 -- which would pass
# here and then reach `npm version 1abc.2.3`, failing with an error about semver
# rather than about the argument. Matches the publish workflow's own tag filter.
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  die "version must look like vX.Y.Z, got '$VERSION'."
fi

BARE="${VERSION#v}"

branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  die "on '$branch', not main." \
    "A release branch should start from main so the release contains only" \
    "what main contains."
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "the working tree is dirty." \
    "Commit or stash first; this script is about to edit tracked files."
fi

git fetch origin main --quiet
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  die "main and origin/main point at different commits." \
    "Run 'git pull' so the release branch starts from the real main."
fi

current="$(node -p "require('./package.json').version")"
if [ "$current" = "$BARE" ]; then
  die "package.json already declares $BARE." \
    "Pick the next version, or check whether this release is already prepared."
fi

# Ordering, not just inequality. `npm version` rewrites both manifests to whatever it
# is given, downward included and without complaint, so preparing v0.3.2 from a 0.4.1
# main would produce a branch that looks like a release and declares a version the
# project already moved past. Merged and tagged, that either collides with a
# published version or silently ships a regression in the version number.
#
# Compared numerically in node rather than with `sort -V`, which BSD sort on macOS
# does not implement.
if ! node -e '
  const parse = (v) => v.split(".").map(Number);
  const [next, prev] = [parse(process.argv[1]), parse(process.argv[2])];
  for (let i = 0; i < 3; i++) {
    if (next[i] !== prev[i]) process.exit(next[i] > prev[i] ? 0 : 1);
  }
  process.exit(1);
' "$BARE" "$current"; then
  die "$BARE is not ahead of the current version ($current)." \
    "Releases only move forward. Both registries refuse to replace a version" \
    "that has been published, so a number cannot be walked back afterwards."
fi

if git rev-parse --verify "refs/tags/$VERSION" > /dev/null 2>&1 ||
  git ls-remote --exit-code --tags origin "refs/tags/$VERSION" > /dev/null 2>&1; then
  die "tag $VERSION already exists." "That version has been cut. Release forward instead."
fi

# Anchored to match the awk below exactly. Without the `$`, a heading carrying
# trailing text passed this check and then matched nothing during insertion, and the
# script went on to report success.
if ! grep -q '^## \[Unreleased\]$' "$CHANGELOG"; then
  die "no '## [Unreleased]' heading in $CHANGELOG." \
    "Run 'make update-unreleased' first, which creates it." \
    "A heading with trailing text does not count: the insertion below matches" \
    "the line exactly, so it has to be exactly that."
fi

if grep -q "^## \[$BARE\]" "$CHANGELOG"; then
  die "$CHANGELOG already has a section for $BARE."
fi

git switch -c "release/$VERSION"

# Updates package.json and both of the lockfile's own version fields, leaving
# dependency versions untouched. --no-git-tag-version because tagging is a separate,
# later step -- see scripts/release-tag.sh.
npm version "$BARE" --no-git-tag-version > /dev/null
echo "Bumped $current -> $BARE in package.json and package-lock.json."

# Today, resolved now rather than typed. If the tag is cut on a later day this line
# needs updating, which is the one thing about the date that cannot be automated
# from here.
today=$(date +%Y-%m-%d)
heading="## [$BARE]($REPO_URL/compare/v$current..$VERSION) - $today"

# Inserted immediately after the Unreleased heading, which stays in place to collect
# the next cycle's entries.
awk -v heading="$heading" '
  /^## \[Unreleased\]$/ && !done { print; print ""; print heading; done = 1; next }
  { print }
' "$CHANGELOG" > "$CHANGELOG.tmp" && mv "$CHANGELOG.tmp" "$CHANGELOG"

# Checked rather than announced. The awk above silently makes no change if its
# pattern does not match, and reporting an insertion that did not happen is worse
# than failing: the next steps are a commit and a tag, and the missing section would
# surface as a released version with no changelog entry at all.
if ! grep -qF "$heading" "$CHANGELOG"; then
  die "failed to insert the changelog heading." \
    "Expected to add: $heading" \
    "Check the '## [Unreleased]' heading in $CHANGELOG."
fi
echo "Opened changelog section: $heading"

echo
echo "Running the full check suite..."
make check

cat << EOF

Prepared release/$VERSION. Nothing has been committed.

Still to do by hand:
  1. Write the $BARE changelog entry. It is empty right now, and it may stay
     empty automatically -- cliff.toml skips ci, build, docs, test, refactor
     and chore, so a release made only of those generates no entries. Say so
     outright rather than shipping a bare heading.
  2. Optionally smoke-test the build:  make install-vsix
  3. Commit and open the PR:
       git commit -am "chore: release $VERSION"
       git push -u origin release/$VERSION
       gh pr create

After that PR merges:
       make tag VERSION=$VERSION      # drafts the release, publishes nothing
       make release VERSION=$VERSION  # publishes to both registries
EOF
