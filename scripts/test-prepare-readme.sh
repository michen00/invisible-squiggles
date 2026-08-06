#!/usr/bin/env bash

# Tests for scripts/prepare-readme.sh.
#
# The golden case pins the original job -- stripping the zenodo badge and the
# Documentation section. Everything after it covers the contract, which is small and
# stated in two halves:
#
#   Supported:  [text](path) and ![alt](path) with a plain destination, plus anything
#               already absolute. These are rewritten or left alone.
#   Refused:    every other shape. Titles, angle brackets, reference definitions with
#               relative targets. These stop the build.
#
# The refusals get as much attention as the rewrites here, because they are the contract.
# A refusal that quietly stops firing turns into a relative link on a marketplace page,
# which resolves against the marketplace and is invisible from inside the repository.
#
# Link targets are checked against the real repository, so these fixtures reference
# files that genuinely exist (CONTRIBUTING.md, icon.png) and one that genuinely does not.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/prepare-readme.sh"
INPUT="test-workspace/README.md"
EXPECTED="scripts/fixtures/test-readme-expected.md"
BLOB="https://github.com/michen00/invisible-squiggles/blob/main"
RAW="https://github.com/michen00/invisible-squiggles/raw/main"
WORKSPACE=""
FAILURES=0

cleanup() {
  [ -n "$WORKSPACE" ] && rm -rf "$WORKSPACE"
}
trap cleanup EXIT

WORKSPACE=$(mktemp -d)

fail() {
  echo "FAIL: $*" >&2
  FAILURES=$((FAILURES + 1))
}

# run <name> <want-rc>; README body arrives on stdin, output lands in <name>.out
run() {
  local name="$1" want="$2" got=0
  cat > "$WORKSPACE/$name.in"
  "$SCRIPT" "$WORKSPACE/$name.in" "$WORKSPACE/$name.out" \
    > "$WORKSPACE/$name.log" 2>&1 || got=$?
  if [ "$got" != "$want" ]; then
    fail "$name: expected exit $want, got $got"
    sed 's/^/    /' "$WORKSPACE/$name.log" >&2
  fi
}

has() {
  grep -qF "$2" "$WORKSPACE/$1.out" || fail "$1: expected to find $2"
}

# Every refusal must name the destination it is refusing. The exit code alone is too weak
# an assertion: a refusal that fires for the wrong reason still exits 1, and that is how
# a check keeps passing after it has stopped testing what it was written for.
refused() {
  grep -qF "would not resolve on a listing page" "$WORKSPACE/$1.log" ||
    fail "$1: expected the unsupported-destination message"
  grep -qF "$2" "$WORKSPACE/$1.log" ||
    fail "$1: expected the message to name $2"
}

# The missing-target cases need a path that genuinely is not in the repository. Checking
# that here means adding the file later produces this message rather than an unexplained
# failure in fixtures that look like they are about something else.
MISSING="docs/NOPE.md"
if [ -e "$REPO_ROOT/$MISSING" ]; then
  fail "the missing-target fixtures assume $MISSING does not exist, but it does now; point them at another path"
fi

# --- The original job, pinned to a golden file --------------------------------------
"$SCRIPT" "$INPUT" "$WORKSPACE/golden.out"
if ! diff -u "$EXPECTED" "$WORKSPACE/golden.out"; then
  fail "golden output no longer matches $EXPECTED"
fi

# --- Supported: the two forms the contract rewrites ---------------------------------
run relative-link 0 << 'EOF'
# Title

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup.
EOF
has relative-link "]($BLOB/CONTRIBUTING.md)"

# An image needs /raw/; a blob URL serves an HTML page and renders as a broken image.
run relative-image 0 << 'EOF'
# Title

![icon](icon.png)
EOF
has relative-image "]($RAW/icon.png)"

# The image rule runs first for this reason: ![alt](path) contains the ](path) the link
# rule matches, so the generic rule would hand an image the /blob/ base.
run image-not-given-blob-base 0 << 'EOF'
# Title

![icon](icon.png) and [setup](CONTRIBUTING.md)
EOF
has image-not-given-blob-base "]($RAW/icon.png)"
has image-not-given-blob-base "]($BLOB/CONTRIBUTING.md)"

# A file link carrying an anchor keeps the anchor and is still checked for existence.
run link-with-anchor 0 << 'EOF'
# Title

See [releases](CONTRIBUTING.md#creating-a-release).
EOF
has link-with-anchor "]($BLOB/CONTRIBUTING.md#creating-a-release)"

# --- Supported: absolute destinations are left exactly as they are ------------------
run absolute-untouched 0 << 'EOF'
# Title

[example](https://example.com/page) and ![badge](https://img.shields.io/badge/a-b-c.svg)
EOF
has absolute-untouched "](https://example.com/page)"
has absolute-untouched "](https://img.shields.io/badge/a-b-c.svg)"

# A reference definition is never rewritten, so an absolute one has to pass untouched --
# this is the form the repository's own README uses for its badge target.
run absolute-definition 0 << 'EOF'
# Title

[vsmarketplace]: https://marketplace.visualstudio.com/items?itemName=michen00.invisible-squiggles

[![badge](https://img.shields.io/badge/a-b-c.svg)][vsmarketplace]
EOF
has absolute-definition "[vsmarketplace]: https://marketplace.visualstudio.com"

# ...at any indent Markdown allows for one.
run absolute-definition-indented 0 << 'EOF'
# Title

  [vs]: https://example.com

See the [vs].
EOF
has absolute-definition-indented "  [vs]: https://example.com"

# --- Refused: titles ----------------------------------------------------------------
# A title is legal Markdown. The rewrite's destination pattern stops at whitespace, so a
# titled destination does not match it and arrives at the scan still relative. Refusing
# is the whole point: the alternative is a title pattern, and every extension of that
# pattern in this script's history produced the next defect.
run titled-link 1 << 'EOF'
# Title

See [setup](CONTRIBUTING.md "the guide") first.
EOF
refused titled-link "CONTRIBUTING.md"

run titled-image 1 << 'EOF'
# Title

![icon](icon.png "the icon")
EOF
refused titled-image "icon.png"

run single-quoted-title 1 << 'EOF'
# Title

See [setup](CONTRIBUTING.md 'the guide') first.
EOF
refused single-quoted-title "CONTRIBUTING.md"

# Two titles is a shape nobody would write on purpose. It is here because the scan has to
# refuse forms nobody has thought of, not just the ones with names.
run two-titles 1 << 'EOF'
# Title

See [setup](CONTRIBUTING.md "one" "two").
EOF
refused two-titles "CONTRIBUTING.md"

# --- Refused: angle-bracketed destinations ------------------------------------------
# Legal Markdown, unsupported here, and refused by the scan rather than by a rule of its
# own. The scan normalises nothing, which is what makes this work: `<...>` never looks
# absolute to it, so all three spellings arrive relative regardless of what is inside.
run angle-bracket-path 1 << 'EOF'
# Title

See [setup](<CONTRIBUTING.md>).
EOF
refused angle-bracket-path "<CONTRIBUTING.md>"

run angle-bracket-url 1 << 'EOF'
# Title

See [example][id].

[id]: <https://example.com>
EOF
refused angle-bracket-url "<https://example.com>"

# The one that shipped once: an anchor into the removed section, in brackets. It reached
# the listing because a rule taught to strip the bracket made `<#...>` read as an anchor,
# while the dangling-anchor scan -- which looks for `](#` -- saw no anchor at all.
run angle-bracket-anchor 1 << 'EOF'
# Title

Jump to [the index](<#-documentation>).

## 🔹 Documentation

- something
EOF
refused angle-bracket-anchor "<#-documentation>"

# --- Refused: reference definitions with relative targets ---------------------------
# Definitions are not rewritten at all now. A relative one therefore reaches the scan and
# stops the build, which is the honest outcome: it cannot be resolved without deciding
# whether the label feeds an image or a link, and making that decision is what grew an
# extension router and three separate false refusals of correct READMEs.
run relative-definition 1 << 'EOF'
# Title

[guide]: CONTRIBUTING.md

Start with the [guide].
EOF
refused relative-definition "CONTRIBUTING.md"

run relative-definition-titled 1 << 'EOF'
# Title

[id]: CONTRIBUTING.md "setup"
EOF
refused relative-definition-titled "CONTRIBUTING.md"

run relative-definition-indented 1 << 'EOF'
# Title

  [guide]: CONTRIBUTING.md
EOF
refused relative-definition-indented "CONTRIBUTING.md"

# --- Not definitions, not links: these must not trip anything -----------------------
# A leading tab is a four-column tab stop, so the line is an indented code block. Reading
# it as a definition refused a listing over a code example -- a false positive on the
# release path, which blocks a release over a file that is correct. printf, so the tab is
# unambiguous in this source file rather than a character an editor may eat.
printf '# Title\n\nAn example:\n\n\t[foo]: bar.md\n\nDone.\n' \
  > "$WORKSPACE/tab-indented-code.in"
got=0
"$SCRIPT" "$WORKSPACE/tab-indented-code.in" "$WORKSPACE/tab-indented-code.out" \
  > "$WORKSPACE/tab-indented-code.log" 2>&1 || got=$?
[ "$got" = 0 ] || {
  fail "tab-indented-code: expected exit 0, got $got"
  sed 's/^/    /' "$WORKSPACE/tab-indented-code.log" >&2
}

# Brackets that are not links at all. An earlier design classified every bracket in the
# document to decide what a definition fed; task list markers, code spans and fenced
# examples each got read as a link and refused a correct README. Nothing scans usage now,
# so the class is gone by construction -- these pin that it stays gone.
run task-list-not-a-link 0 << 'EOF'
# Title

- [x] shipped

See [CONTRIBUTING.md](CONTRIBUTING.md).
EOF
has task-list-not-a-link "]($BLOB/CONTRIBUTING.md)"

run code-span-not-a-link 0 << 'EOF'
# Title

Write `[x]` to make a checkbox.

See [CONTRIBUTING.md](CONTRIBUTING.md).
EOF
has code-span-not-a-link "]($BLOB/CONTRIBUTING.md)"

run fenced-block-not-a-link 0 << 'EOF'
# Title

```md
[x] and ![x]
```

See [CONTRIBUTING.md](CONTRIBUTING.md).
EOF
has fenced-block-not-a-link "]($BLOB/CONTRIBUTING.md)"

# --- The stripped section is not held to the contract -------------------------------
# The scan reads the output, and the output no longer contains the Documentation section,
# so an unsupported shape below the cut cannot refuse a release over something no reader
# of the listing could ever reach. This falls out of ordering rather than being arranged,
# which is why it is worth pinning.
run unsupported-below-the-cut 0 << 'EOF'
# Title

Body.

## 🔹 Documentation

See [setup](<CONTRIBUTING.md>) and [guide](CONTRIBUTING.md "titled").

[ref]: CONTRIBUTING.md
EOF

# --- Anchors: allowed when the heading survives the strip ---------------------------
# The slug matters more than it looks. GitHub lowercases, drops characters that are not
# alphanumeric, space, hyphen or underscore, then turns spaces into hyphens -- so this
# repository's emoji headings slug to a leading hyphen, and "#-features" is correct.
run anchor-resolves 0 << 'EOF'
# Title

Jump to [Features](#-features).

## 🔹 Features

Body.
EOF

# ...and rejected when the heading was in the part that got cut, which is damage this
# transform causes rather than finds.
run anchor-orphaned 1 << 'EOF'
# Title

Jump to [the index](#-documentation).

## 🔹 Documentation

- something
EOF
grep -qF "anchors point at headings" "$WORKSPACE/anchor-orphaned.log" ||
  fail "anchor-orphaned: expected the dangling-anchor message"

# --- A link to a path that is not in the repository stops the build ----------------
run missing-target 1 << 'EOF'
# Title

See [the plan](docs/NOPE.md).
EOF
grep -qF "not in the repository" "$WORKSPACE/missing-target.log" ||
  fail "missing-target: expected the missing-file message"

# --- Without a usable repository URL, refuse rather than ship relative links -------
# This is the condition that makes the rewrite necessary in the first place: vsce infers
# its base from the same field, so a shape it cannot read is exactly when links break.
printf '# Title\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md).\n' > "$WORKSPACE/nourl.in"
got=0
REPO_URL="git@github.com:michen00/invisible-squiggles.git" \
  "$SCRIPT" "$WORKSPACE/nourl.in" "$WORKSPACE/nourl.out" \
  > "$WORKSPACE/nourl.log" 2>&1 || got=$?
[ "$got" = 1 ] || fail "nourl: expected exit 1 for a non-https repository URL, got $got"

# --- REPO_REF chooses the ref the absolute links point at -------------------------
printf '# Title\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md).\n' > "$WORKSPACE/ref.in"
REPO_REF=v9.9.9 "$SCRIPT" "$WORKSPACE/ref.in" "$WORKSPACE/ref.out" > /dev/null 2>&1
grep -qF "/blob/v9.9.9/CONTRIBUTING.md" "$WORKSPACE/ref.out" ||
  fail "ref: REPO_REF did not reach the rewritten link"

# --- Usage ------------------------------------------------------------------------
if "$SCRIPT" > /dev/null 2>&1; then
  fail "expected a usage error with no arguments"
fi

if [ "$FAILURES" -ne 0 ]; then
  echo "prepare-readme.sh: $FAILURES test(s) failed" >&2
  exit 1
fi

echo "prepare-readme.sh test passed"
