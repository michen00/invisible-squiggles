#!/usr/bin/env bash

# Create, verify, and push a signed release tag.
#
# Exists because the three commands it replaces were hand-typed, and one of them
# carries a flag that must not be forgotten. `tag.gpgsign` is deliberately unset in
# this project, so `git tag -a vX.Y.Z -m vX.Y.Z` without `-s` produces an unsigned
# tag that looks identical in `git tag -l` and is caught only by a separate
# verify-tag step that is equally easy to skip. Here the flag cannot be forgotten
# and the verification is not optional.
#
# The preflight checks below all guard the same class of mistake: tagging a commit
# that is not the one about to be released. Each of them would otherwise surface as
# a failed or wrong CI run several minutes later.
#
# Pushing is part of this script because a tag that exists only locally does
# nothing -- pushing it is what makes CI draft the release. That is reversible: the
# draft build publishes to no registry, and both the draft and the tag can be
# deleted.

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
COMMITTED_SIGNERS='.github/allowed_signers'
SIGNERS_FILE="${SIGNERS_FILE:-$COMMITTED_SIGNERS}"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME <version>

Create a signed annotated tag, verify its signature, and push it.
Pushing the tag makes CI draft the release with the VSIX attached.
Nothing is published to any registry.

Arguments:
  <version>   Release tag of the form vX.Y.Z (e.g. v0.4.2)

Environment:
  SIGNERS_FILE   Additional allowed-signers file to verify against.
                 .github/allowed_signers is always checked regardless,
                 because that is the file users verify with.

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
# digits, but glob `*` is any-characters, so it admits v1abc.2.3 -- which passes here
# and then fails somewhere less obvious, in whichever tool touches it first. This
# matches the publish workflow's own tag filter, where `+` really is a quantifier.
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  die "version must look like vX.Y.Z, got '$VERSION'."
fi

# Checked here as well as in the publish workflow. The workflow's check is the one
# that matters, but reaching it costs a queue wait and a dependency install first.
manifest="v$(node -p "require('./package.json').version")"
if [ "$manifest" != "$VERSION" ]; then
  die "$VERSION does not match package.json ($manifest)." \
    "Bump the manifest first, or tag the version it already declares."
fi

# The lockfile carries the version twice and `npm version` writes both. A release
# commit prepared by hand, or a conflict resolution that took the wrong side, can leave
# either behind while package.json still reads correctly -- and the publish workflow
# repeats only the package.json check, so nothing downstream catches it. The tag would
# then name a tree whose lockfile still claims the previous release, which is the
# footgun the prep helper exists to remove.
lock_root="v$(node -p "require('./package-lock.json').version ?? ''")"
lock_self="v$(node -p "require('./package-lock.json').packages?.['']?.version ?? ''")"
if [ "$lock_root" != "$VERSION" ] || [ "$lock_self" != "$VERSION" ]; then
  die "package-lock.json does not name $VERSION (found $lock_root and $lock_self)." \
    "Both version fields have to match the manifest. Run" \
    "'npm install --package-lock-only' on the release commit and amend it in."
fi

# The changelog's date for this version is written when the release branch is
# prepared, which can be days before the tag, and it is what users read as the release
# date. v0.4.1 was prepared on one day and tagged the next, shipping a date that had to
# be corrected twice. Checked here because this is the last moment before the tag
# exists, and because nothing downstream looks at the changelog at all.
BARE="${VERSION#v}"
CHANGELOG="CHANGELOG.md"
changelog_heading=$(grep -m1 -F "## [$BARE](" "$CHANGELOG" || true)
if [ -z "$changelog_heading" ]; then
  die "$CHANGELOG has no section for $BARE." \
    "The release commit should have added one, so check that this tag is on the" \
    "commit you meant to release."
fi
today=$(date +%Y-%m-%d)
case "$changelog_heading" in
  *" - $today") ;;
  *)
    die "the $BARE changelog heading is not dated today ($today)." \
      "  $changelog_heading" \
      "That date is the release date as far as readers are concerned. Correct the" \
      "line on main before tagging."
    ;;
esac

branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  die "on '$branch', not main." \
    "A release tag names a commit on main. Tagging elsewhere would ship" \
    "whatever that branch contains, and the tag would outlive the branch."
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "the working tree is dirty." \
    "The tag would name HEAD, not what you are looking at."
fi

git fetch origin main --quiet
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  die "main and origin/main point at different commits." \
    "CI checks out the tag from the remote, so tagging a commit that is not" \
    "on origin/main would build something other than what you tested."
fi

if git rev-parse --verify "refs/tags/$VERSION" > /dev/null 2>&1; then
  die "tag $VERSION already exists locally." \
    "Delete it first if you meant to re-cut it: git tag -d $VERSION"
fi

if git ls-remote --exit-code --tags origin "refs/tags/$VERSION" > /dev/null 2>&1; then
  die "tag $VERSION already exists on origin." \
    "That version has been cut. Release forward instead."
fi

# -s rather than relying on configuration, which is the entire point of this script.
#
# gpg.format is pinned to ssh for the same reason, and it is the more important half.
# `-s` signs with whatever format happens to be configured, and git's default is
# openpgp -- so on a machine with a GPG key set up, `-s` produces a tag that this
# project's documented verification route cannot check, because that route is an SSH
# allowed-signers file. Worse, the check below would not catch it: verification
# format follows the signature, so a GPG-signed tag gets GPG-verified and passes
# wherever the local keyring trusts the key. The tag would push, and only a third
# party following SECURITY.md would discover it is unverifiable to them.
git -c gpg.format=ssh tag -a "$VERSION" -m "$VERSION" -s
echo "Created SSH-signed tag $VERSION."

# Verified rather than assumed: a signing key that has gone missing, or one absent
# from the allowed-signers file, fails here while the tag exists only locally.
#
# The committed file is checked whatever SIGNERS_FILE says, because it is the file
# users actually have. SECURITY.md documents verifying a release tag against
# .github/allowed_signers from a clone, so a tag that verifies only against a local
# override would push and then be unverifiable to everyone following the published
# procedure -- the same class of gap as signing with the wrong format, which the
# `gpg.format=ssh` pin above closes.
verify_with() {
  git -c gpg.format=ssh -c "gpg.ssh.allowedSignersFile=$1" verify-tag "$VERSION"
}

if ! verify_with "$COMMITTED_SIGNERS"; then
  git tag -d "$VERSION"
  die "signature verification failed against $COMMITTED_SIGNERS." \
    "The local tag has been deleted. That file is the trust root SECURITY.md sends" \
    "users to, so a tag it cannot verify is one nobody else can verify either." \
    "Add your signing key to it before releasing."
fi

# The override checks against some other list as well. It cannot stand in for the
# check above, only add to it.
if [ "$SIGNERS_FILE" != "$COMMITTED_SIGNERS" ] && ! verify_with "$SIGNERS_FILE"; then
  git tag -d "$VERSION"
  die "signature verification failed against $SIGNERS_FILE;" \
    "the local tag has been deleted." \
    "Check that your signing key is present and listed there."
fi

# An explicit refspec rather than --follow-tags, which pushes more than it looks
# like. Per git-push(1) it also pushes "annotated tags in refs/tags that are missing
# from the remote but are pointing at commit-ish that are reachable from the refs
# being pushed" -- so any stray local annotated tag would ride along having passed
# none of the checks above, and could start the draft workflow for a version nobody
# asked to release. Everything above validates exactly one tag; this pushes exactly
# that one.
#
# main needs no push of its own: the check above already required HEAD and
# origin/main to be the same commit.
git push origin "refs/tags/$VERSION"
echo
echo "Pushed $VERSION. CI is now drafting the release with the VSIX attached."
echo "Nothing has been published. Review the draft, then publish it:"
echo "  make release VERSION=$VERSION"
