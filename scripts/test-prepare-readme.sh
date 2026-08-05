#!/usr/bin/env bash

# Tests for scripts/prepare-readme.sh.
#
# The golden case pins the original job -- stripping the zenodo badge and the
# Documentation section. Everything after it covers link handling, where the failures
# are invisible rather than loud: a relative link that reaches a marketplace page
# resolves against the marketplace, and an absolute link to a path that moved is a 404.
# Neither looks broken from inside the repository, which is why they are asserted here.
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

# --- The original job, pinned to a golden file --------------------------------------
"$SCRIPT" "$INPUT" "$WORKSPACE/golden.out"
if ! diff -u "$EXPECTED" "$WORKSPACE/golden.out"; then
  fail "golden output no longer matches $EXPECTED"
fi

# --- Relative links become absolute, with the right base for each kind --------------
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

run reference-definition 0 << 'EOF'
# Title

[guide]: CONTRIBUTING.md

Start with the [guide].
EOF
has reference-definition "[guide]: $BLOB/CONTRIBUTING.md"

# A definition consumed by a reference-style image needs /raw/ like an inline image, not
# the /blob/ every definition used to get -- a blob URL serves HTML and renders broken.
run reference-image 0 << 'EOF'
# Title

![the icon][ic]

[ic]: icon.png
EOF
has reference-image "[ic]: $RAW/icon.png"

# The collapsed form takes its label from the alt text.
run reference-image-collapsed 0 << 'EOF'
# Title

![ic][]

[ic]: icon.png
EOF
has reference-image-collapsed "[ic]: $RAW/icon.png"

# ...and the shortcut form, which is just the label with nothing after it.
run reference-image-shortcut 0 << 'EOF'
# Title

![ic]

[ic]: icon.png
EOF
has reference-image-shortcut "[ic]: $RAW/icon.png"

# One label cannot serve both: /raw/ gives an image its bytes, /blob/ gives a link its
# page. Naming the label beats silently breaking whichever one loses.
run reference-label-conflict 1 << 'EOF'
# Title

![pic][x] and [text][x]

[x]: icon.png
EOF
grep -qF "used by both an image and a" "$WORKSPACE/reference-label-conflict.log" ||
  fail "reference-label-conflict: expected the both-uses message"

# The same collision in shortcut form. Detecting shortcut images without shortcut links
# made this pair look image-only, so it took /raw/ and the link resolved to raw bytes.
# Note the reference-image-shortcut case above is what proves the definition line does
# not count as a use of its own label -- without that exclusion this check would fire on
# every defined label and nothing would package at all.
run shortcut-label-conflict 1 << 'EOF'
# Title

![x] and see [x] too.

[x]: icon.png
EOF
grep -qF "used by both an image and a" "$WORKSPACE/shortcut-label-conflict.log" ||
  fail "shortcut-label-conflict: expected the both-uses message"

# Brackets that are not references at all. Each of these once counted as a shortcut link
# and produced a conflict against the image, refusing to package a correct README --
# a false positive on the release path, which is the costlier direction to be wrong in.
run task-list-not-a-link 0 << 'EOF'
# Title

- [x] shipped

![pic][x]

[x]: icon.png
EOF
has task-list-not-a-link "[x]: $RAW/icon.png"

run code-span-not-a-link 0 << 'EOF'
# Title

Write `[x]` to make a checkbox.

![pic][x]

[x]: icon.png
EOF
has code-span-not-a-link "[x]: $RAW/icon.png"

run fenced-block-not-a-link 0 << 'EOF'
# Title

```md
[x] and ![x]
```

![pic][x]

[x]: icon.png
EOF
has fenced-block-not-a-link "[x]: $RAW/icon.png"

# Link titles are legal Markdown and used to slip past the rewrite entirely: the
# destination pattern stopped at the first space, so a titled relative link was neither
# rewritten nor reported, which is the one outcome this script exists to prevent.
run titled-link 0 << 'EOF'
# Title

See [setup](CONTRIBUTING.md "the guide") first.
EOF
has titled-link "]($BLOB/CONTRIBUTING.md \"the guide\")"

run titled-image 0 << 'EOF'
# Title

![icon](icon.png "the icon")
EOF
has titled-image "]($RAW/icon.png \"the icon\")"

run single-quoted-title 0 << 'EOF'
# Title

See [setup](CONTRIBUTING.md 'the guide') first.
EOF
has single-quoted-title "]($BLOB/CONTRIBUTING.md 'the guide')"

# A destination shape the rewrite does not handle must fail rather than ship. The
# leftover scan is deliberately broader than the rewrite so this direction is guaranteed.
run unsupported-destination 1 << 'EOF'
# Title

See [setup](<CONTRIBUTING.md>).
EOF

# A file link carrying an anchor keeps the anchor and is still checked for existence.
run link-with-anchor 0 << 'EOF'
# Title

See [releases](CONTRIBUTING.md#creating-a-release).
EOF
has link-with-anchor "]($BLOB/CONTRIBUTING.md#creating-a-release)"

# --- Absolute targets are left exactly as they are ----------------------------------
run absolute-untouched 0 << 'EOF'
# Title

[example](https://example.com/page) and ![badge](https://img.shields.io/badge/a-b-c.svg)
EOF
has absolute-untouched "](https://example.com/page)"
has absolute-untouched "](https://img.shields.io/badge/a-b-c.svg)"

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
