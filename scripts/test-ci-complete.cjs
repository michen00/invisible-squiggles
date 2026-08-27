#!/usr/bin/env node

// Tests the ci-complete gate in .github/workflows/ci.yml.
//
// That job is the only context branch protection requires, so what it covers decides
// what a green pull request actually proves. The coverage is a hand-written `needs`
// list, and a list of job names is precisely the kind of constant this repository has
// already watched drift: bot-automerge.yml gated majors on `package-ecosystem = "npm"`
// for its whole life while dependabot emits `npm_and_yarn`, so the branch never ran and
// nothing said so. A job added to ci.yml and forgotten here would fail the same way --
// silently, with every check green and the gate simply not looking at it.
//
// The parse is deliberately narrow rather than a YAML library: this suite runs with
// nothing installed, matching test-markdownlint-table-format.cjs. Narrow parsing fails
// open, which is why `analyze` is run against deliberately broken copies of the real
// workflow further down. A checker only ever pointed at a file that passes is no
// evidence: it cannot tell "nothing is wrong" from "nothing was read".

'use strict';

const fs = require('fs');
const path = require('path');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
const GATE = 'ci-complete';
// The one string this repository shares with settings it cannot read. Branch protection
// requires a context by this exact name, so renaming the job here -- however tidy the
// new name -- leaves every pull request waiting on a context that will never report.
// Changing it means changing the ruleset in the same breath, and this line is the only
// place that says so.
const REQUIRED_NAME = 'CI complete';

// Every problem gets a stable code so the negative cases below can assert which one
// fired, not merely that something did.
function analyze(text) {
  const errors = [];
  const add = (code, detail) => errors.push({ code, detail });
  const lines = text.split('\n');

  // The `jobs:` mapping runs from its own line to the next top-level key, so job ids are
  // the two-space-indented keys inside that window. Block scalars in this file (`run: |`)
  // indent their content far deeper, so they cannot be mistaken for a job.
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start === -1) return [{ code: 'no-jobs-key' }];

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^[^\s#]/.test(lines[i])) {
      end = i;
      break;
    }
  }

  // Recognised job keys, and nothing at this indent gets to be unrecognised. A key
  // carrying a trailing comment -- `security-scan: # dependency audit` -- is a valid
  // declaration, and an earlier version of this regex skipped it: the job vanished from
  // `expected`, so leaving it out of `needs` raised nothing and it sat outside the merge
  // gate. A checker whose purpose is to fail closed cannot quietly ignore a line it does
  // not understand, so anything else at two spaces is a parse error rather than a skip.
  const jobs = [];
  for (let i = start + 1; i < end; i += 1) {
    const line = lines[i];
    if (/^\s*$/.test(line) || /^ {2}#/.test(line)) continue;
    if (!/^ {2}\S/.test(line)) continue;
    const match = /^ {2}([A-Za-z0-9_-]+):\s*(#.*)?$/.exec(line);
    if (match) jobs.push({ id: match[1], line: i });
    else add('unparsable-job-line', line.trim());
  }
  if (errors.some((error) => error.code === 'unparsable-job-line')) return errors;

  // Vacuity guard. Everything below compares against this list, so a parse that returned
  // nothing would report a gate covering nothing as a gate covering everything.
  if (jobs.length < 2) return [{ code: 'too-few-jobs', detail: String(jobs.length) }];

  const gate = jobs.find((job) => job.id === GATE);
  if (!gate) return [{ code: 'no-gate', detail: jobs.map((j) => j.id).join(', ') }];

  // The gate's own body: its keys sit at four spaces, up to wherever the next job starts.
  const gateEnd = jobs.reduce(
    (limit, job) => (job.line > gate.line && job.line < limit ? job.line : limit),
    end
  );
  const body = lines.slice(gate.line + 1, gateEnd);

  const valueOf = (key) => {
    const pattern = new RegExp(`^ {4}${key}:\\s*(.*)$`);
    for (let i = 0; i < body.length; i += 1) {
      const match = pattern.exec(body[i]);
      if (!match) continue;
      if (match[1] !== '') return match[1].trim();
      // Block sequence: `needs:` on its own line, entries as `      - id` beneath it.
      const items = [];
      for (let j = i + 1; j < body.length && /^ {6}- /.test(body[j]); j += 1) {
        items.push(body[j].replace(/^ {6}- /, '').trim());
      }
      return `[${items.join(', ')}]`;
    }
    return null;
  };

  // A computed name is the bug this gate exists to avoid: the checks it replaced reported
  // under names ci.yml interpolated, so a matrix edit rewrote branch protection. The
  // ruleset names this job as a literal string, and it has to stay that exact one.
  const name = valueOf('name');
  if (name === null) add('no-name');
  else if (name.includes('${{')) add('computed-name', name);
  else if (name !== REQUIRED_NAME) add('renamed', name);

  // Without `always()` a failed dependency leaves this job skipped, and GitHub treats a
  // skipped required check as satisfied -- the gate would pass by not running.
  const condition = valueOf('if');
  if (condition === null) add('no-if');
  else if (!/^always\(\)$/.test(condition)) add('wrong-if', condition);

  const needsRaw = valueOf('needs');
  if (needsRaw === null) {
    add('no-needs');
    return errors;
  }

  const declared = needsRaw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  const expected = jobs.map((job) => job.id).filter((id) => id !== GATE);

  const missing = expected.filter((id) => !declared.includes(id));
  if (missing.length !== 0) add('missing', missing.join(', '));

  // A phantom entry is not cosmetic: `needs` naming a job that no longer exists makes
  // the whole workflow invalid, and no run reports at all.
  const phantom = declared.filter((id) => !expected.includes(id));
  if (phantom.length !== 0) add('phantom', phantom.join(', '));

  const duplicates = declared.filter((id, index) => declared.indexOf(id) !== index);
  if (duplicates.length !== 0) add('duplicate', duplicates.join(', '));

  return errors;
}

let failures = 0;
const source = fs.readFileSync(WORKFLOW, 'utf8');

const live = analyze(source);
if (live.length !== 0) {
  failures += 1;
  console.error('FAIL: .github/workflows/ci.yml does not satisfy the gate contract');
  for (const error of live) {
    console.error(`  ${error.code}${error.detail ? `: ${error.detail}` : ''}`);
  }
}

// Each case breaks the real workflow in one way and names the code that must fire. This
// is what separates a suite that checks the gate from one that merely reads it.
const NEEDS =
  '    needs: [pre-commit, unit-tests, package, get-vscode-version, e2e-tests]';
const CASES = [
  [
    'a job left out of needs',
    'missing',
    (t) =>
      t.replace(
        NEEDS,
        '    needs: [pre-commit, unit-tests, get-vscode-version, e2e-tests]'
      ),
  ],
  [
    'a job added but not registered',
    'missing',
    (t) => `${t}\n  brand-new-job:\n    name: Brand new\n    runs-on: ubuntu-latest\n`,
  ],
  [
    'needs naming a job that does not exist',
    'phantom',
    (t) => t.replace(NEEDS, `${NEEDS.slice(0, -1)}, typo-job]`),
  ],
  [
    'the same job listed twice',
    'duplicate',
    (t) => t.replace(NEEDS, `${NEEDS.slice(0, -1)}, package]`),
  ],
  [
    'a condition that skips on failure',
    'wrong-if',
    (t) => t.replace('    if: always()', '    if: success()'),
  ],
  ['no condition at all', 'no-if', (t) => t.replace('    if: always()\n', '')],
  [
    'a job declared with a trailing comment, left out of needs',
    'missing',
    (t) => `${t}\n  audit-job: # dependency audit\n    runs-on: ubuntu-latest\n`,
  ],
  [
    'a line under jobs the parser cannot read',
    'unparsable-job-line',
    (t) => `${t}\n  not a job key at all\n`,
  ],
  [
    'a name the ruleset does not know',
    'renamed',
    (t) => t.replace(`    name: ${REQUIRED_NAME}`, '    name: CI done'),
  ],
  [
    'a name the matrix could rename',
    'computed-name',
    (t) =>
      t.replace('    name: CI complete', '    name: CI complete (${{ matrix.os }})'),
  ],
  ['a workflow with no jobs key', 'no-jobs-key', () => 'name: CI\non:\n  push:\n'],
  [
    'a jobs block holding only the gate',
    'too-few-jobs',
    () => `jobs:\n  ${GATE}:\n    name: CI complete\n    runs-on: ubuntu-latest\n`,
  ],
];

for (const [label, code, mutate] of CASES) {
  const mutated = mutate(source);
  if (mutated === source) {
    failures += 1;
    console.error(
      `FAIL: the mutation for "${label}" changed nothing; the case is stale`
    );
    continue;
  }
  const codes = analyze(mutated).map((error) => error.code);
  if (!codes.includes(code)) {
    failures += 1;
    console.error(`FAIL: ${label} was not caught`);
    console.error(
      `  expected ${code}, got ${codes.length === 0 ? 'no errors' : codes.join(', ')}`
    );
  }
}

// The block-sequence spelling of `needs` is equivalent YAML, and a reformat must not be
// read as a gate covering nothing.
const asBlock = source.replace(
  NEEDS,
  [
    '    needs:',
    'pre-commit',
    'unit-tests',
    'package',
    'get-vscode-version',
    'e2e-tests',
  ].join('\n      - ')
);
if (asBlock === source) {
  failures += 1;
  console.error('FAIL: the block-sequence rewrite changed nothing; the case is stale');
} else if (analyze(asBlock).length !== 0) {
  failures += 1;
  console.error('FAIL: `needs` written as a block sequence was not understood');
  console.error(
    `  ${analyze(asBlock)
      .map((e) => e.code)
      .join(', ')}`
  );
}

if (failures !== 0) {
  console.error(`ci-complete: ${failures} test(s) failed`);
  process.exit(1);
}

console.log(`ci-complete test passed (${CASES.length + 1} negative cases)`);
