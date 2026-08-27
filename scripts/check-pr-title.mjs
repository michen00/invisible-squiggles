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
// Four ways that goes wrong. The first has happened here twice; the rest are shapes
// git-cliff was confirmed to accept, caught in review before they could:
//
//   - A change with no user-facing effect titled `feat:` or `fix:`. Release tooling
//     and CI work landed as "feat: draft releases so they carry the vsix" and
//     "feat: add prep-release and tag make targets"; both would have appeared under
//     "Features" for readers who cannot see a Makefile target, and both were caught
//     by accident while looking at something else.
//   - A title that is not conventional at all. cliff.toml ends with a catch-all
//     `^.*` parser that is *not* skipped, so an unrecognised prefix does not fall out
//     of the changelog -- it lands in "Other". A subject that opens with a kept type
//     but drops the colon is worse still: cliff's parsers are prefix matches, so
//     "feat add setting" is filed under Features, and since the conventional parse
//     then fails the raw subject is printed verbatim, type and all.
//   - A breaking marker on a type that is otherwise skipped. cliff.toml sets
//     `protect_breaking_commits`, which exempts breaking changes from a skipping
//     parser, so "ci!: drop the release workflow" still reaches the changelog under
//     Continuous Integration. Confirmed against git-cliff 2.13.1: with the flag on
//     both `ci!:` and `docs(scope)!:` are rendered, and with it off both vanish.
//   - A type outside this repository's vocabulary. Because the parsers match on
//     prefix, `^feat` also accepts "feature:" and `^fix` accepts "fixes:", either of
//     which lands in a user-facing group under a type gitlint would have rejected on
//     a commit message -- and gitlint never sees a title.
//
// Derived from configuration rather than from hardcoded lists. Which types reach the
// changelog, and whether a breaking marker overrides a skip, come from cliff.toml; the
// accepted type vocabulary comes from .gitlint. The cliff.toml parse is asserted
// against known cases below, and a configuration this cannot read fails the run rather
// than passing everything.
//
// Usage:
//   node scripts/check-pr-title.mjs "<pr title>" < changed-files.txt
//
// Exit codes: 0 pass, 1 the title needs changing, 2 this script could not do its job.

import { readFileSync } from 'node:fs';

const CLIFF = 'cliff.toml';
const CATCH_ALL = '^.*';
const UNPARSABLE = Symbol('unparsable');

// A breaking change in the Conventional Commits sense: `!` immediately before the
// colon, after the type or the scope. The other spelling, a `BREAKING CHANGE:` footer,
// cannot be seen from here -- see the note below.
const BREAKING = /^[a-z]+(\([^()]+\))?!:/;

// A conventional subject: type, optional scope, optional `!`, then a colon, a space,
// and something. cliff's own parsers are looser than this on purpose -- `^feat` is a
// prefix match that also accepts "feat add setting" -- so the shape is checked
// separately for any title that reaches the changelog. Group 1 is the type, which is
// then checked against the vocabulary below for the same reason: `^feat` also accepts
// "feature:" and `^fix` accepts "fixes:".
const CONVENTIONAL = /^([a-z]+)(\([^()]+\))?!?: \S/;

const GITLINT = '.gitlint';

// The commit types this repository accepts. gitlint's
// contrib-title-conventional-commits rule enforces this vocabulary on every local
// commit message, and a pull request title never passes through gitlint -- GitHub
// composes the squash subject server-side, after every hook has run -- so this check is
// the only place the same list can be applied to it.
//
// Taken from `[contrib-title-conventional-commits] types` in .gitlint when that is set,
// so overriding the vocabulary there changes this check too. It is commented out today,
// which means gitlint is enforcing its own default; the fallback is that default.
const DEFAULT_TYPES = [
  'fix',
  'feat',
  'chore',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'revert',
  'ci',
  'build',
];

// Note on breaking footers: the other way to declare a breaking change is a
// `BREAKING CHANGE:` footer in the commit body. GitHub builds the squash body from the
// branch's commit messages on this repository (squash_merge_commit_message is
// COMMIT_MESSAGES), so a footer in one of those commits can make the squashed commit
// breaking while the title says nothing, and this check is handed nothing but the
// title. gitlint does see those commit messages, which is the nearest thing to cover.

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
 * Most of the rest of the repository -- workflows, scripts, the Makefile, docs, tooling
 * configuration -- can be rewritten wholesale without altering the installed extension,
 * which is exactly why a `feat:` covering only those files is a mislabel. `src/test/` is
 * excluded for the same reason: tests are `test:`, which cliff skips.
 *
 * `esbuild.js` is the exception to that sentence, and is still deliberately absent. It
 * does decide the installed bytes -- it writes `dist/extension.js`, the entrypoint the
 * VSIX ships -- so `entryPoints`, `outfile`, `external`, `format`, `minify` and
 * `sourcemap` are as user-facing as anything under `src/`. What keeps it out is that the
 * file mixes those with the build-time problem-matcher plugin, and whole-file
 * granularity cannot tell the two apart. The history says which way to err: no commit
 * has ever changed any of those keys, while the one substantive change to the file was a
 * null check in the plugin (42cd7be), which predates this checker and sits in
 * CHANGELOG.md as noise. Admitting the file would re-permit that entry to buy a `fix:`
 * this repository has never needed.
 *
 * The cost is accepted rather than overlooked: a change to those keys alone has to take
 * `build:` and have its changelog line written by hand. The nearest real precedent went
 * the other way -- 7292222 fixed minification by correcting the `--production` flag in
 * package.json's script, which this predicate already admits.
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

/**
 * Strip TOML line comments.
 *
 * Only used for presence tests, where a key named inside a comment must not read as
 * configuration. Quote tracking is deliberately shallow: it handles basic strings,
 * which is what this file uses, and anything it gets wrong leaves a `#` in place --
 * making the scan see more text, not less, which is the safe direction for a test
 * whose only effect is to halt the run.
 */
function stripTomlComments(toml) {
  return toml
    .split('\n')
    .map((line) => {
      let inString = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"' && line[index - 1] !== '\\') {
          inString = !inString;
        } else if (char === '#' && !inString) {
          return line.slice(0, index);
        }
      }
      return line;
    })
    .join('\n');
}

/**
 * Read `protect_breaking_commits` out of cliff.toml.
 *
 * When it is on, git-cliff exempts breaking changes from a parser that would skip
 * them, so a breaking title reaches the changelog whatever its type.
 *
 * Returns `true`, `false`, or `UNPARSABLE`. Three cases, deliberately distinct:
 * the flag reads cleanly; the key is absent, which is git-cliff's own default of off;
 * or the key is present in a form this scan does not understand. That last case used
 * to fall in with "absent" and quietly disagree with git-cliff about every breaking
 * title, so it now stops the run instead -- the same reasoning as `selfCheck`.
 *
 * The presence test runs on comment-stripped text, because commenting the line out is
 * how a config turns the option off and git-cliff reads that as absent. Testing the
 * raw file made every title exit 2 over a line git-cliff never sees.
 */
function parseProtectBreaking(toml) {
  const setting =
    /^[ \t]*protect_breaking_commits[ \t]*=[ \t]*(true|false)[ \t]*(#.*)?$/m;
  const match = setting.exec(toml);
  if (match) return match[1] === 'true';
  if (/protect_breaking_commits/.test(stripTomlComments(toml))) return UNPARSABLE;
  return false;
}

/**
 * Read the accepted commit types out of .gitlint, falling back to gitlint's default.
 *
 * Section-scoped on purpose: `types` is a plausible key elsewhere in that file, and the
 * only one that governs commit types is the one inside the contrib rule's own section.
 * The commented-out example in .gitlint does not match, because a comment cannot open a
 * section header. An empty list is treated as unreadable rather than as "reject
 * everything".
 */
function parseGitlintTypes(ini) {
  const header = /^\[contrib-title-conventional-commits\][ \t]*$/m.exec(ini);
  if (!header) return DEFAULT_TYPES;
  const rest = ini.slice(header.index + header[0].length);
  const nextSection = /^\[/m.exec(rest);
  const block = nextSection ? rest.slice(0, nextSection.index) : rest;
  const declared = /^[ \t]*types[ \t]*=[ \t]*(.+)$/m.exec(block);
  if (!declared) return DEFAULT_TYPES;
  const types = declared[1]
    .split(',')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
  return types.length > 0 ? types : UNPARSABLE;
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

let toml;
try {
  toml = readFileSync(CLIFF, 'utf8');
} catch (error) {
  console.error(`::error::Could not read ${CLIFF}: ${error.message}`);
  process.exit(2);
}

const parsers = parseCommitParsers(toml);
const protectBreaking = parseProtectBreaking(toml);

let acceptedTypes;
try {
  acceptedTypes = parseGitlintTypes(readFileSync(GITLINT, 'utf8'));
} catch {
  // No .gitlint at all is not a problem: gitlint's default vocabulary is what the
  // contrib rule enforces when the section is absent, which is the fallback anyway.
  acceptedTypes = DEFAULT_TYPES;
}

if (acceptedTypes === UNPARSABLE) {
  console.error(`::error::${GITLINT} declares an empty commit-type list, so this`);
  console.error('::error::check cannot tell which types are acceptable. Either list');
  console.error('::error::the types under [contrib-title-conventional-commits] or');
  console.error("::error::remove the key to fall back to gitlint's default.");
  process.exit(2);
}

if (protectBreaking === UNPARSABLE) {
  console.error(`::error::${CLIFF} sets protect_breaking_commits in a form this`);
  console.error('::error::script cannot read, so it cannot tell whether a breaking');
  console.error('::error::title on a skipped type reaches the changelog. Guessing');
  console.error('::error::would put this check into silent disagreement with');
  console.error('::error::git-cliff, which is worse than stopping. Expected a line');
  console.error('::error::reading `protect_breaking_commits = true` or `= false`,');
  console.error('::error::with an optional trailing comment.');
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

const breaking = BREAKING.test(title);
const protectedBreaking = breaking && protectBreaking;

if (parser.skip && !protectedBreaking) {
  console.log(
    `"${title}" is skipped by ${CLIFF}; it will not appear in the changelog.`
  );
  process.exit(0);
}

if (parser.message === CATCH_ALL) {
  console.error(`::error::"${title}" carries no type that ${CLIFF} recognises,`);
  console.error('::error::whether because it has none or because that one is not in');
  console.error(`::error::the list. ${CLIFF}'s catch-all parser is not skipped, so it`);
  console.error('::error::would appear in the user-facing changelog under "Other"');
  console.error('::error::rather than being filtered out. Use a known type:');
  console.error(`::error::${acceptedTypes.join(', ')}.`);
  process.exit(1);
}

const shape = CONVENTIONAL.exec(title);
if (!shape) {
  console.error(`::error::"${title}" reaches the changelog, but it is not a`);
  console.error('::error::conventional subject: that is type, an optional (scope),');
  console.error('::error::an optional !, then a colon, a space and a description.');
  console.error('::error::');
  console.error(`::error::${CLIFF}'s parsers are prefix matches, so a subject like`);
  console.error('::error::"feat add setting" is grouped under Features anyway, and');
  console.error('::error::because the conventional parse then fails git-cliff prints');
  console.error('::error::the raw subject -- the changelog entry reads');
  console.error('::error::"- feat add setting", type included.');
  process.exit(1);
}

const type = shape[1];
if (!acceptedTypes.includes(type)) {
  console.error(`::error::"${title}" reaches the changelog under the type "${type}",`);
  console.error(`::error::which is not one this repository uses. ${GITLINT} accepts:`);
  console.error(`::error::${acceptedTypes.join(', ')}.`);
  console.error('::error::');
  console.error(`::error::${CLIFF}'s parsers match on prefix, so "feature:" is filed`);
  console.error('::error::as a feature and "fixes:" as a fix even though neither is a');
  console.error('::error::type in that list. gitlint enforces it on commit messages,');
  console.error(
    '::error::but GitHub composes the squash subject from this title after'
  );
  console.error('::error::gitlint has run, so the title is the only place it can be');
  console.error('::error::applied.');
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
if (protectedBreaking) {
  console.error(`::error::${CLIFF} skips ${parser.message} titles, but it also sets`);
  console.error('::error::protect_breaking_commits, which exempts breaking changes');
  console.error('::error::from a skipping parser -- so the `!` is the reason this');
  console.error('::error::title reaches the changelog. Drop it if nothing a user of');
  console.error('::error::the extension depends on breaks, and describe the impact');
  console.error('::error::on contributors in the body instead.');
} else {
  console.error('::error::Retitle it with a type cliff.toml skips. ci for workflows');
  console.error('::error::and release tooling, build for dependencies and packaging,');
  console.error('::error::docs for documentation, test, refactor, style or chore.');
}
console.error('::error::');
console.error(`::error::The title becomes the squash commit subject, so "${title}"`);
console.error('::error::is what readers of CHANGELOG.md and the marketplace');
console.error('::error::changelog tab would be shown.');
console.error('');
console.error(`Changed files (${changed.length}):`);
for (const path of changed) console.error(`  ${path}`);
process.exit(1);
