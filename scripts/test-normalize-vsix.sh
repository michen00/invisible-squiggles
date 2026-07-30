#!/usr/bin/env bash

# Verify scripts/normalize-vsix.mjs pins every entry timestamp, leaves entry data
# untouched, is idempotent, and refuses archives it cannot fully normalise.

set -euo pipefail

WORK=""

cleanup() {
  [ -n "$WORK" ] && rm -rf "$WORK"
}
trap cleanup EXIT

WORK=$(mktemp -d)
SRC="$WORK/src"

mkdir -p "$SRC/nested"
printf 'alpha\n' > "$SRC/alpha.txt"
printf 'beta beta beta beta beta beta beta beta\n' > "$SRC/nested/beta.txt"

# Distinct, non-1980 mtimes so normalisation is observable on every entry.
touch -t 202601020304.05 "$SRC/alpha.txt"
touch -t 202502030405.06 "$SRC/nested/beta.txt"

# -X omits the extended-timestamp extra fields; see the negative test below.
(cd "$SRC" && zip -q -X -r "$WORK/test.zip" .)

entries=$(unzip -Z -1 "$WORK/test.zip" | wc -l | tr -d ' ')
if [ "$entries" -lt 3 ]; then
  echo "FAIL: fixture should hold at least 3 entries, found $entries" >&2
  exit 1
fi

node scripts/normalize-vsix.mjs "$WORK/test.zip" > /dev/null

# 1. Every listed entry carries the pinned date. Accept both renderings: GNU
# unzip prints 1980-01-01, the macOS build prints 01-01-1980.
listed=$(unzip -l "$WORK/test.zip" | grep -cE '1980-01-01|01-01-1980' || true)
if [ "$listed" -ne "$entries" ]; then
  echo "FAIL: $listed of $entries entries normalised to 1980-01-01" >&2
  unzip -l "$WORK/test.zip" >&2
  exit 1
fi

# 2. Compressed data survives: the archive still verifies and extracts equal.
unzip -tqq "$WORK/test.zip"
mkdir -p "$WORK/out"
unzip -qq "$WORK/test.zip" -d "$WORK/out"
if ! diff -r "$SRC" "$WORK/out"; then
  echo "FAIL: extracted contents differ from the originals" >&2
  exit 1
fi

# 3. Idempotent: a second pass must not change a single byte.
before=$(shasum -a 256 "$WORK/test.zip" | cut -d' ' -f1)
node scripts/normalize-vsix.mjs "$WORK/test.zip" > /dev/null
after=$(shasum -a 256 "$WORK/test.zip" | cut -d' ' -f1)
if [ "$before" != "$after" ]; then
  echo "FAIL: second normalisation pass changed the archive" >&2
  exit 1
fi

# 4. Two archives differing only in mtime converge on identical bytes.
touch -t 199901010101.01 "$SRC/alpha.txt" "$SRC/nested/beta.txt"
(cd "$SRC" && zip -q -X -r "$WORK/other.zip" .)
node scripts/normalize-vsix.mjs "$WORK/other.zip" > /dev/null
if ! cmp -s "$WORK/test.zip" "$WORK/other.zip"; then
  echo "FAIL: archives differing only in mtime did not converge" >&2
  exit 1
fi

# 5. Fail closed on a timestamp-bearing extra field. Without -X, zip records an
# extended-timestamp field holding a second copy of the mtime that the DOS-word
# patch does not reach, so normalising would silently leave the archive
# irreproducible. Refusing is the only safe answer.
(cd "$SRC" && zip -q -r "$WORK/extras.zip" .)
if node scripts/normalize-vsix.mjs "$WORK/extras.zip" > "$WORK/extras.log" 2>&1; then
  echo "FAIL: expected refusal on an archive with extra timestamp fields" >&2
  exit 1
fi
if ! grep -q 'extra field' "$WORK/extras.log"; then
  echo "FAIL: refusal did not name the extra field" >&2
  cat "$WORK/extras.log" >&2
  exit 1
fi

# 6. Reject a file that is not a zip at all. The message is asserted, not just the
# exit status: any bug that makes the script die early would otherwise satisfy a
# bare non-zero check and this test would pass for the wrong reason.
printf 'not a zip\n' > "$WORK/bogus.vsix"
if node scripts/normalize-vsix.mjs "$WORK/bogus.vsix" > "$WORK/bogus.log" 2>&1; then
  echo "FAIL: expected refusal on a non-zip file" >&2
  exit 1
fi
if ! grep -q 'not a zip archive' "$WORK/bogus.log"; then
  echo "FAIL: refusal on a non-zip did not name the reason" >&2
  cat "$WORK/bogus.log" >&2
  exit 1
fi

# A missing file must be reported as missing, not as a malformed archive.
if node scripts/normalize-vsix.mjs "$WORK/absent.vsix" > "$WORK/absent.log" 2>&1; then
  echo "FAIL: expected refusal on a missing file" >&2
  exit 1
fi
if ! grep -q 'does not exist' "$WORK/absent.log"; then
  echo "FAIL: refusal on a missing file did not name the reason" >&2
  cat "$WORK/absent.log" >&2
  exit 1
fi

# 7. Archives differing only in file MODE converge. This is the case a
# same-machine double build cannot see, because both builds share one umask: git
# and esbuild create files as 0666 & ~umask, so the digest was a function of the
# builder's umask and a third-party rebuild of a signed tag mismatched.
chmod 600 "$SRC/alpha.txt" "$SRC/nested/beta.txt"
(cd "$SRC" && zip -q -X -r "$WORK/mode600.zip" .)
chmod 644 "$SRC/alpha.txt" "$SRC/nested/beta.txt"
(cd "$SRC" && zip -q -X -r "$WORK/mode644.zip" .)
node scripts/normalize-vsix.mjs "$WORK/mode600.zip" > /dev/null
node scripts/normalize-vsix.mjs "$WORK/mode644.zip" > /dev/null
if ! cmp -s "$WORK/mode600.zip" "$WORK/mode644.zip"; then
  echo "FAIL: archives differing only in file mode did not converge" >&2
  exit 1
fi

# 8. The executable bit survives. umask only ever clears group/other bits, so an
# executable entry is executable deliberately -- flattening it would break any
# package that ships one.
chmod 755 "$SRC/alpha.txt"
chmod 644 "$SRC/nested/beta.txt"
(cd "$SRC" && zip -q -X -r "$WORK/exec.zip" .)
node scripts/normalize-vsix.mjs "$WORK/exec.zip" > /dev/null
if ! unzip -Z "$WORK/exec.zip" alpha.txt | grep -q '^-rwxr-xr-x'; then
  echo "FAIL: executable bit was not preserved as 0755" >&2
  unzip -Z "$WORK/exec.zip" alpha.txt >&2
  exit 1
fi
if ! unzip -Z "$WORK/exec.zip" 'nested/beta.txt' | grep -q '^-rw-r--r--'; then
  echo "FAIL: non-executable entry was not canonicalised to 0644" >&2
  unzip -Z "$WORK/exec.zip" 'nested/beta.txt' >&2
  exit 1
fi

# 9. Entry data containing zip signature bytes must not fool the walk. Stored
# (-0) so the bytes appear literally in the archive instead of being deflated
# away. This is what the backward EOCD scan and the central-directory-driven walk
# exist to withstand: a whole-file signature scan would false-match in here.
mkdir -p "$WORK/sig"
printf 'PK\005\006PK\003\004PK\001\002PK\006\006 decoy signatures follow\n' \
  > "$WORK/sig/decoy.bin"
printf 'plain\n' > "$WORK/sig/plain.txt"
touch -t 202403040506.07 "$WORK/sig/decoy.bin" "$WORK/sig/plain.txt"
(cd "$WORK/sig" && zip -q -0 -X -r "$WORK/sig_a.zip" .)
touch -t 199801010101.01 "$WORK/sig/decoy.bin" "$WORK/sig/plain.txt"
(cd "$WORK/sig" && zip -q -0 -X -r "$WORK/sig_b.zip" .)
node scripts/normalize-vsix.mjs "$WORK/sig_a.zip" > /dev/null
node scripts/normalize-vsix.mjs "$WORK/sig_b.zip" > /dev/null
if ! cmp -s "$WORK/sig_a.zip" "$WORK/sig_b.zip"; then
  echo "FAIL: archives holding zip signature bytes did not converge" >&2
  exit 1
fi
mkdir -p "$WORK/sigout"
unzip -qq "$WORK/sig_a.zip" -d "$WORK/sigout"
if ! cmp -s "$WORK/sig/decoy.bin" "$WORK/sigout/decoy.bin"; then
  echo "FAIL: signature-bearing entry data was corrupted" >&2
  exit 1
fi

# 10. The local-header extra-field guard. Assertion 5 can only ever trip the
# central-directory guard, because the walk inspects that copy first. Here the
# central copies' header ids are rewritten to a benign value in place -- same
# lengths, no offsets moved -- so the local copy is the only unsafe one left and
# the local guard is the only thing that can catch it.
(cd "$SRC" && zip -q -r "$WORK/localextra.zip" .)
node -e '
const fs = require("node:fs");
const path = process.argv[1];
const b = fs.readFileSync(path);
let eocd = -1;
for (let i = b.length - 22; i >= 0; i--) {
  if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
}
const count = b.readUInt16LE(eocd + 10);
let c = b.readUInt32LE(eocd + 16);
let rewritten = 0;
for (let i = 0; i < count; i++) {
  const nl = b.readUInt16LE(c + 28);
  const xl = b.readUInt16LE(c + 30);
  const cl = b.readUInt16LE(c + 32);
  let o = c + 46 + nl;
  const end = o + xl;
  while (o + 4 <= end) {
    const id = b.readUInt16LE(o);
    const sz = b.readUInt16LE(o + 2);
    if (id !== 0x9999) { b.writeUInt16LE(0x9999, o); rewritten++; }
    o += 4 + sz;
  }
  c += 46 + nl + xl + cl;
}
if (rewritten === 0) { console.error("fixture built no central extras"); process.exit(1); }
fs.writeFileSync(path, b);
' "$WORK/localextra.zip"
if node scripts/normalize-vsix.mjs "$WORK/localextra.zip" > "$WORK/le.log" 2>&1; then
  echo "FAIL: expected refusal from the local-header extra-field guard" >&2
  exit 1
fi
if ! grep -q '(local)' "$WORK/le.log"; then
  echo "FAIL: refusal did not come from the local-header guard" >&2
  cat "$WORK/le.log" >&2
  exit 1
fi

# 11. A central directory whose declared size disagrees with the real layout must
# be refused rather than patched. Exercises the exact-consumption assertion, which
# replaced a tautological patched-vs-entryCount check.
cp "$WORK/test.zip" "$WORK/badsize.zip"
node -e '
const fs = require("node:fs");
const path = process.argv[1];
const b = fs.readFileSync(path);
let eocd = -1;
for (let i = b.length - 22; i >= 0; i--) {
  if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
}
b.writeUInt32LE(b.readUInt32LE(eocd + 12) + 7, eocd + 12);
fs.writeFileSync(path, b);
' "$WORK/badsize.zip"
before_bad=$(shasum -a 256 "$WORK/badsize.zip" | cut -d' ' -f1)
if node scripts/normalize-vsix.mjs "$WORK/badsize.zip" > "$WORK/bad.log" 2>&1; then
  echo "FAIL: expected refusal on a mismatched central-directory size" >&2
  exit 1
fi
if ! grep -q 'consumed' "$WORK/bad.log"; then
  echo "FAIL: refusal did not name the consumption mismatch" >&2
  cat "$WORK/bad.log" >&2
  exit 1
fi
if [ "$before_bad" != "$(shasum -a 256 "$WORK/badsize.zip" | cut -d' ' -f1)" ]; then
  echo "FAIL: a refused archive was modified on disk" >&2
  exit 1
fi

# 12. An archive declaring zero entries is refused: an empty walk would otherwise
# report success without normalising anything.
: > "$WORK/noentries.zip"
node -e '
const fs = require("node:fs");
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
fs.writeFileSync(process.argv[1], eocd);
' "$WORK/noentries.zip"
if node scripts/normalize-vsix.mjs "$WORK/noentries.zip" > "$WORK/none.log" 2>&1; then
  echo "FAIL: expected refusal on an archive with zero entries" >&2
  exit 1
fi
if ! grep -q 'zero entries' "$WORK/none.log"; then
  echo "FAIL: refusal on a zero-entry archive did not name the reason" >&2
  cat "$WORK/none.log" >&2
  exit 1
fi

echo "normalize-vsix.mjs test passed"
