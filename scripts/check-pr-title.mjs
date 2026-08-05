#!/usr/bin/env node

// Fail a pull request whose title would put a meaningless entry in the user-facing
// changelog.
//
// The title matters more than it looks. This repository squash-merges, and when a
// branch carries more than one commit GitHub uses the *pull request title* as the
// squash subject. That subject is what git-cliff reads. So the title -- a field no
// hook or linter currently touches -- decides what users see in CHANGELOG.md and in
// the marketplace changelog tab, while gitlint only ever sees local commit messages.
//
// Two ways that goes wrong, both of which have happened here:
//
//   - A change with no user-facing effect titled `feat:` or `fix:`. Release tooling
//     and CI work landed as "feat: draft releases so they carry the vsix" and
//     "feat: add prep-release and tag make targets"; both would have appeared under
//     "Features" for readers who cannot see a Makefile target, and both were caught
//     by accident while looking at something else.
//   - A title that is not conventional at all. cliff.toml ends with a catch-all
//     `^.*` parser that is *not* skipped, so an unrecognised prefix does not fall out
//     of the changelog -- it lands in "Other".
//
// Derived from cliff.toml rather than from a hardcoded list of types, so that
// changing which types are skipped changes this check too. The parse is asserted
// against known cases below; a cliff.toml this cannot read fails the run instead of
// passing it.
//
// Usage:
//   node scripts/check-pr-title.mjs "<pr title>" < changed-files.txt
//
// Exit codes: 0 pass, 1 the title needs changing, 2 this script could not do its job.

import { readFileSync } from 'node:fs';

const CLIFF = 'cliff.toml';
const CATCH_ALL = '^.*';

/**
 * Files that are shipped in the VSIX or decide what the VSIX contains, and so can
 * change what a user of the installed extension experiences.
 *
 *   - `package.json` -- the manifest: contributed commands, settings, engine range.
 *   - `icon.png` -- the extension's visible identity in the marketplace and the
 *     Extensions view. `.vscodeignore` unignores it and the manifest names it.
 *   - `.vscodeignore` -- an `**` deny-all followed by `!` allowances, so it decides
 *     what `vsce package` puts in the VSIX. Editing it changes the installed bytes.
 *
 * `README.md`, `CHANGELOG.md` and `LICENSE` are also unignored, and are deliberately
 * *not* here. They document the extension rather than being it, their conventional
 * type is `docs:`, and cliff.toml skips that -- so including them could only ever
 * manufacture a pass for something like `feat: reword the README`.
 *
 * Everything else in the repository -- workflows, scripts, the Makefile, docs,
 * tooling configuration -- can be rewritten wholesale without altering the installed
 * extension, which is exactly why a `feat:` covering only those files is a mislabel.
 * `src/test/` is excluded for the same reason: tests are `test:`, which cliff skips.
 *
 * Known limitation, whole-file granularity: a `package.json` diff touching only npm
 * scripts or devDependency ranges counts as user-facing here. Narrowing it to the
 * manifest keys that users can observe would mean reading the base revision of the
 * file, and the fail-open half of that (base unavailable) leaves the same hole while
 * the fail-closed half adds a new way for this check to block a pull request. The
 * exposure is small in practice because dependency bumps and version bumps arrive
 * under types cliff.toml skips, so they never reach this predicate at all.
 */
const PACKAGED_FILES = new Set(['package.json', 'icon.png', '.vscodeignore']);

function isUserFacing(path) {
  if (PACKAGED_FILES.has(path)) return true;
  return path.startsWith('src/') && !path.startsWith('src/test/');
}

/**
 * Pull `commit_parsers` out of cliff.toml.
 *
 * A targeted line scan rather than a TOML library, because Node ships no TOML parser
 * and adding a dependency to read one array is a poor trade. The entries are one per
 * line and uniform. Anything that does not look like an entry is ignored, and the
 * assertions in `selfCheck` decide whether what came back is trustworthy.
 */
function parseCommitParsers(toml) {
  const start = toml.indexOf('commit_parsers = [');
  if (start === -1) return [];
  const end = toml.indexOf('\n]', start);
  if (end === -1) return [];
  const block = toml.slice(start, end);

  const parsers = [];
  for (const line of block.split('\n')) {
    const match = /^\s*\{\s*message\s*=\s*"((?:[^"\\]|\\.)*)"(.*)$/.exec(line);
    if (!match) continue;
    parsers.push({
      // TOML basic strings process backslash escapes, so `"^\\d+"` in the file is the
      // regex `^\d+`. Only the doubled backslash appears in this config.
      message: match[1].replace(/\\\\/g, '\\'),
      skip: /\bskip\s*=\s*true\b/.test(match[2]),
    });
  }
  return parsers;
}

/** Classify a subject the way git-cliff does: first matching parser wins. */
function classify(parsers, subject) {
  for (const parser of parsers) {
    let re;
    try {
      re = new RegExp(parser.message);
    } catch {
      continue;
    }
    if (re.test(subject)) return parser;
  }
  return null;
}

/**
 * Refuse to run on a cliff.toml this script has misread.
 *
 * Without this, a reformatted config would yield zero parsers, every title would
 * classify as "not in the changelog", and the check would pass everything while
 * appearing to work -- the failure mode it exists to prevent, applied to itself.
 */
function selfCheck(parsers) {
  const problems = [];
  if (parsers.length < 10) {
    problems.push(`only ${parsers.length} parsers found in ${CLIFF}`);
  }
  const expectations = [
    ['feat: add a thing', false, 'a feature must reach the changelog'],
    ['fix: repair a thing', false, 'a fix must reach the changelog'],
    ['ci: adjust a workflow', true, 'ci must be skipped'],
    ['docs: reword a page', true, 'docs must be skipped'],
    ['build(deps): bump a dep', true, 'dependency bumps must be skipped'],
    ['chore(deps-dev): bump a dep', true, 'dev dependency bumps must be skipped'],
  ];
  for (const [subject, wantSkip, why] of expectations) {
    const parser = classify(parsers, subject);
    if (!parser) {
      problems.push(`"${subject}" matched no parser at all`);
    } else if (parser.skip !== wantSkip) {
      problems.push(`"${subject}" was ${parser.skip ? 'skipped' : 'kept'} -- ${why}`);
    }
  }
  return problems;
}

const title = process.argv[2];
if (!title) {
  console.error(`Usage: ${process.argv[1]} "<pr title>" < changed-files.txt`);
  process.exit(2);
}

const changed = readFileSync(0, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

let parsers;
try {
  parsers = parseCommitParsers(readFileSync(CLIFF, 'utf8'));
} catch (error) {
  console.error(`::error::Could not read ${CLIFF}: ${error.message}`);
  process.exit(2);
}

const problems = selfCheck(parsers);
if (problems.length > 0) {
  console.error(`::error::This check no longer agrees with ${CLIFF}, so it is not in`);
  console.error('::error::a position to judge anything and will not pretend to be.');
  console.error('::error::Either the parsing in scripts/check-pr-title.mjs has been');
  console.error(`::error::outgrown by the format of ${CLIFF}, or which types reach`);
  console.error('::error::the changelog was changed deliberately -- in which case');
  console.error('::error::update the expectations in selfCheck to match the new');
  console.error('::error::policy. Failing here is the point: silently classifying');
  console.error('::error::every title as "not in the changelog" would leave a green');
  console.error('::error::check guarding nothing.');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(2);
}

const parser = classify(parsers, title);
if (!parser) {
  console.error(`::error::"${title}" matched no parser in ${CLIFF}.`);
  process.exit(2);
}

if (parser.skip) {
  console.log(
    `"${title}" is skipped by ${CLIFF}; it will not appear in the changelog.`
  );
  process.exit(0);
}

if (parser.message === CATCH_ALL) {
  console.error(`::error::"${title}" is not a conventional commit subject.`);
  console.error(`::error::${CLIFF}'s catch-all parser is not skipped, so this would`);
  console.error('::error::appear in the user-facing changelog under "Other" rather');
  console.error('::error::than being filtered out. Prefix it with a type:');
  console.error('::error::feat, fix, perf, revert, docs, build, ci, test, refactor,');
  console.error('::error::style or chore.');
  process.exit(1);
}

const userFacing = changed.filter(isUserFacing);
if (userFacing.length > 0) {
  console.log(
    `"${title}" belongs in the changelog, and ${userFacing.length} user-facing`
  );
  console.log(`file(s) changed: ${userFacing.join(', ')}`);
  process.exit(0);
}

console.error(`::error::"${title}" would appear in the user-facing changelog, but`);
console.error('::error::this pull request changes nothing a user of the extension');
console.error('::error::can observe -- nothing under src/ outside src/test/, and');
console.error(`::error::none of ${[...PACKAGED_FILES].join(', ')}.`);
console.error('::error::');
console.error('::error::Retitle it with a type cliff.toml skips. ci for workflows');
console.error('::error::and release tooling, build for dependencies and packaging,');
console.error('::error::docs for documentation, test, refactor, style or chore.');
console.error('::error::');
console.error(`::error::The title becomes the squash commit subject, so "${title}"`);
console.error('::error::is what readers of CHANGELOG.md and the marketplace');
console.error('::error::changelog tab would be shown.');
console.error('');
console.error(`Changed files (${changed.length}):`);
for (const path of changed) console.error(`  ${path}`);
process.exit(1);
