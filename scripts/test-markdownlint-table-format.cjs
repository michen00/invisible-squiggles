#!/usr/bin/env node

// Tests for scripts/markdownlint-table-format.cjs.
//
// The rule is an auto-fixer that rewrites Markdown in place, and it was already caught
// corrupting cell content once: a row ending in an escaped pipe lost that character,
// because the terminal-pipe strip did not check whether the pipe was escaped. Silent
// content damage is the worst failure a fixer has available, and this file is what
// stands between that and the tree.
//
// It runs the rule directly rather than through markdownlint, which is not a dependency
// of this repository -- it reaches the tree only through the pre-commit hook's own
// environment. The rule consumes very little of what markdownlint passes it: config,
// lines, and the markdown-it `table_open` tokens, of which it reads only `map`. Those
// are synthesised below, so this suite needs nothing installed.
//
// The rule came from aicadium-lab/ai4inputs-specs, which is archived, so no upstream
// suite will ever cover it. This is the only one it gets.

'use strict';

const rule = require('./markdownlint-table-format.cjs');

let failures = 0;

/** A table is a run of two or more consecutive lines opening with a pipe. */
function tableTokens(lines) {
  const tokens = [];
  let start = null;

  for (let index = 0; index <= lines.length; index += 1) {
    const isRow = index < lines.length && /^\s*\|/.test(lines[index]);
    if (isRow && start === null) {
      start = index;
    } else if (!isRow && start !== null) {
      if (index - start >= 2) {
        tokens.push({ type: 'table_open', map: [start, index] });
      }
      start = null;
    }
  }

  return tokens;
}

/** Run the rule and apply every fix it reports, the way markdownlint --fix would. */
function format(input, config) {
  const lines = input.split('\n');
  const errors = [];
  rule.function(
    { config, lines, parsers: { markdownit: { tokens: tableTokens(lines) } } },
    (error) => errors.push(error)
  );

  const out = [...lines];
  for (const { fixInfo } of errors) {
    if (!fixInfo) continue;
    const target = out[fixInfo.lineNumber - 1];
    const at = fixInfo.editColumn - 1;
    out[fixInfo.lineNumber - 1] =
      target.slice(0, at) + fixInfo.insertText + target.slice(at + fixInfo.deleteCount);
  }

  return { text: out.join('\n'), errorCount: errors.length };
}

function check(name, input, config, want) {
  const { text } = format(input, config);
  if (text !== want) {
    failures += 1;
    console.error(`FAIL: ${name}`);
    console.error(`  want: ${JSON.stringify(want)}`);
    console.error(`  got:  ${JSON.stringify(text)}`);
  }
}

function checkErrorCount(name, input, config, want) {
  const { errorCount } = format(input, config);
  if (errorCount !== want) {
    failures += 1;
    console.error(`FAIL: ${name}: expected ${want} error(s), got ${errorCount}`);
  }
}

const COMPACT = { style: 'compact' };
const ALIGNED = { style: 'compact', aligned_delimiter: true };

// --- Cell padding comes out, which is the whole point ------------------------------
check(
  'padding removed, fixed delimiters',
  '| aaa | b |\n| --- | - |\n| x   | y |\n',
  COMPACT,
  '| aaa | b |\n| --- | --- |\n| x | y |\n'
);

check(
  'aligned_delimiter sizes the delimiter to the header',
  '| aaa | b |\n| --------- | ---- |\n| x   | y |\n',
  ALIGNED,
  '| aaa | b |\n| --- | - |\n| x | y |\n'
);

check(
  'alignment markers survive both delimiter styles',
  '| a | b | c |\n| :-- | --: | :-: |\n| 1 | 2 | 3 |\n',
  COMPACT,
  '| a | b | c |\n| :-- | --: | :-: |\n| 1 | 2 | 3 |\n'
);

// --- The regression this file exists for -------------------------------------------
// `| a | value \|` has no closing delimiter: the final pipe is escaped and belongs to
// the cell. Stripping it unconditionally produced `| a | value \ |`, changing what the
// table renders.
check(
  'an escaped trailing pipe stays in the cell',
  '| h | v |\n| - | - |\n| a | value \\|\n',
  ALIGNED,
  '| h | v |\n| - | - |\n| a | value \\| |\n'
);

// The counterpart: an even number of backslashes leaves the pipe unescaped, so it is
// the closing delimiter and does come off.
check(
  'an escaped backslash before a pipe leaves it a delimiter',
  '| h | v |\n| - | - |\n| a | b\\\\|\n',
  ALIGNED,
  '| h | v |\n| - | - |\n| a | b\\\\ |\n'
);

check(
  'an escaped pipe mid-cell is not a cell boundary',
  '| h | v |\n| - | - |\n| a   | x \\| y |\n',
  ALIGNED,
  '| h | v |\n| - | - |\n| a | x \\| y |\n'
);

// --- Regions the rule is told to leave alone ---------------------------------------
check(
  'a markdownlint-disabled table is untouched',
  '<!-- markdownlint-disable -->\n| aaa | b |\n| --- | - |\n| x   | y |\n',
  COMPACT,
  '<!-- markdownlint-disable -->\n| aaa | b |\n| --- | - |\n| x   | y |\n'
);

// --- Properties that keep the pre-commit hook from thrashing ------------------------
checkErrorCount(
  'an already-compact table reports nothing',
  '| a | b |\n| - | - |\n| 1 | 2 |\n',
  ALIGNED,
  0
);

const once = format('| aaa | b |\n| --------- | ---- |\n| x   | y |\n', ALIGNED);
const twice = format(once.text, ALIGNED);
if (twice.errorCount !== 0 || twice.text !== once.text) {
  failures += 1;
  console.error('FAIL: formatting is not idempotent');
  console.error(`  first:  ${JSON.stringify(once.text)}`);
  console.error(`  second: ${JSON.stringify(twice.text)}`);
}

if (failures !== 0) {
  console.error(`markdownlint-table-format.cjs: ${failures} test(s) failed`);
  process.exit(1);
}

console.log('markdownlint-table-format.cjs test passed');
