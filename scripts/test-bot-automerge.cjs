#!/usr/bin/env node

// Tests what .github/workflows/bot-automerge.yml and bot-automerge-disarm.yml do, by
// running their shell steps against a stand-in for `gh`:
//
//   - a Dependabot patch, minor or major update is eligible to merge, in every ecosystem
//     dependabot.yml declares;
//   - an update type the workflow does not recognize is held for a person, and the
//     arming step acts only on the eligibility step's verdict;
//   - the `do not auto-merge` label still stops arming, and still disarms a pull request
//     that is already armed;
//   - the ecosystem names are Dependabot's slugs, not the keys dependabot.yml is written in.
//
// The last is the one that has already failed here. dependabot/fetch-metadata derives
// package-ecosystem from the branch name, so it emits Dependabot's internal slugs --
// `npm_and_yarn` and `github_actions` -- and never `npm` or `github-actions`. The
// workflow once compared against the config keys, so every major fell through to the
// hold branch with a log line that read exactly like a deliberate hold. No comparison is
// left in the workflow today; any that returns has to use a slug, and the slug table
// has to cover every ecosystem dependabot.yml declares, so the right spelling is on
// record before anybody needs it.
//
// The steps run under bash exactly as written, with `gh` and `sleep` replaced on PATH.
// The stand-in answers the provenance queries as a single GitHub-signed commit by the
// pull request's author, so these cases test the decision rather than the provenance
// guard. Expressions (`${{ }}`) are not evaluated, so the `if:` conditions on the jobs
// are checked as text, and a step whose script contains one is refused rather than run.
//
// Narrow parsing rather than a YAML library, matching the other scripts/test-*.cjs
// suites: this runs inside the CI complete gate with nothing installed. Narrow parsing
// fails open, which is why `analyze` is also run against deliberately broken copies of
// the real files further down.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const BOT = path.join(WORKFLOWS, 'bot-automerge.yml');
const DISARM = path.join(WORKFLOWS, 'bot-automerge-disarm.yml');
const DEPENDABOT = path.join(ROOT, '.github', 'dependabot.yml');

const ELIGIBILITY_STEP = 'Decide eligibility';
const ARM_STEP = 'Re-check the kill switch, then arm, and approve';
const DISARM_STEP = 'Disarm auto-merge';
const KILL_SWITCH = 'do not auto-merge';

const ELIGIBLE = [
  'version-update:semver-patch',
  'version-update:semver-minor',
  'version-update:semver-major',
];
// fetch-metadata leaves update-type empty when it cannot recover one, and anything it
// might add later is equally unknown to this workflow.
const UNKNOWN = ['', 'version-update:semver-unknown'];

// package-ecosystem as written in dependabot.yml -> package-ecosystem as emitted by
// dependabot/fetch-metadata. The action reads chunks[1] of the branch name
// (`dependabot/npm_and_yarn/...`), which is Dependabot's internal slug for the
// ecosystem, not the key the config file is written in. Both values are confirmed
// against the branch names of this repository's own Dependabot pull requests.
const ECOSYSTEM_SLUGS = {
  npm: 'npm_and_yarn',
  'github-actions': 'github_actions',
};

const indentOf = (line) => line.length - line.trimStart().length;
const isBlank = (line) => /^\s*$/.test(line);
const isComment = (line) => /^\s*#/.test(line);

/** The `run: |` script of the named step, dedented, or null when there is none. */
function stepScript(text, name) {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  if (at === -1) return null;
  const stepIndent = indentOf(lines[at]);
  for (let i = at + 1; i < lines.length; i += 1) {
    if (!isBlank(lines[i]) && indentOf(lines[i]) <= stepIndent) return null;
    const run = /^(\s*)run:\s*\|\s*$/.exec(lines[i]);
    if (!run) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!isBlank(lines[j]) && indentOf(lines[j]) <= run[1].length) break;
      body.push(lines[j]);
    }
    const strip = Math.min(...body.filter((line) => !isBlank(line)).map(indentOf));
    return `${body.map((line) => line.slice(strip)).join('\n')}\n`;
  }
  return null;
}

/** The value of a key set directly on the named step (`id`, `if`), or null. */
function stepKey(text, name, key) {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  if (at === -1) return null;
  const keyIndent = indentOf(lines[at]) + 2;
  for (let i = at + 1; i < lines.length; i += 1) {
    if (!isBlank(lines[i]) && indentOf(lines[i]) < keyIndent) return null;
    const match = new RegExp(`^ {${keyIndent}}${key}:\\s*(.*)$`).exec(lines[i]);
    if (match) return match[1].trim();
  }
  return null;
}

/** The text of a job's `if:` condition, folded onto one line. */
function jobCondition(text) {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => /^ {4}if:/.test(line));
  if (at === -1) return null;
  const parts = [lines[at].replace(/^ {4}if:\s*(>-?)?/, '')];
  for (let i = at + 1; i < lines.length && indentOf(lines[i]) > 4; i += 1) {
    parts.push(lines[i]);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// A stand-in for `gh`, answering only the calls these steps make. Anything else exits
// non-zero, so a step that starts making a new call fails here rather than being
// answered with something plausible.
//
// The changed-files query is answered even though the workflow no longer makes it. The
// policy is that a major merges whatever it touches, so the cases below put it in front
// of a diff reaching publish.yml, a workflow no pull request runs; a per-file hold list
// brought back would make that query and hold, and fail here as `not-eligible`.
const GH_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >>"$STUB_LOG"
case "$*" in
  "api repos/"*"/commits "*) printf '%s\\n' "github|plain|$STUB_AUTHOR" ;;
  "api repos/"*"/files "*) printf '%s\\n' $STUB_FILES ;;
  "api repos/"*"/pulls/"*) echo 1 ;;
  *"--json labels"*) printf '%s' "$STUB_LABELS" ;;
  *"--json reviewDecision"*) echo "$STUB_DECISION" ;;
  *"--json state"*) echo OPEN ;;
  *"--json autoMergeRequest"*) cat "$STUB_ARMED" ;;
  "pr merge --disable-auto"*) echo false >"$STUB_ARMED" ;;
  "pr merge --auto"*) echo true >"$STUB_ARMED" ;;
  "pr review --approve"*) ;;
  *) echo "stub gh: unexpected call: $*" >&2; exit 64 ;;
esac
`;

// One scratch directory for the whole run. The stand-ins are written once: a freshly
// written executable is slow to start the first time on some systems, and every run
// below would otherwise pay that again.
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-automerge-'));
process.on('exit', () => fs.rmSync(SCRATCH, { recursive: true, force: true }));
const STUB_BIN = path.join(SCRATCH, 'bin');
fs.mkdirSync(STUB_BIN);
fs.writeFileSync(path.join(STUB_BIN, 'gh'), GH_STUB, { mode: 0o755 });
fs.writeFileSync(path.join(STUB_BIN, 'sleep'), '#!/bin/sh\n', { mode: 0o755 });

/**
 * Run `script` as GitHub runs a `run:` block with no explicit shell (`bash -e`), with the
 * stand-ins first on PATH. Returns the exit status, every `gh` call, the step's outputs
 * and whether the pull request ends up armed.
 */
function runStep(script, env, { armed = false, labels = '' } = {}) {
  const dir = fs.mkdtempSync(path.join(SCRATCH, 'run-'));
  try {
    const file = (name, content = '') => {
      const target = path.join(dir, name);
      fs.writeFileSync(target, content);
      return target;
    };
    const paths = {
      script: file('step.sh', script),
      output: file('output'),
      log: file('gh.log'),
      armed: file('armed', `${armed}\n`),
    };
    const result = spawnSync('bash', ['--noprofile', '--norc', '-e', paths.script], {
      encoding: 'utf8',
      env: {
        PATH: `${STUB_BIN}${path.delimiter}${process.env.PATH}`,
        HOME: dir,
        GITHUB_OUTPUT: paths.output,
        STUB_LOG: paths.log,
        STUB_ARMED: paths.armed,
        STUB_LABELS: labels,
        STUB_AUTHOR: env.AUTHOR || 'dependabot[bot]',
        STUB_DECISION: '',
        STUB_FILES: '.github/workflows/publish.yml package.json',
        GH_REPO: 'owner/repo',
        PR_NUMBER: '7',
        PR_URL: 'https://github.com/owner/repo/pull/7',
        ...env,
      },
    });
    const outputs = {};
    for (const line of fs.readFileSync(paths.output, 'utf8').split('\n')) {
      const pair = /^([^=]+)=(.*)$/.exec(line);
      if (pair) outputs[pair[1]] = pair[2];
    }
    return {
      status: result.status,
      stderr: result.stderr,
      calls: fs.readFileSync(paths.log, 'utf8').split('\n').filter(Boolean),
      outputs,
      armed: fs.readFileSync(paths.armed, 'utf8').trim() === 'true',
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** A step's script, or an error recorded and null when it cannot be run faithfully. */
function runnable(text, name, file, add) {
  const script = stepScript(text, name);
  if (script === null) {
    add('step-missing', `${file}: ${name}`);
    return null;
  }
  if (script.includes('${{')) {
    add('expression-in-run', `${file}: ${name}`);
    return null;
  }
  return script;
}

/** Every string compared against $ECOSYSTEM in shell code, whichever operator. */
function comparisons(text) {
  const found = [];
  for (const line of text.split('\n')) {
    if (isComment(line)) continue;
    for (const match of line.matchAll(
      /"\$\{?ECOSYSTEM\}?"\s*(?:==?|!=)\s*"([^"]*)"/g
    )) {
      found.push(match[1]);
    }
  }
  return found;
}

/**
 * Every complaint about the current files, as { code, detail }. Returning them rather
 * than printing keeps the negative cases below able to assert on a specific failure.
 */
function analyze({ bot, disarm, dependabot }) {
  const errors = [];
  const add = (code, detail) => errors.push({ code, detail });

  // --- The ecosystem names --------------------------------------------------------
  const configured = [
    ...dependabot.matchAll(/^\s*-?\s*package-ecosystem:\s*(\S+)/gm),
  ].map((match) => match[1].replace(/^['"]|['"]$/g, ''));
  if (configured.length === 0) add('no-ecosystems', 'dependabot.yml declares none');

  const slugs = [];
  for (const key of configured) {
    // A new ecosystem in dependabot.yml whose slug this table has never been told.
    // Guessing it is what produced the original bug, so it is recorded before it is used.
    if (ECOSYSTEM_SLUGS[key]) slugs.push(ECOSYSTEM_SLUGS[key]);
    else add('unknown-ecosystem', key);
  }
  for (const value of comparisons(bot)) {
    if (Object.hasOwn(ECOSYSTEM_SLUGS, value) && ECOSYSTEM_SLUGS[value] !== value) {
      add('config-key-not-slug', `${value} -> ${ECOSYSTEM_SLUGS[value]}`);
    } else if (!slugs.includes(value)) {
      add('unknown-comparison', value);
    }
  }

  // --- What merges ----------------------------------------------------------------
  const decide = runnable(bot, ELIGIBILITY_STEP, 'bot-automerge.yml', add);
  if (decide !== null) {
    const decideFor = (updateType, ecosystem) =>
      runStep(decide, {
        AUTHOR: 'dependabot[bot]',
        UPDATE_TYPE: updateType,
        ECOSYSTEM: ecosystem,
      });
    for (const ecosystem of slugs) {
      for (const updateType of ELIGIBLE) {
        const run = decideFor(updateType, ecosystem);
        if (run.status !== 0 || run.outputs.should_merge !== 'true') {
          add('not-eligible', `${ecosystem} ${updateType}: ${run.stderr.trim()}`);
        }
      }
    }
    for (const updateType of UNKNOWN) {
      const run = decideFor(updateType, slugs[0] || '');
      if (run.outputs.should_merge === 'true') {
        add('unknown-not-held', updateType || '(empty)');
      }
    }
  }

  // The steps run one at a time above, so what joins them is checked here: the arming
  // step acts only on the eligibility step's verdict. These are expressions, which this
  // suite cannot evaluate, so they are pinned as text. Without the condition, a held
  // update would still be armed, and every case above would go on passing.
  if (stepKey(bot, ELIGIBILITY_STEP, 'id') !== 'eligible') {
    add('eligibility-id-changed', stepKey(bot, ELIGIBILITY_STEP, 'id') || '(none)');
  }
  if (
    stepKey(bot, ARM_STEP, 'if') !== "steps.eligible.outputs.should_merge == 'true'"
  ) {
    add('arm-not-gated', stepKey(bot, ARM_STEP, 'if') || '(none)');
  }

  // --- The kill switch ------------------------------------------------------------
  // Three parts, each needed: the job does not start on a labeled pull request, the
  // arming step re-reads the label in case it arrived mid-run, and the disarm workflow
  // takes back an arm that was already made.
  const job = jobCondition(bot) || '';
  if (
    !job.includes(
      `!contains(github.event.pull_request.labels.*.name, '${KILL_SWITCH}')`
    )
  ) {
    add('job-ignores-label', job);
  }

  const arm = runnable(bot, ARM_STEP, 'bot-automerge.yml', add);
  if (arm !== null) {
    const armed = (labels) => runStep(arm, {}, { labels }).armed;
    // The positive control, without which "never arms" would pass the cases below.
    if (!armed('dependencies')) add('never-arms', 'no label, and still not armed');
    for (const label of [KILL_SWITCH, 'Do Not Auto-Merge']) {
      if (armed(`dependencies\n${label}`)) add('kill-switch-ignored', label);
    }
  }

  if (!/^ {4}types: \[labeled\]\s*$/m.test(disarm)) {
    add('disarm-not-on-labeled', 'bot-automerge-disarm.yml');
  }
  if (jobCondition(disarm) !== `github.event.label.name == '${KILL_SWITCH}'`) {
    add('disarm-wrong-label', jobCondition(disarm) || '(none)');
  }
  const unarm = runnable(disarm, DISARM_STEP, 'bot-automerge-disarm.yml', add);
  if (unarm !== null) {
    const run = runStep(unarm, {}, { armed: true });
    if (run.status !== 0 || run.armed) {
      add('disarm-failed', `exit ${run.status}, armed ${run.armed}`);
    }
  }

  return errors;
}

const live = {
  bot: fs.readFileSync(BOT, 'utf8'),
  disarm: fs.readFileSync(DISARM, 'utf8'),
  dependabot: fs.readFileSync(DEPENDABOT, 'utf8'),
};

let failures = 0;

const actual = analyze(live);
if (actual.length !== 0) {
  failures += 1;
  console.error('FAIL: the bot auto-merge workflows do not behave as intended:');
  for (const { code, detail } of actual) console.error(`  ${code}: ${detail}`);
}

// --- Negative cases -------------------------------------------------------------
// A suite over a passing tree only proves the tree passes. Each case breaks one thing
// and asserts the specific complaint, so a rewrite that stops checking something fails
// here instead of going quiet.

let cases = 0;

/** Apply `mutate` to a copy of the live inputs and require `code` among the errors. */
function expectError(name, code, mutate) {
  cases += 1;
  const copy = { ...live };
  mutate(copy);
  if (Object.keys(live).every((key) => copy[key] === live[key])) {
    failures += 1;
    console.error(`FAIL: ${name}: the mutation changed nothing, so the case is stale`);
    return;
  }
  const codes = analyze(copy).map((error) => error.code);
  if (!codes.includes(code)) {
    failures += 1;
    console.error(
      `FAIL: ${name}: expected ${code}, got [${codes.join(', ') || 'none'}]`
    );
  }
}

const MAJOR_NOTICE =
  'echo "::notice::${ECOSYSTEM:-unknown} major; eligible on green CI."';
const HOLD =
  'echo "::warning::Holding ${UPDATE_TYPE:-unknown update type} for a human."\n' +
  '            echo "should_merge=false"';

// What merges.
expectError('majors held outright', 'not-eligible', (c) => {
  c.bot = c.bot.replace(
    '"version-update:semver-major"',
    '"version-update:semver-none"'
  );
});
expectError('patches held', 'not-eligible', (c) => {
  c.bot = c.bot.replace(
    '"version-update:semver-patch"',
    '"version-update:semver-none"'
  );
});
expectError('an ecosystem gate holding actions majors again', 'not-eligible', (c) => {
  c.bot = c.bot.replace(
    MAJOR_NOTICE,
    'if [ "$ECOSYSTEM" = "github_actions" ]; then\n' +
      '              echo "should_merge=false" >> "$GITHUB_OUTPUT"\n' +
      '              exit 0\n' +
      '            fi\n' +
      `            ${MAJOR_NOTICE}`
  );
});
expectError('an unknown update type merging', 'unknown-not-held', (c) => {
  c.bot = c.bot.replace(HOLD, HOLD.replace('should_merge=false', 'should_merge=true'));
});
expectError('arming no longer waits for the verdict', 'arm-not-gated', (c) => {
  c.bot = c.bot.replace(
    `- name: ${ARM_STEP}\n        if: steps.eligible.outputs.should_merge == 'true'\n`,
    `- name: ${ARM_STEP}\n`
  );
});
expectError('arming gated on something always true', 'arm-not-gated', (c) => {
  c.bot = c.bot.replace(
    `- name: ${ARM_STEP}\n        if: steps.eligible.outputs.should_merge == 'true'`,
    `- name: ${ARM_STEP}\n        if: always()`
  );
});
expectError(
  'the verdict read from a step that is not there',
  'eligibility-id-changed',
  (c) => {
    c.bot = c.bot.replace(
      `- name: ${ELIGIBILITY_STEP}\n        id: eligible`,
      `- name: ${ELIGIBILITY_STEP}\n        id: decide`
    );
  }
);
expectError('the eligibility step renamed', 'step-missing', (c) => {
  c.bot = c.bot.replace(`- name: ${ELIGIBILITY_STEP}`, '- name: Decide');
});

// The kill switch.
expectError('the job no longer reads the label', 'job-ignores-label', (c) => {
  c.bot = c.bot.replace(
    ` &&\n      !contains(github.event.pull_request.labels.*.name, '${KILL_SWITCH}')`,
    ''
  );
});
expectError('the arming step ignores the label', 'kill-switch-ignored', (c) => {
  c.bot = c.bot.replace(`grep -qixF '${KILL_SWITCH}'`, "grep -qixF 'never applied'");
});
expectError('the label check made case-sensitive', 'kill-switch-ignored', (c) => {
  c.bot = c.bot.replace(`grep -qixF '${KILL_SWITCH}'`, `grep -qxF '${KILL_SWITCH}'`);
});
expectError('the arming step never arms', 'never-arms', (c) => {
  c.bot = c.bot.replace('gh pr merge --auto --squash "$PR_URL"', 'true');
});
expectError('disarm no longer disables', 'disarm-failed', (c) => {
  c.disarm = c.disarm.replace(
    'gh pr merge --disable-auto "$PR_NUMBER" || true',
    'true'
  );
});
expectError('disarm listens for another label', 'disarm-wrong-label', (c) => {
  c.disarm = c.disarm.replace(
    `if: github.event.label.name == '${KILL_SWITCH}'`,
    "if: github.event.label.name == 'hold'"
  );
});
expectError('disarm no longer fires on labeled', 'disarm-not-on-labeled', (c) => {
  c.disarm = c.disarm.replace('types: [labeled]', 'types: [opened]');
});

// The original bug, in both directions, and a slug nobody recorded.
expectError('actions compared by its config key', 'config-key-not-slug', (c) => {
  c.bot = c.bot.replace(
    MAJOR_NOTICE,
    `[ "$ECOSYSTEM" = "github-actions" ] || true\n            ${MAJOR_NOTICE}`
  );
});
expectError('npm compared by its config key', 'config-key-not-slug', (c) => {
  c.bot = c.bot.replace(
    MAJOR_NOTICE,
    `[ "$ECOSYSTEM" = "npm" ] || true\n            ${MAJOR_NOTICE}`
  );
});
expectError(
  'a comparison against an ecosystem nobody configured',
  'unknown-comparison',
  (c) => {
    c.bot = c.bot.replace(
      MAJOR_NOTICE,
      `[ "$ECOSYSTEM" = "cargo" ] || true\n            ${MAJOR_NOTICE}`
    );
  }
);
expectError('a new ecosystem with no known slug', 'unknown-ecosystem', (c) => {
  c.dependabot = c.dependabot.replace(
    '  - package-ecosystem: npm',
    '  - package-ecosystem: docker\n    directory: /\n  - package-ecosystem: npm'
  );
});
expectError('dependabot.yml read as declaring nothing', 'no-ecosystems', (c) => {
  c.dependabot = c.dependabot.replace(/package-ecosystem:/g, 'package_ecosystem:');
});

if (failures !== 0) {
  console.error(`bot-automerge: ${failures} test(s) failed`);
  process.exit(1);
}

console.log(`bot-automerge test passed (${cases} negative cases)`);
