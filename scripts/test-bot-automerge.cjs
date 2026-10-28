#!/usr/bin/env node

// Runs the shell steps of .github/workflows/bot-automerge.yml and
// bot-automerge-disarm.yml against a stand-in for `gh`, and checks that:
//   - a Dependabot patch, minor or major update is eligible in every ecosystem
//     dependabot.yml declares;
//   - an unrecognized update type is held, and arming acts only on the eligibility
//     verdict;
//   - a merge commit a person authored holds the pull request, and one a bot authored
//     does not;
//   - the `do not auto-merge` label stops arming and disarms an armed pull request;
//   - ecosystem names are Dependabot's slugs, not dependabot.yml keys. A comparison
//     against a config key never matches, and every major falls through to a hold that
//     logs like a deliberate one.
//
// Unless a case sets its commits, the stand-in reports one GitHub-signed commit by the
// pull request's author, so those cases test the decision, not the provenance guard.
// The merge cases add a GitHub-signed merge by a given author. `${{ }}` expressions are
// not evaluated: `if:` conditions are checked as text, and a step whose script contains
// one is refused.
//
// Narrow parsing, not a YAML library: this runs with nothing installed. Narrow parsing
// fails open, so `analyze` also runs against broken copies of the real files below.

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
// fetch-metadata leaves update-type empty when it cannot recover one; a type it adds
// later is equally unknown to the workflow.
const UNKNOWN = ['', 'version-update:semver-unknown'];

// Who authors a merge on a bot pull request. Catch-up merges as github-actions[bot] or
// as an App; a person merges with Update branch or in the conflict editor, and a merge
// whose author email maps to no account reads as `<none>`.
const BOT_MERGERS = ['github-actions[bot]', 'some-app[bot]'];
const PERSON_MERGERS = ['michen00', '<none>'];

// dependabot.yml key -> the slug fetch-metadata reports, which it reads from the branch
// name (`dependabot/npm_and_yarn/...`).
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

// A stand-in for `gh` that answers only the calls these steps make; any other call
// exits non-zero, so a new call fails here instead of getting a plausible answer.
//
// A major merges whatever it touches, so the changed-files query, which the workflow
// does not make, is answered with a diff reaching a workflow no pull request runs: a
// per-file hold list added to the workflow would make that query, hold, and fail as
// `not-eligible`.
const GH_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >>"$STUB_LOG"
case "$*" in
  "api repos/"*"/commits "*) printf '%s\\n' "$STUB_COMMITS" ;;
  "api repos/"*"/files "*) printf '%s\\n' $STUB_FILES ;;
  "api repos/"*"/pulls/"*) printf '%s\\n' "$STUB_COMMITS" | grep -c . ;;
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

// The stand-ins are written once: a freshly written executable is slow to start the
// first time on some systems.
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-automerge-'));
process.on('exit', () => fs.rmSync(SCRATCH, { recursive: true, force: true }));
const STUB_BIN = path.join(SCRATCH, 'bin');
fs.mkdirSync(STUB_BIN);
fs.writeFileSync(path.join(STUB_BIN, 'gh'), GH_STUB, { mode: 0o755 });
fs.writeFileSync(path.join(STUB_BIN, 'sleep'), '#!/bin/sh\n', { mode: 0o755 });

/**
 * Run `script` as GitHub runs a `run:` block with no explicit shell (`bash -e`), with the
 * stand-ins first on PATH.
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
        STUB_COMMITS: `github|plain|${env.AUTHOR || 'dependabot[bot]'}`,
        STUB_DECISION: '',
        STUB_FILES: '.github/workflows/publish.yml package.json',
        GH_REPO: 'owner/repo',
        PR_NUMBER: '7',
        PR_URL: 'https://github.com/owner/repo/pull/7',
        ARM_TOKEN: 'arm-token',
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
 * Every complaint about the files, as { code, detail }, returned rather than printed so
 * the negative cases can assert on a specific one.
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
    // A configured ecosystem with no slug in the table: record its slug, never guess it.
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

    // A merge a person makes on GitHub is GitHub-signed too, and one resolved by hand
    // can carry any content, so only a bot's merge leaves an eligible update eligible.
    const withMergeBy = (merger) =>
      runStep(decide, {
        AUTHOR: 'dependabot[bot]',
        UPDATE_TYPE: ELIGIBLE[0],
        ECOSYSTEM: slugs[0] || '',
        STUB_COMMITS: `github|plain|dependabot[bot]\ngithub|merge|${merger}`,
      });
    for (const merger of BOT_MERGERS) {
      const run = withMergeBy(merger);
      if (run.status !== 0 || run.outputs.should_merge !== 'true') {
        add('bot-merge-held', `${merger}: ${run.stderr.trim()}`);
      }
    }
    for (const merger of PERSON_MERGERS) {
      if (withMergeBy(merger).outputs.should_merge === 'true') {
        add('person-merge-not-held', merger);
      }
    }
  }

  // The steps run one at a time above, so the arming step's condition on the verdict is
  // pinned here as text. Without it a held update would be armed, and every case above
  // would still pass.
  if (stepKey(bot, ELIGIBILITY_STEP, 'id') !== 'eligible') {
    add('eligibility-id-changed', stepKey(bot, ELIGIBILITY_STEP, 'id') || '(none)');
  }
  if (
    stepKey(bot, ARM_STEP, 'if') !== "steps.eligible.outputs.should_merge == 'true'"
  ) {
    add('arm-not-gated', stepKey(bot, ARM_STEP, 'if') || '(none)');
  }

  // --- The kill switch ------------------------------------------------------------
  // Each part is needed: the job skips a labeled pull request, the arming step re-reads
  // the label, and the disarm workflow takes back an arm already made.
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
// Each case breaks one thing and requires the specific complaint, so a rewrite that
// stops checking something fails here.

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

// Whose merges are trusted.
const PERSON_MERGE_HOLD = `elif [ "$kind" = "merge" ] && [[ "$commit_author" != *'[bot]' ]]; then`;
expectError('a merge by a person trusted', 'person-merge-not-held', (c) => {
  c.bot = c.bot.replace(PERSON_MERGE_HOLD, 'elif false; then');
});
expectError('every merge held', 'bot-merge-held', (c) => {
  c.bot = c.bot.replace(PERSON_MERGE_HOLD, 'elif [ "$kind" = "merge" ]; then');
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

// Config keys in place of slugs, and a slug nobody recorded.
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
