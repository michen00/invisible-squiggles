#!/usr/bin/env node

// Tests the two hand-written tables in .github/workflows/bot-automerge.yml that decide
// whether a Dependabot major merges unattended.
//
// Both tables are strings this repository cannot resolve for itself, and both have
// already been wrong in a way that failed silently:
//
//   - The ecosystem names. dependabot/fetch-metadata derives package-ecosystem from the
//     branch name, so it emits Dependabot's internal slugs -- `npm_and_yarn` and
//     `github_actions` -- and never the keys `.github/dependabot.yml` is written in
//     (`npm`, `github-actions`). The workflow compared against the config keys, so both
//     arms were unreachable and every major fell through to the hold branch. Nothing was
//     unsafe and nothing was red; the feature simply did not exist, and the log line
//     announcing the hold read exactly like a deliberate one.
//
//   - The hold list. An actions major is armed unless the diff reaches a workflow no
//     pull request runs, and those workflows are listed rather than inferred. A list
//     that falls behind fails open: a workflow added, renamed, or given a narrower
//     trigger drops out of it and its actions start merging on evidence nothing
//     produced. Three were missing when this file was written.
//
// So the shape here is the same one scripts/test-ci-complete.cjs uses: the declaration
// stays in the workflow, where whoever edits the logic can see it, and this asserts the
// declaration still matches the repository. Anything it cannot classify is an error
// rather than a pass -- a workflow this file has never heard of is exactly the case the
// hold list gets wrong.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const BOT = path.join(WORKFLOW_DIR, 'bot-automerge.yml');
const DEPENDABOT = path.join(ROOT, '.github', 'dependabot.yml');

// package-ecosystem as written in dependabot.yml -> package-ecosystem as emitted by
// dependabot/fetch-metadata. The action reads chunks[1] of the branch name
// (`dependabot/npm_and_yarn/...`), which is Dependabot's internal slug for the
// ecosystem, not the key the config file is written in. The two differ for both
// ecosystems used here, which is the whole reason this table exists.
const ECOSYSTEM_SLUGS = {
  npm: 'npm_and_yarn',
  'github-actions': 'github_actions',
};

// Why each workflow is or is not evidence for an actions major, and the property that
// makes the answer checkable. `reason` is not a comment: each value names a test below,
// so a trigger edited out from under a classification fails rather than drifts.
//
//   pr-runs-it            a Dependabot pull request executes it, so a bump to an action
//                         it uses is exercised before the merge
//   no-pr-trigger         it has no pull_request trigger at all
//   pr-types-exclude-open its pull_request types do not include `opened`, so opening a
//                         Dependabot pull request does not start it
//   step-if-excludes-bots it runs, but the step holding the third-party action is
//                         gated on the author not being a bot, so that action never
//                         executes on the pull request bumping it
const CLASSIFICATION = {
  'bot-automerge-disarm.yml': 'pr-types-exclude-open',
  'bot-automerge.yml': 'pr-runs-it',
  'changelog-autoupdate.yml': 'no-pr-trigger',
  'ci.yml': 'pr-runs-it',
  'delete-bot-branches-for-closed-prs.yml': 'pr-types-exclude-open',
  'greet-new-contributors.yml': 'step-if-excludes-bots',
  'lint-github-actions.yml': 'pr-runs-it',
  'pr-title.yml': 'pr-runs-it',
  'pre-commit-autoupdate.yml': 'no-pr-trigger',
  'publish.yml': 'no-pr-trigger',
  'test-bot-automerge.yml': 'pr-runs-it',
  'test-check-pr-title.yml': 'pr-runs-it',
  'test-ci-complete.yml': 'pr-runs-it',
  'test-markdownlint-table-format.yml': 'pr-runs-it',
  'test-normalize-vsix.yml': 'pr-runs-it',
  'test-prepare-readme.yml': 'pr-runs-it',
  'test-release-tag.yml': 'pr-runs-it',
};

const HELD_REASONS = new Set([
  'no-pr-trigger',
  'pr-types-exclude-open',
  'step-if-excludes-bots',
]);

/** Lines of a top-level YAML block, comments and blanks included, key line excluded. */
function blockUnder(lines, startIndex, indent) {
  const out = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      out.push(line);
      continue;
    }
    // A comment at or beyond the block's indent belongs to it; one further left ends it.
    const leading = line.length - line.trimStart().length;
    if (leading < indent) break;
    out.push(line);
  }
  return out;
}

/**
 * The pull_request trigger of a workflow, or null when it has none.
 * Returns { types, paths } with null standing for "key absent", which is not the same
 * as an empty list: absent types means every default type fires.
 */
function pullRequestTrigger(text, errors, file) {
  const lines = text.split('\n');
  const onIndex = lines.findIndex((line) => /^on:\s*(#.*)?$/.test(line));
  if (onIndex === -1) {
    errors.push({ code: 'no-on-block', detail: file });
    return null;
  }

  const onBlock = blockUnder(lines, onIndex, 1);
  const prIndex = onBlock.findIndex((line) =>
    /^ {2}pull_request:\s*(#.*)?$/.test(line)
  );
  if (prIndex === -1) return null;

  const prBlock = blockUnder(onBlock, prIndex, 3);
  let types = null;
  let paths = null;

  for (let i = 0; i < prBlock.length; i += 1) {
    const flowTypes = /^ {4}types:\s*\[([^\]]*)\]\s*(#.*)?$/.exec(prBlock[i]);
    if (flowTypes) {
      types = flowTypes[1]
        .split(',')
        .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      continue;
    }
    if (/^ {4}types:/.test(prBlock[i])) {
      // Block-style types would need a different reader; refuse rather than read it as
      // "no types", which is the permissive answer and would classify a `[labeled]`
      // workflow as one every pull request runs.
      errors.push({ code: 'types-not-flow', detail: `${file}: ${prBlock[i].trim()}` });
      continue;
    }
    const flowPaths = /^ {4}paths:\s*\[([^\]]*)\]\s*(#.*)?$/.exec(prBlock[i]);
    if (flowPaths) {
      paths = flowPaths[1]
        .split(',')
        .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      continue;
    }
    if (/^ {4}paths:\s*(#.*)?$/.test(prBlock[i])) {
      paths = [];
      for (let j = i + 1; j < prBlock.length; j += 1) {
        const item = /^ {6}- (.+?)\s*(#.*)?$/.exec(prBlock[j]);
        if (item) {
          paths.push(item[1].replace(/^['"]|['"]$/g, ''));
          continue;
        }
        if (/^\s*$/.test(prBlock[j])) continue;
        break;
      }
    }
  }

  return { types, paths };
}

/**
 * Whether a GitHub path filter pattern covers `file`. Only `*` and `**` are modelled --
 * `?` means "zero or one of the preceding character" in these filters rather than "any
 * character", and `!` negates, so a pattern using either is refused by the caller rather
 * than read under the wrong semantics.
 */
function pathMatches(pattern, file) {
  if (pattern === file) return true;
  if (!pattern.includes('*')) return false;
  const rx = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${rx}$`).test(file);
}

/**
 * Every complaint about the current tables, as { code, detail }. Returning them rather
 * than printing keeps the negative cases below able to assert on a specific failure.
 */
function analyze({ bot, dependabot, workflows }) {
  const errors = [];
  const add = (code, detail) => errors.push({ code, detail });

  // --- The ecosystem names -------------------------------------------------------
  const configured = [
    ...dependabot.matchAll(/^\s*-?\s*package-ecosystem:\s*(\S+)/gm),
  ].map((match) => match[1].replace(/^['"]|['"]$/g, ''));
  if (configured.length === 0) add('no-ecosystems', 'dependabot.yml declares none');

  const compared = new Set(
    [...bot.matchAll(/\[\s*"\$ECOSYSTEM"\s*=\s*"([^"]*)"\s*\]/g)].map((m) => m[1])
  );
  if (compared.size === 0) add('no-ecosystem-tests', 'bot-automerge.yml compares none');

  const expected = new Set();
  for (const key of configured) {
    const slug = ECOSYSTEM_SLUGS[key];
    if (!slug) {
      // A new ecosystem in dependabot.yml whose slug this table has never been told.
      // Guessing it is what produced the original bug.
      add('unknown-ecosystem', key);
      continue;
    }
    expected.add(slug);
    if (!compared.has(slug)) add('missing-ecosystem-branch', `${key} -> ${slug}`);
    if (compared.has(key) && key !== slug) add('config-key-not-slug', key);
  }
  for (const value of compared) {
    if (!expected.has(value) && !configured.includes(value)) {
      add('unknown-comparison', value);
    }
  }

  // --- The hold list -------------------------------------------------------------
  // Extracted from the `grep -cFx -e '...'` invocation rather than from a data file:
  // the job deliberately has no checkout step, so the list has to live in the workflow.
  const held = new Set(
    [...bot.matchAll(/-e '(\.github\/workflows\/[^']+)'/g)].map((match) => match[1])
  );
  if (held.size === 0) add('no-hold-list', 'bot-automerge.yml holds nothing');

  // A rename is the cheapest way out of a hold list keyed on exact paths, and the files
  // query is what closes it.
  if (!bot.includes('previous_filename')) add('rename-not-covered', 'files query');

  const classifiedHeld = new Set(
    Object.entries(CLASSIFICATION)
      .filter(([, reason]) => HELD_REASONS.has(reason))
      .map(([file]) => `.github/workflows/${file}`)
  );

  for (const file of workflows.keys()) {
    if (!CLASSIFICATION[file]) add('unclassified', file);
  }
  for (const file of Object.keys(CLASSIFICATION)) {
    if (!workflows.has(file)) add('stale-classification', file);
  }
  for (const entry of held) {
    if (!classifiedHeld.has(entry)) add('holds-an-exercised-workflow', entry);
  }
  for (const entry of classifiedHeld) {
    if (!held.has(entry)) add('missing-from-hold-list', entry);
  }

  // --- Each classification still matches its workflow ----------------------------
  for (const [file, reason] of Object.entries(CLASSIFICATION)) {
    const text = workflows.get(file);
    if (text === undefined) continue;
    const trigger = pullRequestTrigger(text, errors, file);
    const opens =
      trigger !== null && (trigger.types === null || trigger.types.includes('opened'));

    if (reason === 'no-pr-trigger') {
      if (trigger !== null) add('has-pr-trigger', file);
    } else if (reason === 'pr-types-exclude-open') {
      if (trigger === null) add('claimed-pr-types-but-no-trigger', file);
      else if (opens) add('pr-types-do-include-open', file);
    } else if (reason === 'step-if-excludes-bots') {
      if (!/is-bot/.test(text)) add('no-bot-guard', file);
    } else if (reason === 'pr-runs-it') {
      if (!opens) {
        add('not-run-by-a-pr', file);
      } else if (trigger.paths !== null) {
        // A paths filter that does not cover the workflow's own path means a bump to an
        // action written in this file never starts it, so the file is not evidence for
        // its own actions even though every other pull request runs it.
        const self = `.github/workflows/${file}`;
        const unsupported = trigger.paths.filter(
          (pattern) => pattern.includes('?') || pattern.startsWith('!')
        );
        if (unsupported.length !== 0) {
          add('paths-pattern-unsupported', `${file}: ${unsupported.join(', ')}`);
        } else if (!trigger.paths.some((pattern) => pathMatches(pattern, self))) {
          add('paths-omit-self', file);
        }
      }
    } else {
      add('unknown-reason', `${file}: ${reason}`);
    }
  }

  return errors;
}

function readWorkflows(dir) {
  const workflows = new Map();
  for (const entry of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(entry)) continue;
    workflows.set(entry, fs.readFileSync(path.join(dir, entry), 'utf8'));
  }
  return workflows;
}

const live = {
  bot: fs.readFileSync(BOT, 'utf8'),
  dependabot: fs.readFileSync(DEPENDABOT, 'utf8'),
  workflows: readWorkflows(WORKFLOW_DIR),
};

let failures = 0;

const actual = analyze(live);
if (actual.length !== 0) {
  failures += 1;
  console.error('FAIL: bot-automerge.yml does not match the repository:');
  for (const { code, detail } of actual) console.error(`  ${code}: ${detail}`);
}

// --- Negative cases -------------------------------------------------------------
// A suite over a passing tree only proves the tree passes. Each case breaks one thing
// and asserts the specific complaint, so a rewrite that stops checking something fails
// here instead of going quiet.

/** Apply `mutate` to a copy of the live inputs and require `code` among the errors. */
function expectError(name, code, mutate) {
  const copy = {
    bot: live.bot,
    dependabot: live.dependabot,
    workflows: new Map(live.workflows),
  };
  mutate(copy);
  if (
    copy.bot === live.bot &&
    copy.dependabot === live.dependabot &&
    copy.workflows.size === live.workflows.size &&
    [...copy.workflows].every(([file, text]) => live.workflows.get(file) === text)
  ) {
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

// The original bug, in both directions.
expectError('npm slug reverted to the config key', 'missing-ecosystem-branch', (c) => {
  c.bot = c.bot.replace('"npm_and_yarn"', '"npm"');
});
expectError('npm slug reverted to the config key', 'config-key-not-slug', (c) => {
  c.bot = c.bot.replace('"npm_and_yarn"', '"npm"');
});
expectError('actions slug reverted to the config key', 'config-key-not-slug', (c) => {
  c.bot = c.bot.replace('"github_actions"', '"github-actions"');
});
expectError('an ecosystem arm deleted outright', 'missing-ecosystem-branch', (c) => {
  c.bot = c.bot.replace('"github_actions"', '"nothing_matches_this"');
});
expectError(
  'a comparison against an ecosystem nobody configured',
  'unknown-comparison',
  (c) => {
    c.bot = c.bot.replace('"npm_and_yarn"', '"cargo"');
  }
);
expectError('a new ecosystem with no known slug', 'unknown-ecosystem', (c) => {
  c.dependabot = c.dependabot.replace(
    '  - package-ecosystem: npm',
    '  - package-ecosystem: docker\n    directory: /\n  - package-ecosystem: npm'
  );
});
expectError('every ecosystem test removed', 'no-ecosystem-tests', (c) => {
  c.bot = c.bot.replace(/\[\s*"\$ECOSYSTEM"[^\]]*\]/g, '[ -n "$ECOSYSTEM" ]');
});

// The hold list.
expectError('a held workflow dropped from the list', 'missing-from-hold-list', (c) => {
  c.bot = c.bot.replace(/^.*-e '\.github\/workflows\/publish\.yml'.*$/m, '');
});
expectError('the whole hold list removed', 'no-hold-list', (c) => {
  c.bot = c.bot.replace(/-e '\.github\/workflows\/[^']+'/g, "-e 'nothing'");
});
expectError('rename evasion reopened', 'rename-not-covered', (c) => {
  c.bot = c.bot.replace('previous_filename', 'filename');
});
expectError('a workflow this file has never seen', 'unclassified', (c) => {
  c.workflows.set('brand-new.yml', 'on:\n  pull_request:\n');
});
expectError('a classified workflow deleted or renamed', 'stale-classification', (c) => {
  c.workflows.delete('publish.yml');
});
expectError('holding a workflow every PR runs', 'holds-an-exercised-workflow', (c) => {
  c.bot = c.bot.replace(
    "-e '.github/workflows/publish.yml'",
    "-e '.github/workflows/publish.yml' \\\n             -e '.github/workflows/ci.yml'"
  );
});

// A classification that stopped matching its workflow.
expectError('a held workflow gains a pull_request trigger', 'has-pr-trigger', (c) => {
  c.workflows.set(
    'publish.yml',
    c.workflows.get('publish.yml').replace(/^on:$/m, 'on:\n  pull_request:')
  );
});
expectError(
  'a labeled-only trigger widened to opened',
  'pr-types-do-include-open',
  (c) => {
    c.workflows.set(
      'bot-automerge-disarm.yml',
      c.workflows
        .get('bot-automerge-disarm.yml')
        .replace('types: [labeled]', 'types: [opened]')
    );
  }
);
expectError('the bot guard removed from the greeting', 'no-bot-guard', (c) => {
  c.workflows.set(
    'greet-new-contributors.yml',
    c.workflows.get('greet-new-contributors.yml').replace(/is-bot/g, 'is-human')
  );
});
expectError(
  'an exercised workflow loses its pull_request trigger',
  'not-run-by-a-pr',
  (c) => {
    c.workflows.set(
      'pr-title.yml',
      c.workflows.get('pr-title.yml').replace('  pull_request:', '  issues:')
    );
  }
);
expectError(
  'a self-triggering path filter stops listing itself',
  'paths-omit-self',
  (c) => {
    c.workflows.set(
      'test-ci-complete.yml',
      c.workflows
        .get('test-ci-complete.yml')
        .replace(
          /^ {6}- \.github\/workflows\/test-ci-complete\.yml$/m,
          '      - Makefile'
        )
    );
  }
);
expectError(
  'a paths pattern this file cannot model',
  'paths-pattern-unsupported',
  (c) => {
    c.workflows.set(
      'test-ci-complete.yml',
      c.workflows
        .get('test-ci-complete.yml')
        .replace(
          '      - .github/workflows/ci.yml\n',
          '      - .github/workflows/ci.ya?ml\n'
        )
    );
  }
);
expectError(
  'block-style types are refused rather than read as absent',
  'types-not-flow',
  (c) => {
    c.workflows.set(
      'bot-automerge-disarm.yml',
      c.workflows
        .get('bot-automerge-disarm.yml')
        .replace('types: [labeled]', 'types:\n      - labeled')
    );
  }
);

if (failures !== 0) {
  console.error(`bot-automerge.yml: ${failures} test(s) failed`);
  process.exit(1);
}

console.log('bot-automerge test passed (22 negative cases)');
