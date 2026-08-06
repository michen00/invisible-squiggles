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

# The missing-target cases need a path that genuinely is not in the repository. Checking
# that here means adding the file later produces this message rather than an unexplained
# failure in two fixtures that look like they are about something else.
MISSING="docs/NOPE.md"
if [ -e "$REPO_ROOT/$MISSING" ]; then
  fail "the missing-target fixtures assume $MISSING does not exist, but it does now; point them at another path"
fi

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

# A definition routes on what its target is, not on how the label is used, so the same
# label serving an image and a link is no longer a conflict -- it resolves once, by
# extension. The trade is stated by the next two cases rather than left implicit.
run label-used-both-ways 0 << 'EOF'
# Title

![pic][x] and [text][x]

[x]: icon.png
EOF
has label-used-both-ways "[x]: $RAW/icon.png"

# The limitation, written down: an image whose definition points at a non-image
# extension gets /blob/ and would render broken. Nothing in this repository does that,
# and the alternative -- deciding from usage -- is what produced three separate false
# conflicts that refused to package correct READMEs.
run definition-routes-by-extension 0 << 'EOF'
# Title

![pic][doc]

[doc]: CONTRIBUTING.md
EOF
has definition-routes-by-extension "[doc]: $BLOB/CONTRIBUTING.md"

# A definition may carry a title just as an inline link may. Handling it inline without
# handling it here left the destination unrewritten and unreported -- shipped relative.
run titled-definition 0 << 'EOF'
# Title

See [the guide][id].

[id]: CONTRIBUTING.md "setup"
EOF
has titled-definition "[id]: $BLOB/CONTRIBUTING.md \"setup\""

run titled-definition-image 0 << 'EOF'
# Title

![pic][ic]

[ic]: icon.png "the icon"
EOF
has titled-definition-image "[ic]: $RAW/icon.png \"the icon\""

# --- Angle-bracketed destinations are refused, whatever is inside them ---------------
# The bracket form is legal Markdown that nothing here reads. It was briefly accepted by
# stripping the bracket wherever a destination is inspected, which is a rule that has to
# be repeated in every such place; the place that was missed treated `<#x>` as an anchor
# and let a link into the removed section ship. One refusal covers the family instead, so
# the three cases below differ only in what the brackets contain.
run angle-bracket-url 1 << 'EOF'
# Title

See [example][id].

[id]: <https://example.com>
EOF
grep -qF "angle-bracketed" "$WORKSPACE/angle-bracket-url.log" ||
  fail "angle-bracket-url: expected the angle-bracket message"

run angle-bracket-path 1 << 'EOF'
# Title

See [setup](<CONTRIBUTING.md>).
EOF
grep -qF "angle-bracketed" "$WORKSPACE/angle-bracket-path.log" ||
  fail "angle-bracket-path: expected the angle-bracket message"

# The one that shipped: an anchor into the stripped section, bracketed. It reached the
# listing because `absolute()` saw an anchor after dropping the bracket while the
# dangling-anchor scan, which looks for `](#`, did not see one at all.
run angle-bracket-anchor 1 << 'EOF'
# Title

Jump to [the index](<#-documentation>).

## 🔹 Documentation

- something
EOF
grep -qF "angle-bracketed" "$WORKSPACE/angle-bracket-anchor.log" ||
  fail "angle-bracket-anchor: expected the angle-bracket message"

# ...but only in the part that survives. Refusing over a bracket in the section that is
# cut would fail the release for something no reader of the listing could ever reach --
# a false positive on the release path, the costlier direction to be wrong in.
run angle-bracket-below-cut 0 << 'EOF'
# Title

Body.

## 🔹 Documentation

See [example](<https://example.com>).
EOF

# A tab is blank space in Markdown and the refusal has to see it. Worth a case of its own
# because the first spelling of that check used [ \t], which POSIX reads as space,
# backslash and the letter t -- it missed the tab and matched a stray t. The local grep on
# a developer machine may be ugrep, which honours the escape and hides the difference.
# Written with printf so the tab is unambiguous here rather than a character an editor eats.
printf '# Title\n\nSee [setup](\t<CONTRIBUTING.md>).\n' > "$WORKSPACE/tab-before-bracket.in"
got=0
"$SCRIPT" "$WORKSPACE/tab-before-bracket.in" "$WORKSPACE/tab-before-bracket.out" \
  > "$WORKSPACE/tab-before-bracket.log" 2>&1 || got=$?
[ "$got" = 1 ] || fail "tab-before-bracket: expected exit 1, got $got"
grep -qF "angle-bracketed" "$WORKSPACE/tab-before-bracket.log" ||
  fail "tab-before-bracket: expected the angle-bracket message"

# --- Reference definitions may be indented ------------------------------------------
# Markdown allows up to three leading spaces before a definition, four being a code block.
# The rewrite requires column zero and is deliberately left that way: growing what is
# refused is safe, growing what is rewritten is what produced the regressions in this
# branch. What changed is that the leftover scan no longer stops at column zero, so an
# indented relative definition fails the build instead of shipping unrewritten and
# unreported -- silently relative, which is the one outcome this script exists to prevent.
run indented-definition-relative 1 << 'EOF'
# Title

  [guide]: CONTRIBUTING.md

See the [guide].
EOF
grep -qF "relative links survived" "$WORKSPACE/indented-definition-relative.log" ||
  fail "indented-definition-relative: expected the leftover-scan message"

# The same indent with an absolute target is the form a listing can actually use, so it
# passes untouched. Refusing it would block a release over nothing.
run indented-definition-absolute 0 << 'EOF'
# Title

  [vs]: https://example.com

See the [vs].
EOF
has indented-definition-absolute "  [vs]: https://example.com"

run indented-definition-bracketed 1 << 'EOF'
# Title

  [id]: <https://example.com>
EOF
grep -qF "angle-bracketed" "$WORKSPACE/indented-definition-bracketed.log" ||
  fail "indented-definition-bracketed: expected the angle-bracket message"

# A query or fragment after the extension does not stop it being an image, and does not
# belong in the path that gets checked for existence either.
run image-with-query 0 << 'EOF'
# Title

![pic][ic]

[ic]: icon.png?raw=1
EOF
has image-with-query "[ic]: $RAW/icon.png?raw=1"

run image-with-fragment 0 << 'EOF'
# Title

![pic][ic]

[ic]: icon.png#v1
EOF
has image-with-fragment "[ic]: $RAW/icon.png#v1"

# ...and it is still checked for existence, which the old shape skipped entirely.
run titled-definition-missing 1 << 'EOF'
# Title

See [the plan][id].

[id]: docs/NOPE.md "t"
EOF
grep -qF "not in the repository" "$WORKSPACE/titled-definition-missing.log" ||
  fail "titled-definition-missing: expected the missing-file message"

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

# A destination shape the rewrite does not handle must fail rather than ship, including
# shapes nobody has thought to name. Two titles is one such: the rewrite's title pattern
# matches one and then wants the closing paren, so the link is passed over silently. The
# leftover scan takes everything up to that paren and inspects the first token, which is
# why it is deliberately broader than the rewrite -- the gap fails loudly instead of
# shipping relative.
run unsupported-destination 1 << 'EOF'
# Title

See [setup](CONTRIBUTING.md "one" "two").
EOF
grep -qF "relative links survived" "$WORKSPACE/unsupported-destination.log" ||
  fail "unsupported-destination: expected the leftover-scan message"

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
