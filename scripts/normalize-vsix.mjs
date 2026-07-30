#!/usr/bin/env node
// Make a .vsix byte-reproducible by pinning the two per-entry fields that vary
// with the machine that built it: the modification time and the Unix file mode.
//
// A .vsix is a zip, and vsce takes both fields from the file on disk.
//
// TIME. Five entries are regenerated on every package run --
// extension.vsixmanifest and [Content_Types].xml (written by vsce), readme.md
// and changelog.md (rewritten by the Makefile's PREPARE_DOCS), and
// dist/extension.js (rebuilt by esbuild). Their mtimes are wall-clock, so two
// packages of one commit differ even though every entry's CRC matches.
//
// MODE. vsce calls yazl's addFile with `mode: undefined` for on-disk files
// (node_modules/@vscode/vsce/out/package.js), so yazl copies stat().mode into
// the central directory's external-attributes word (node_modules/yazl/index.js:
// `if (options.mode == null) entry.setFileAttributesMode(stats.mode)`). Git and
// esbuild create files as 0666 & ~umask, so the digest becomes a function of the
// builder's umask: a clone under the umask 002 that Debian/Ubuntu give regular
// users yields 0664 files, and umask 077 yields 0600. Entries added via
// addBuffer (the two vsce-generated ones, readme.md, changelog.md) are immune at
// yazl's fixed 0o100664, and vsce pins extension/package.json to 0o100644, so
// the exposure is the remaining on-disk files -- here icon.png, LICENSE.txt and
// dist/extension.js.
//
// Left unpinned, mode variance is invisible to a same-machine check: two builds
// in one shell share a umask. It surfaces only where it does the most damage --
// a third party rebuilding a signed tag to compare against the published
// artifact sees a digest mismatch while every entry's content is identical,
// which reads as tampering rather than as a umask difference.
//
// Both are rewritten in place -- in each central directory record, and the DOS
// words additionally in each local file header (which carries no mode field) --
// and nothing is ever re-compressed. The deflate streams, CRCs, and entry order
// are byte-for-byte untouched, so normalisation cannot corrupt the package the
// way a decompress/recompress round trip could.
//
// The timestamp is a hard-coded constant, 1980-01-01 00:00:00 -- the earliest the
// DOS format can represent. This does not make SOURCE_DATE_EPOCH irrelevant: the
// Makefile pins it too, because vsce uses it to gate entry SORTING as well as
// mtimes, and unsorted entries are laid out in filesystem order. This pass still
// rewrites the DOS words afterwards because vsce converts that epoch to DOS
// fields in LOCAL time, which would otherwise make the digest depend on TZ.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

// Values the EOCD uses to signal "this field overflowed, read ZIP64 instead".
const ZIP64_COUNT_SENTINEL = 0xffff;
const ZIP64_OFFSET_SENTINEL = 0xffffffff;

// 1980-01-01 00:00:00 in DOS format: date = (year-1980)<<9 | month<<5 | day.
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

// Canonical Unix modes. The executable bit is preserved rather than flattened:
// umask only ever clears group/other permission bits, so an executable entry is
// executable because git's index says so, and that is meaningful to anything the
// package ships. Everything else collapses to the canonical form.
const MODE_FILE = 0o100644;
const MODE_FILE_EXEC = 0o100755;
const MODE_DIR = 0o040755;

// Extra-field header ids this script must refuse. vsce emits no extra fields at
// all today, but if that ever changes these would silently defeat the guarantees:
// the timestamp/mode carriers hold a second copy of a field we normalise, and the
// ZIP64 record relocates the very offsets the walk relies on. Fail loudly.
const UNSAFE_EXTRA_IDS = new Map([
  [0x0001, 'ZIP64 extended information (relocates sizes and local header offsets)'],
  [0x000a, 'NTFS timestamps (holds its own mtime)'],
  [0x000d, 'PKWARE Unix (holds its own mtime and Unix mode)'],
  [0x5455, 'extended timestamp UT (holds its own mtime)'],
  [0x5855, 'Info-ZIP Unix UX (holds its own mtime)'],
  [0x7875, 'Info-ZIP Unix uid/gid ux (holds owner metadata)'],
]);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/** Locate the End Of Central Directory record by scanning back from the tail. */
function findEocd(buf) {
  // The EOCD is 22 bytes plus a trailing comment of up to 65535 bytes.
  const earliest = Math.max(0, buf.length - (22 + 0xffff));
  for (let i = buf.length - 22; i >= earliest; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      return i;
    }
  }
  return -1;
}

function assertNoUnsafeExtras(buf, start, length, label) {
  let offset = start;
  const end = start + length;
  while (offset + 4 <= end) {
    const headerId = buf.readUInt16LE(offset);
    const size = buf.readUInt16LE(offset + 2);
    const reason = UNSAFE_EXTRA_IDS.get(headerId);
    if (reason) {
      fail(
        `${label} carries an unsupported extra field 0x${headerId
          .toString(16)
          .padStart(4, '0')} -- ${reason}. Normalising it would leave the ` +
          'package irreproducible, or patch the wrong bytes. Teach ' +
          'scripts/normalize-vsix.mjs to handle it.'
      );
    }
    offset += 4 + size;
  }
}

const target = process.argv[2];
if (!target) {
  fail('usage: node scripts/normalize-vsix.mjs <file.vsix>');
}

// Reported explicitly: the Makefile derives this name from package.json, so a
// missing file usually means the version and the packaged filename disagree.
// A raw ENOENT stack trace buries that.
if (!existsSync(target)) {
  fail(`${target} does not exist.`);
}

const buf = readFileSync(target);

const eocd = findEocd(buf);
if (eocd === -1) {
  fail(`${target} is not a zip archive (no end-of-central-directory record).`);
}

const entryCount = buf.readUInt16LE(eocd + 10);
const centralDirSize = buf.readUInt32LE(eocd + 12);
const centralDirOffset = buf.readUInt32LE(eocd + 16);

// Detect ZIP64 from the EOCD's overflow sentinels rather than by scanning for a
// ZIP64 signature: compressed data can contain any byte sequence, so a whole-file
// scan would false-match. This catches the case that matters -- the classic fields
// having overflowed, so the real values live in the ZIP64 record and the 32-bit
// offsets walked below are wrong. An archive that merely carries a ZIP64 record
// while its classic fields still hold true values is walked safely, and the
// exact-consumption assertion after the loop is the backstop for anything else.
if (entryCount === ZIP64_COUNT_SENTINEL || centralDirOffset === ZIP64_OFFSET_SENTINEL) {
  fail(
    'ZIP64 archive detected. The 32-bit central-directory offsets this script ' +
      'walks are not valid for ZIP64, so patching could corrupt the package.'
  );
}

// A .vsix always has entries. Zero means the archive is not what the caller
// thinks it is, and an empty walk would otherwise "succeed" without doing
// anything -- the same fail-open shape this script's guards exist to avoid.
if (entryCount === 0) {
  fail(`${target} declares zero entries; nothing to normalise.`);
}

// Walk the central directory. It is the authoritative index -- scanning the
// whole file for local-header signatures would false-match on compressed data.
let cursor = centralDirOffset;
let patched = 0;
for (let i = 0; i < entryCount; i++) {
  if (cursor + 46 > buf.length || buf.readUInt32LE(cursor) !== SIG_CENTRAL) {
    fail(`central directory record ${i + 1} of ${entryCount} is malformed.`);
  }

  const nameLength = buf.readUInt16LE(cursor + 28);
  const extraLength = buf.readUInt16LE(cursor + 30);
  const commentLength = buf.readUInt16LE(cursor + 32);
  const localOffset = buf.readUInt32LE(cursor + 42);
  const name = buf.toString('utf8', cursor + 46, cursor + 46 + nameLength);

  assertNoUnsafeExtras(buf, cursor + 46 + nameLength, extraLength, `${name} (central)`);

  // Central directory record: time at +12, date at +14.
  buf.writeUInt16LE(DOS_TIME, cursor + 12);
  buf.writeUInt16LE(DOS_DATE, cursor + 14);

  // External file attributes at +38 (+36 is the *internal* attributes word): the
  // high 16 bits are the Unix mode, the low 16 the DOS attribute bits. Only the
  // mode varies with the builder, so the DOS bits are carried through untouched
  // rather than invented.
  const attributes = buf.readUInt32LE(cursor + 38);
  const dosAttributes = attributes & 0xffff;
  const unixMode = (attributes >>> 16) & 0xffff;
  let canonicalMode;
  if (name.endsWith('/')) {
    canonicalMode = MODE_DIR;
  } else {
    canonicalMode = (unixMode & 0o111) === 0 ? MODE_FILE : MODE_FILE_EXEC;
  }
  buf.writeUInt32LE((((canonicalMode << 16) >>> 0) | dosAttributes) >>> 0, cursor + 38);

  if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== SIG_LOCAL) {
    fail(`${name} has no local file header at offset ${localOffset}.`);
  }
  const localExtraLength = buf.readUInt16LE(localOffset + 28);
  const localNameLength = buf.readUInt16LE(localOffset + 26);
  assertNoUnsafeExtras(
    buf,
    localOffset + 30 + localNameLength,
    localExtraLength,
    `${name} (local)`
  );

  // Local file header: time at +10, date at +12.
  buf.writeUInt16LE(DOS_TIME, localOffset + 10);
  buf.writeUInt16LE(DOS_DATE, localOffset + 12);

  cursor += 46 + nameLength + extraLength + commentLength;
  patched++;
}

// The walk must land exactly on the end of the central directory. Comparing
// `patched` against entryCount would be a tautology -- it increments once per
// iteration of a loop bounded by entryCount. This instead proves the cursor
// arithmetic tracked the real record layout: a desync from a miscounted field,
// an unexpected structure, or a ZIP64 record that slipped past the sentinel check
// lands somewhere else, and patching would have written into the wrong bytes.
const consumed = cursor - centralDirOffset;
if (consumed !== centralDirSize) {
  fail(
    `central directory walk consumed ${consumed} bytes but the ` +
      `end-of-central-directory record declares ${centralDirSize}. The archive ` +
      'layout is not what this script assumes; it has not been modified.'
  );
}

writeFileSync(target, buf);
console.log(`Normalised timestamps and modes for ${patched} entries in ${target}.`);
