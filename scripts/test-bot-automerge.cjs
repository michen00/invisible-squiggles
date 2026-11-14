#!/usr/bin/env node

// Runs the shell steps of .github/workflows/bot-automerge.yml and
// bot-automerge-disarm.yml against a stand-in for `gh` and throwaway git repositories,
// and checks that:
//   - a Dependabot patch, minor or major update is eligible in every ecosystem
//     dependabot.yml declares;
//   - a pre-commit-ci pull request is eligible;
//   - an unrecognized update type is held, and arming acts only on the eligibility
//     verdict, which acts only on the provenance verdict;
//   - a merge leaves the pull request trusted only when it is a clean merge of two
//     parents or a repository admin authored it, and each author is looked up once;
//   - every push since the branch was created by anyone but the author or an admin
//     adds only clean merges of two parents, and a push history that does not reach
//     the head or the branch's creation holds;
//   - a head that is not the event's, or that moved during the check, holds, and
//     arming and approving name the verified head;
//   - a commit count that is not an integer fails the provenance step;
//   - the `do not auto-merge` label stops arming and disarms an armed pull request;
//   - ecosystem names are Dependabot's slugs, not dependabot.yml keys. A comparison
//     against a config key never matches, and every major falls through to a hold that
//     logs like a deliberate one.
//
// Every step runs in a clone of a throwaway origin's main whose refs/pull/<n>/head hold
// real commits, so the step's fetch and `git merge-tree` are real. The stand-in lists
// those commits, each GitHub-signed. Unless a case picks a scenario, the pull request
// is one commit by its author, who created the branch there. `${{ }}` expressions are
// not evaluated: `if:` conditions and the verified head's source are checked as text,
// and a step whose script contains one is refused.
//
// Narrow parsing, not a YAML library: this runs with nothing installed but git. Narrow
// parsing fails open, so `analyze` also runs against broken copies of the real files
// below.

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

const PROVENANCE_STEP = 'Verify every commit was created by GitHub';
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

/**
 * The value of a key set on the named step, or null: directly (`id`, `if`) at depth 1,
 * or one level down (an `env:` variable) at depth 2.
 */
function stepKey(text, name, key, depth = 1) {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  if (at === -1) return null;
  const stepIndent = indentOf(lines[at]);
  const keyIndent = stepIndent + 2 * depth;
  for (let i = at + 1; i < lines.length; i += 1) {
    if (!isBlank(lines[i]) && indentOf(lines[i]) <= stepIndent) return null;
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
  "api repos/"*"/collaborators/"*)
    login=\${2#*/collaborators/}; login=\${login%/permission}
    case $login in
      "$STUB_ADMIN") echo admin ;;
      "$STUB_FLAKY") echo "gh: Server Error (HTTP 502)" >&2; exit 1 ;;
      *) echo write ;;
    esac ;;
  "api repos/"*"/commits "*) printf '%s\\n' "$STUB_COMMITS" ;;
  "api repos/"*"/files "*) printf '%s\\n' $STUB_FILES ;;
  "api repos/"*"/pulls/"*" --jq .head.sha") printf '%s\\n' "$STUB_HEAD" ;;
  "api repos/"*"/pulls/"*)
    if [ -n "\${STUB_COUNT+set}" ]; then printf '%s\\n' "$STUB_COUNT"
    else printf '%s\\n' "$STUB_COMMITS" | grep -c .; fi ;;
  "api -X GET repos/"*"/activity "*) printf '%s\\n' "$STUB_PUSHES" ;;
  "api -X POST repos/"*"/reviews "*) ;;
  *"--json labels"*) printf '%s' "$STUB_LABELS" ;;
  *"--json reviewDecision"*) echo "$STUB_DECISION" ;;
  *"--json state"*) echo OPEN ;;
  *"--json autoMergeRequest"*) cat "$STUB_ARMED" ;;
  "pr merge --disable-auto"*) echo false >"$STUB_ARMED" ;;
  "pr merge --auto"*) echo true >"$STUB_ARMED" ;;
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

// --- Git fixtures ---------------------------------------------------------------
// Built once: an origin whose refs/pull/<n>/head are the pull requests below, and a
// clone of its main for every step to run in. Each pull request starts from START
// with one Dependabot commit to a.txt; main has since changed b.txt and `side` c.txt,
// so merging either is clean.

/** Run git in `cwd` as `author`, committed by GitHub, with no user or system config. */
function git(cwd, args, author = 'dependabot[bot]') {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: SCRATCH,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: author,
      GIT_AUTHOR_EMAIL: `${author}@example.invalid`,
      GIT_COMMITTER_NAME: 'GitHub',
      GIT_COMMITTER_EMAIL: 'noreply@github.com',
    },
  });
  return {
    ok: result.status === 0,
    out: (result.stdout || '').trim(),
    err: result.stderr,
  };
}

/** Like `git`, but a failure is a broken fixture, so it stops the run. */
function mustGit(cwd, args, author) {
  const result = git(cwd, args, author);
  if (!result.ok) throw new Error(`fixture: git ${args.join(' ')}: ${result.err}`);
  return result.out;
}

const DEV = path.join(SCRATCH, 'dev');
fs.mkdirSync(DEV);
const write = (name, text) => fs.writeFileSync(path.join(DEV, name), `${text}\n`);
mustGit(DEV, ['init', '-q', '-b', 'main']);
for (const name of ['a', 'b', 'c']) write(`${name}.txt`, name);
mustGit(DEV, ['add', '.']);
mustGit(DEV, ['commit', '-qm', 'chore: start'], 'michen00');
const START = mustGit(DEV, ['rev-parse', 'HEAD']);
mustGit(DEV, ['switch', '-qc', 'side']);
write('c.txt', 'c, changed on side');
mustGit(DEV, ['commit', '-qam', 'build: change c']);
mustGit(DEV, ['switch', '-q', 'main']);
write('b.txt', 'b, changed on main');
mustGit(DEV, ['commit', '-qam', 'feat: change b'], 'michen00');
// Main moved on again, for a second merge into one pull request.
mustGit(DEV, ['switch', '-qc', 'main-again', 'main']);
write('b.txt', 'b, changed on main again');
mustGit(DEV, ['commit', '-qam', 'feat: change b again'], 'michen00');
// A base that edits the same line of a.txt as every pull request, for the conflict.
mustGit(DEV, ['switch', '-qc', 'conflicting', START]);
write('a.txt', 'a, changed on the base');
mustGit(DEV, ['commit', '-qam', 'feat: change a'], 'michen00');

/**
 * Record a pull request numbered `number`: one commit by `author`, then `finish`. Its
 * rows are the commits from `base` to its head, in the shape the step's jq filter
 * produces: origin, kind, author, SHA, and parent SHAs. `created` is the bot's commit,
 * where its push history has the branch created.
 */
function pull(number, { base = 'main', author, finish = () => {} } = {}) {
  mustGit(DEV, ['switch', '-qc', `pull-${number}`, START]);
  write('a.txt', 'a, bumped');
  mustGit(DEV, ['commit', '-qam', 'build: bump a'], author);
  const created = mustGit(DEV, ['rev-parse', 'HEAD']);
  finish();
  const head = mustGit(DEV, ['rev-parse', 'HEAD']);
  mustGit(DEV, ['update-ref', `refs/pull/${number}/head`, 'HEAD']);
  const rows = mustGit(DEV, ['rev-list', '--reverse', `${base}..HEAD`])
    .split('\n')
    .map((sha) => {
      const [, ...parents] = mustGit(DEV, ['rev-list', '--parents', '-n1', sha]).split(
        ' '
      );
      const kind = parents.length >= 2 ? 'merge' : 'plain';
      const name = mustGit(DEV, ['log', '-1', '--format=%an', sha]);
      const author = name === NO_ACCOUNT ? '<none>' : name;
      return `github|${kind}|${author}|${sha}|${parents.join(' ')}`;
    });
  return { number: String(number), rows: rows.join('\n'), created, head };
}

// Who the stand-in says each merge author is: ADMIN is an admin, FLAKY's lookup fails,
// and anyone else has write. NO_ACCOUNT's commits are listed with the `<none>` login of
// an author GitHub cannot name, since git strips `<` and `>` from a name.
const ADMIN = 'michen00';
const NON_ADMIN = 'contributor';
const FLAKY = 'flaky-lookup';
const NO_ACCOUNT = 'no-account';

const mergeAs =
  (author, ...branches) =>
  () =>
    mustGit(DEV, ['merge', '-q', '--no-ff', '--no-edit', ...branches], author);

// The pull request every case without a merge runs as.
const PLAIN = pull(7);

/** Merge main cleanly as `author`, then amend an extra edit into the merge. */
const editedMerge = (author) => () => {
  mergeAs(author, 'main')();
  write('c.txt', `c, edited in the merge by ${author}`);
  mustGit(DEV, ['commit', '-q', '--amend', '--no-edit', '--all'], author);
};

/** Merge `conflicting` as `author`, resolved by hand with an extra edit. */
const resolvedMerge = (author) => () => {
  const merge = git(DEV, ['merge', '-q', '--no-edit', 'conflicting'], author);
  if (merge.ok) throw new Error('fixture: the conflict merged cleanly');
  write('a.txt', 'whatever the resolver typed');
  write('c.txt', 'and an edit elsewhere');
  mustGit(DEV, ['add', 'a.txt', 'c.txt']);
  mustGit(DEV, ['commit', '-q', '--no-edit'], author);
};

// A clean merge passes with no lookup, whoever made it; an admin's passes edits and
// all, on one lookup per author.
const TRUSTED_MERGES = [
  {
    name: 'a catch-up merge',
    lookups: 0,
    ...pull(11, { finish: mergeAs('github-actions[bot]', 'main') }),
  },
  {
    name: 'an Update branch merge by a non-admin',
    lookups: 0,
    ...pull(12, { finish: mergeAs(NON_ADMIN, 'main') }),
  },
  {
    name: "an admin's conflict resolved by hand with extra edits",
    lookups: 1,
    ...pull(16, { base: 'conflicting', finish: resolvedMerge(ADMIN) }),
  },
  {
    name: 'two edited merges by one admin',
    lookups: 1,
    ...pull(17, {
      base: 'main-again',
      finish: () => {
        editedMerge(ADMIN)();
        const merge = git(
          DEV,
          ['merge', '-q', '--no-ff', '--no-edit', 'main-again'],
          ADMIN
        );
        if (!merge.ok) throw new Error(`fixture: ${merge.err}`);
        write('c.txt', 'c, edited again');
        mustGit(DEV, ['commit', '-q', '--amend', '--no-edit', '--all'], ADMIN);
      },
    }),
  },
];
const HELD_MERGES = [
  {
    name: 'a conflict a non-admin resolved by hand',
    lookups: 1,
    ...pull(13, { base: 'conflicting', finish: resolvedMerge(NON_ADMIN) }),
  },
  {
    name: 'a clean merge with an extra edit by a non-admin',
    lookups: 1,
    ...pull(14, { finish: editedMerge(NON_ADMIN) }),
  },
  {
    name: 'an octopus merge by a bot',
    lookups: 1,
    ...pull(15, { finish: mergeAs('github-actions[bot]', 'main', 'side') }),
  },
  {
    name: 'an edited merge whose permission lookup fails',
    lookups: 1,
    ...pull(18, { finish: editedMerge(FLAKY) }),
  },
  {
    name: 'an edited merge by an author GitHub cannot name',
    lookups: 0,
    ...pull(19, { finish: editedMerge(NO_ACCOUNT) }),
  },
];

// Push-history records, in the shape the step's jq filter produces: change, pusher,
// before, and after. Unless a case gives a history, the author created the branch at
// the head. The stand-in gives APP write, as it does anyone it does not name.
const ZERO = '0'.repeat(40);
const creation = (after, pusher = 'dependabot[bot]') =>
  `branch_creation|${pusher}|${ZERO}|${after}`;
const pushed = (pusher, before, after, change = 'push') =>
  `${change}|${pusher}|${before}|${after}`;
const APP = 'catch-up-app[bot]';
const PRE_COMMIT_CI = 'pre-commit-ci[bot]';
const MAIN = mustGit(DEV, ['rev-parse', 'main']);
const parent = (sha, n) => mustGit(DEV, ['rev-parse', `${sha}^${n}`]);

/** Commit an edit to c.txt as `author`, by default Dependabot. */
const plainCommit = (author) => () => {
  write('c.txt', `c, changed as ${author || 'dependabot[bot]'}`);
  mustGit(DEV, ['commit', '-qam', 'build: bump c'], author);
};

const CATCH_UP = pull(21, { finish: mergeAs(APP, 'main') });
const POSING = pull(22, { finish: plainCommit() });
const HELD_THEN_CLEAN = pull(23, {
  finish: () => {
    plainCommit()();
    mergeAs(APP, 'main')();
  },
});
const SMUGGLED = pull(24, {
  finish: () => {
    mustGit(DEV, ['switch', '-qc', 'smuggled', 'main']);
    plainCommit()();
    mustGit(DEV, ['switch', '-q', 'pull-24']);
    mergeAs(APP, 'smuggled')();
  },
});
const RESOLVED = pull(25, { base: 'conflicting', finish: resolvedMerge(ADMIN) });
const HOOK_BUMP = pull(26, {
  author: PRE_COMMIT_CI,
  finish: plainCommit(PRE_COMMIT_CI),
});
const AS_PRE_COMMIT_CI = { AUTHOR: PRE_COMMIT_CI };
// A plain commit, then a force push that replaced it. Only a ref keeps the replaced
// commit, and the runner clone does not fetch it.
const REWRITTEN = pull(27, {
  finish: () => {
    plainCommit()();
    mustGit(DEV, ['update-ref', 'refs/keep/replaced', 'HEAD']);
    mustGit(DEV, ['reset', '-q', '--hard', 'HEAD~1']);
    write('c.txt', 'c, after the rewrite');
    mustGit(DEV, ['commit', '-qam', 'build: bump c again']);
  },
});
const REPLACED = mustGit(DEV, ['rev-parse', 'refs/keep/replaced']);

const TRUSTED_HISTORIES = [
  {
    name: 'a catch-up merge pushed by an App',
    ...CATCH_UP,
    pushes: [pushed(APP, CATCH_UP.created, CATCH_UP.head), creation(CATCH_UP.created)],
  },
  {
    name: 'a merge an admin resolved by hand and pushed',
    ...RESOLVED,
    pushes: [
      pushed(ADMIN, RESOLVED.created, RESOLVED.head),
      creation(RESOLVED.created),
    ],
  },
  {
    name: "pre-commit-ci's own pushes to its pull request",
    ...HOOK_BUMP,
    env: AS_PRE_COMMIT_CI,
    pushes: [
      pushed(PRE_COMMIT_CI, HOOK_BUMP.created, HOOK_BUMP.head),
      creation(HOOK_BUMP.created, PRE_COMMIT_CI),
    ],
  },
  {
    name: "an App's plain commit that Dependabot's force push replaced",
    ...REWRITTEN,
    pushes: [
      pushed('dependabot[bot]', REPLACED, REWRITTEN.head, 'force_push'),
      pushed(APP, REWRITTEN.created, REPLACED),
      creation(REWRITTEN.created),
    ],
  },
  {
    name: 'pushes to an earlier branch of the same name',
    ...PLAIN,
    pushes: [
      creation(PLAIN.head),
      pushed(NON_ADMIN, 'e'.repeat(40), 'f'.repeat(40)),
      creation('e'.repeat(40)),
    ],
  },
];
const NOT_CLEAN = 'which is not a clean merge of two parents';
const HELD_HISTORIES = [
  {
    name: 'a plain commit authored as Dependabot and pushed by a non-admin',
    ...POSING,
    pushes: [pushed(NON_ADMIN, POSING.created, POSING.head), creation(POSING.created)],
    reason: `${NON_ADMIN} pushed ${POSING.head}, ${NOT_CLEAN}`,
  },
  {
    name: 'a plain commit authored as pre-commit-ci and pushed by an App',
    ...HOOK_BUMP,
    env: AS_PRE_COMMIT_CI,
    pushes: [
      pushed(APP, HOOK_BUMP.created, HOOK_BUMP.head),
      creation(HOOK_BUMP.created, PRE_COMMIT_CI),
    ],
    reason: `${APP} pushed ${HOOK_BUMP.head}, ${NOT_CLEAN}`,
  },
  {
    name: 'a held push followed by a clean catch-up push',
    ...HELD_THEN_CLEAN,
    pushes: [
      pushed(APP, parent(HELD_THEN_CLEAN.head, 1), HELD_THEN_CLEAN.head),
      pushed(APP, HELD_THEN_CLEAN.created, parent(HELD_THEN_CLEAN.head, 1)),
      creation(HELD_THEN_CLEAN.created),
    ],
    reason: `${APP} pushed ${parent(HELD_THEN_CLEAN.head, 1)}, ${NOT_CLEAN}`,
  },
  {
    name: "a plain commit behind a clean merge's second parent",
    ...SMUGGLED,
    pushes: [pushed(APP, SMUGGLED.created, SMUGGLED.head), creation(SMUGGLED.created)],
    reason: `${APP} pushed ${parent(SMUGGLED.head, 2)}, ${NOT_CLEAN}`,
  },
  {
    name: 'a merge authored as an admin and pushed by a non-admin',
    ...RESOLVED,
    pushes: [
      pushed(NON_ADMIN, RESOLVED.created, RESOLVED.head),
      creation(RESOLVED.created),
    ],
    reason: `${NON_ADMIN} pushed ${RESOLVED.head}, ${NOT_CLEAN}`,
  },
  {
    name: 'a rewrite pushed by a non-admin',
    ...REWRITTEN,
    pushes: [
      pushed(NON_ADMIN, REPLACED, REWRITTEN.head, 'force_push'),
      pushed('dependabot[bot]', REWRITTEN.created, REPLACED),
      creation(REWRITTEN.created),
    ],
    reason: `${NON_ADMIN} pushed ${REWRITTEN.head}, ${NOT_CLEAN}`,
  },
  {
    name: 'a change other than a push',
    ...CATCH_UP,
    pushes: [
      pushed(APP, CATCH_UP.created, CATCH_UP.head, 'pr_merge'),
      creation(CATCH_UP.created),
    ],
    reason: `${APP} changed the branch by pr_merge; holding.`,
  },
  {
    name: 'a push history that does not reach the branch creation',
    ...PLAIN,
    pushes: [pushed('dependabot[bot]', 'e'.repeat(40), PLAIN.head)],
    reason: "the branch's push history does not reach its creation;",
  },
  {
    name: 'a push history that does not reach the head',
    ...PLAIN,
    pushes: [creation(START)],
    reason: "the branch's push history does not reach its head; holding.",
  },
  {
    name: 'a head this event did not bring',
    ...PLAIN,
    env: { EVENT_HEAD: START },
    reason: 'the head is no longer the one this event brought; holding.',
  },
  {
    name: 'a head that moved during the check',
    ...PLAIN,
    head: MAIN,
    reason: 'the head moved while it was being inspected; holding.',
  },
];

const ORIGIN = path.join(SCRATCH, 'origin.git');
mustGit(SCRATCH, ['clone', '-q', '--mirror', DEV, ORIGIN]);
// GitHub serves a commit by its SHA after a force push has left it unreachable.
mustGit(ORIGIN, ['config', 'uploadpack.allowAnySHA1InWant', 'true']);
const RUNNER = path.join(SCRATCH, 'runner');
mustGit(SCRATCH, ['clone', '-q', '--branch', 'main', ORIGIN, RUNNER]);

/**
 * Run `script` as GitHub runs a `run:` block with no explicit shell (`bash -e`), in the
 * runner clone, with the stand-ins first on PATH.
 */
function runStepOnce(script, env, { armed = false, labels = '' } = {}) {
  const author = env.AUTHOR || 'dependabot[bot]';
  const head = env.STUB_HEAD || PLAIN.head;
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
      cwd: RUNNER,
      encoding: 'utf8',
      env: {
        PATH: `${STUB_BIN}${path.delimiter}${process.env.PATH}`,
        HOME: dir,
        GITHUB_OUTPUT: paths.output,
        STUB_LOG: paths.log,
        STUB_ARMED: paths.armed,
        STUB_LABELS: labels,
        STUB_COMMITS: `github|plain|${author}|${PLAIN.head}|${START}`,
        STUB_HEAD: head,
        STUB_PUSHES: creation(head, author),
        STUB_DECISION: '',
        STUB_ADMIN: ADMIN,
        STUB_FLAKY: FLAKY,
        STUB_FILES: '.github/workflows/publish.yml package.json',
        GH_REPO: 'owner/repo',
        PR_NUMBER: PLAIN.number,
        PR_URL: 'https://github.com/owner/repo/pull/7',
        AUTHOR: author,
        EVENT_HEAD: head,
        HEAD_REF: 'bump',
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
      stdout: result.stdout,
      stderr: result.stderr,
      calls: fs.readFileSync(paths.log, 'utf8').split('\n').filter(Boolean),
      outputs,
      armed: fs.readFileSync(paths.armed, 'utf8').trim() === 'true',
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Most negative cases change one step, so a run whose script and inputs repeat is
// answered from the first.
const RUNS = new Map();
function runStep(script, env, options = {}) {
  const key = JSON.stringify([script, env, options]);
  if (!RUNS.has(key)) RUNS.set(key, runStepOnce(script, env, options));
  return RUNS.get(key);
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
    const hookBump = runStep(decide, { ...AS_PRE_COMMIT_CI, UPDATE_TYPE: '' });
    if (hookBump.status !== 0 || hookBump.outputs.should_merge !== 'true') {
      add('pre-commit-ci-held', hookBump.stderr.trim());
    }
  }

  // --- Which heads are trusted ----------------------------------------------------
  const verify = runnable(bot, PROVENANCE_STEP, 'bot-automerge.yml', add);
  if (verify !== null) {
    const verifyFor = (scenario) =>
      runStep(verify, {
        PR_NUMBER: scenario.number,
        STUB_COMMITS: scenario.rows,
        STUB_HEAD: scenario.head,
        ...(scenario.pushes && { STUB_PUSHES: scenario.pushes.join('\n') }),
        ...scenario.env,
      });

    // Only a clean two-parent merge, or an admin's, leaves the head trusted.
    const lookupsIn = (run) =>
      run.calls.filter((call) => call.includes('/collaborators/')).length;
    for (const scenario of TRUSTED_MERGES) {
      const run = verifyFor(scenario);
      if (run.status !== 0 || run.outputs.trusted !== 'true') {
        add('trusted-merge-held', `${scenario.name}: ${run.stderr.trim()}`);
      }
      if (lookupsIn(run) !== scenario.lookups) {
        add('lookup-count', `${scenario.name}: ${lookupsIn(run)}`);
      }
    }
    for (const scenario of HELD_MERGES) {
      const run = verifyFor(scenario);
      if (run.outputs.trusted === 'true') add('merge-not-held', scenario.name);
      if (lookupsIn(run) !== scenario.lookups) {
        add('lookup-count', `${scenario.name}: ${lookupsIn(run)}`);
      }
    }

    // A count that is not an integer fails the step, so nothing is armed.
    for (const count of ['null', '3abc', '']) {
      const run = runStep(verify, { STUB_COUNT: count });
      if (run.status === 0 || run.outputs.trusted !== undefined) {
        add('count-not-held', count || '(empty)');
      }
    }

    // Every push since the branch was created, and the head it reaches.
    for (const scenario of TRUSTED_HISTORIES) {
      const run = verifyFor(scenario);
      if (run.status !== 0 || run.outputs.trusted !== 'true') {
        add('trusted-push-held', `${scenario.name}: ${run.stdout.trim()}`);
      } else if (run.outputs.head !== scenario.head) {
        add('verdict-names-no-head', `${scenario.name}: ${run.outputs.head}`);
      }
    }
    for (const scenario of HELD_HISTORIES) {
      const run = verifyFor(scenario);
      if (run.outputs.trusted === 'true') {
        add('push-not-held', scenario.name);
      } else if (!run.stdout.includes(scenario.reason)) {
        add('held-for-another-reason', `${scenario.name}: ${run.stdout.trim()}`);
      }
    }
  }

  // The steps run one at a time above, so each step's condition on the verdict before
  // it is pinned here as text. Without them a held head or update would be armed, and
  // every case above would still pass.
  if (stepKey(bot, PROVENANCE_STEP, 'id') !== 'provenance') {
    add('provenance-id-changed', stepKey(bot, PROVENANCE_STEP, 'id') || '(none)');
  }
  if (
    stepKey(bot, ELIGIBILITY_STEP, 'if') !==
    "steps.provenance.outputs.trusted == 'true'"
  ) {
    add('eligibility-not-gated', stepKey(bot, ELIGIBILITY_STEP, 'if') || '(none)');
  }
  if (stepKey(bot, ELIGIBILITY_STEP, 'id') !== 'eligible') {
    add('eligibility-id-changed', stepKey(bot, ELIGIBILITY_STEP, 'id') || '(none)');
  }
  if (
    stepKey(bot, ARM_STEP, 'if') !== "steps.eligible.outputs.should_merge == 'true'"
  ) {
    add('arm-not-gated', stepKey(bot, ARM_STEP, 'if') || '(none)');
  }
  const verified = stepKey(bot, ARM_STEP, 'VERIFIED_HEAD', 2);
  if (verified !== '${{ steps.provenance.outputs.head }}') {
    add('verified-head-unwired', verified || '(none)');
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
    const armWith = (labels, head = PLAIN.head) =>
      runStep(arm, { VERIFIED_HEAD: head }, { labels });
    // The positive control, without which "never arms" would pass the cases below.
    const control = armWith('dependencies');
    if (!control.armed) add('never-arms', 'no label, and still not armed');
    const made = (prefix, ...parts) =>
      control.calls.some(
        (call) => call.startsWith(prefix) && parts.every((part) => call.includes(part))
      );
    if (!made('pr merge --auto', `--match-head-commit ${PLAIN.head}`)) {
      add('arm-not-pinned', control.calls.join('; '));
    }
    if (
      !made(
        'api -X POST repos/owner/repo/pulls/7/reviews',
        'event=APPROVE',
        `commit_id=${PLAIN.head}`
      )
    ) {
      add('approval-not-pinned', control.calls.join('; '));
    }
    for (const label of [KILL_SWITCH, 'Do Not Auto-Merge']) {
      if (armWith(`dependencies\n${label}`).armed) add('kill-switch-ignored', label);
    }
    const unverified = armWith('dependencies', '');
    if (unverified.status === 0 || unverified.armed) {
      add(
        'unverified-head-armed',
        `exit ${unverified.status}, armed ${unverified.armed}`
      );
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

// Which merges are trusted.
const MERGE_HOLD =
  'elif [ "$kind" = "merge" ] && ! mechanical "$sha" "$parents" &&\n' +
  '                 ! admin "$commit_author"; then';
const TREE_MATCH = '[ "$clean" = "$(git rev-parse --verify "${sha}^{tree}")" ]';
const IS_ADMIN = 'if [ "$permission" = admin ]; then';
const CACHED_ADMIN = 'case $admins in *" $login "*) return 0 ;; esac';
expectError('every merge trusted', 'merge-not-held', (c) => {
  c.bot = c.bot.replace(MERGE_HOLD, 'elif false; then');
});
expectError('every merge held', 'trusted-merge-held', (c) => {
  c.bot = c.bot.replace(MERGE_HOLD, 'elif [ "$kind" = "merge" ]; then');
});
expectError('a merge trusted without comparing its tree', 'merge-not-held', (c) => {
  c.bot = c.bot.replace(TREE_MATCH, 'true');
});
expectError('merges held by their author again', 'trusted-merge-held', (c) => {
  c.bot = c.bot.replace(
    MERGE_HOLD,
    `elif [ "$kind" = "merge" ] && [[ "$commit_author" != *'[bot]' ]]; then`
  );
});
expectError('admins no longer trusted', 'trusted-merge-held', (c) => {
  c.bot = c.bot.replace(IS_ADMIN, 'if false; then');
});
expectError('every author taken for an admin', 'merge-not-held', (c) => {
  c.bot = c.bot.replace(IS_ADMIN, 'if true; then');
});
expectError('a failed lookup read as admin', 'merge-not-held', (c) => {
  c.bot = c.bot.replace('|| permission=unknown', '|| permission=admin');
});
expectError('the lookup asked for every merge', 'lookup-count', (c) => {
  c.bot = c.bot.replace(CACHED_ADMIN, '');
});

// The commit count.
expectError('a count that is not an integer trusted', 'count-not-held', (c) => {
  c.bot = c.bot.replace('if ! [[ "$total" =~ ^[0-9]+$ ]]; then', 'if false; then');
});

// Which pushes are trusted, and which head.
expectError('every pusher trusted', 'push-not-held', (c) => {
  c.bot = c.bot.replace(
    'if [ "$pusher" != "$AUTHOR" ] && ! admin "$pusher"; then',
    'if false; then'
  );
});
expectError('every pusher held', 'trusted-push-held', (c) => {
  c.bot = c.bot.replace(
    'if [ "$pusher" != "$AUTHOR" ] && ! admin "$pusher"; then',
    'if true; then'
  );
});
expectError('only the newest push checked', 'push-not-held', (c) => {
  c.bot = c.bot.replace(
    'if [ "$change" = branch_creation ]; then\n              created=true',
    'if true; then\n              created=true'
  );
});
expectError(
  "a push's commits read whether or not they stay",
  'trusted-push-held',
  (c) => {
    c.bot = c.bot.replace('grep -qxF "$sha" <<< "$in_branch" || continue', 'true');
  }
);
expectError(
  'a history that never reaches the creation trusted',
  'push-not-held',
  (c) => {
    c.bot = c.bot.replace('if [ "$created" != true ]; then', 'if false; then');
  }
);
expectError('a history that never reaches the head trusted', 'push-not-held', (c) => {
  c.bot = c.bot.replace('if [ "${newest##*|}" != "$head" ]; then', 'if false; then');
});
expectError("a head other than the event's trusted", 'push-not-held', (c) => {
  c.bot = c.bot.replace('if [ "$head" != "$EVENT_HEAD" ]; then', 'if false; then');
});
expectError('a head that moved trusted', 'push-not-held', (c) => {
  c.bot = c.bot.replace(
    'if [ "$fetched" != "$head" ] || [ "$listed" != "$head" ]; then',
    'if false; then'
  );
});
expectError('a trusted verdict naming no head', 'verdict-names-no-head', (c) => {
  c.bot = c.bot.replace('echo "head=${head}" >>"$GITHUB_OUTPUT"', 'true');
});
expectError('the provenance step renamed', 'step-missing', (c) => {
  c.bot = c.bot.replace(`- name: ${PROVENANCE_STEP}`, '- name: Verify');
});
expectError(
  'the verdict read from a provenance step not there',
  'provenance-id-changed',
  (c) => {
    c.bot = c.bot.replace(
      `- name: ${PROVENANCE_STEP}\n        id: provenance`,
      `- name: ${PROVENANCE_STEP}\n        id: verify`
    );
  }
);
expectError(
  'eligibility no longer waits for provenance',
  'eligibility-not-gated',
  (c) => {
    c.bot = c.bot.replace(
      `- name: ${ELIGIBILITY_STEP}\n        id: eligible\n        if: steps.provenance.outputs.trusted == 'true'\n`,
      `- name: ${ELIGIBILITY_STEP}\n        id: eligible\n`
    );
  }
);
expectError('a pre-commit-ci pull request held', 'pre-commit-ci-held', (c) => {
  c.bot = c.bot.replace(
    'if [ "$AUTHOR" = "pre-commit-ci[bot]" ]; then',
    'if false; then'
  );
});

// Arming and approving name the verified head.
expectError('arming whatever the head is', 'arm-not-pinned', (c) => {
  c.bot = c.bot.replace('--match-head-commit "$VERIFIED_HEAD" ', '');
});
expectError('approving whatever the head is', 'approval-not-pinned', (c) => {
  c.bot = c.bot.replace(' -f commit_id="$VERIFIED_HEAD"', '');
});
expectError('arming with no verified head', 'unverified-head-armed', (c) => {
  c.bot = c.bot.replace(
    'if ! [[ "$VERIFIED_HEAD" =~ ^[0-9a-f]{40}([0-9a-f]{24})?$ ]]; then',
    'if false; then'
  );
});
expectError('the verified head taken from the event', 'verified-head-unwired', (c) => {
  c.bot = c.bot.replace(
    'VERIFIED_HEAD: ${{ steps.provenance.outputs.head }}',
    'VERIFIED_HEAD: ${{ github.event.pull_request.head.sha }}'
  );
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
  c.bot = c.bot.replace(
    'GH_TOKEN="$ARM_TOKEN" gh pr merge --auto --squash \\',
    'true \\'
  );
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
