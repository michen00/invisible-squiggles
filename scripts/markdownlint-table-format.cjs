'use strict';

/**
 * Repo-local markdownlint custom rule to auto-format GFM tables for MD060.
 *
 * The published `markdownlint-rule-table-format` package is close to what this
 * repo needs, but the current release does not honor its documented alias and
 * formats fenced-code and markdownlint-disabled regions incorrectly. This local
 * rule keeps the markdownlint workflow while enforcing the repository's chosen
 * table style safely.
 *
 * Vendored from aicadium-lab/ai4inputs-specs and reformatted by this repo's
 * prettier, which sets experimentalTernaries and a different trailingComma.
 * Fixes belong upstream: change it there and re-copy, so the two do not drift
 * on anything that matters. Diff across the two ignoring whitespace.
 */

const ALIGN_NONE = 'none';
const ALIGN_LEFT = 'left';
const ALIGN_CENTER = 'center';
const ALIGN_RIGHT = 'right';

const RULE_NAMES = new Set([
  'md060',
  'table-column-style',
  'table-format',
  'table-column-style-fix',
]);

const BLOCK_COMMAND_RE =
  /<!--\s*markdownlint-(disable-file|disable-next-line|disable|enable)\b([^>]*)-->/iu;

const DELIMITER_RE = /^:?-+:?$/u;

function visualWidth(value) {
  return Array.from(value).length;
}

function parseRuleNames(rawNames) {
  const beforeComment = rawNames.split('--', 1)[0].trim();
  if (!beforeComment) {
    return [];
  }

  return beforeComment
    .split(/[\s,]+/u)
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

function appliesToRule(rawNames) {
  const names = parseRuleNames(rawNames);
  if (names.length === 0) {
    return true;
  }

  return names.some((name) => RULE_NAMES.has(name));
}

function findDisabledLines(lines) {
  const disabledLines = new Set();
  let blockDisabled = false;
  let fileDisabled = false;
  let disableNextLine = false;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];

    if (fileDisabled || blockDisabled || disableNextLine) {
      disabledLines.add(lineNumber);
    }

    disableNextLine = false;

    const match = line.match(BLOCK_COMMAND_RE);
    if (!match) {
      continue;
    }

    const [, command, rawNames] = match;
    if (!appliesToRule(rawNames)) {
      continue;
    }

    disabledLines.add(lineNumber);

    if (command === 'disable-file') {
      fileDisabled = true;
    } else if (command === 'disable-next-line') {
      disableNextLine = true;
    } else if (command === 'disable') {
      blockDisabled = true;
    } else if (command === 'enable') {
      blockDisabled = false;
    }
  }

  return disabledLines;
}

function splitCells(rawRow) {
  const cells = [];
  let current = '';
  let escaped = false;

  for (const char of rawRow) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      current += char;
      escaped = true;
      continue;
    }

    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function getRowPrefix(rawLine) {
  const match = rawLine.match(/^(\s*(?:>\s*)*)/u);
  return match ? match[1] : '';
}

function parseRow(rawLine, prefix) {
  let line = rawLine;
  if (prefix && line.startsWith(prefix)) {
    line = line.slice(prefix.length);
  }

  line = line.trim();
  if (line.startsWith('|')) {
    line = line.slice(1);
  }
  if (line.endsWith('|')) {
    line = line.slice(0, -1);
  }

  return splitCells(line);
}

function parseAlignment(delimiterCell) {
  const value = delimiterCell.trim();
  if (!DELIMITER_RE.test(value)) {
    return ALIGN_NONE;
  }

  const leftAligned = value.startsWith(':');
  const rightAligned = value.endsWith(':');

  if (leftAligned && rightAligned) {
    return ALIGN_CENTER;
  }
  if (leftAligned) {
    return ALIGN_LEFT;
  }
  if (rightAligned) {
    return ALIGN_RIGHT;
  }
  return ALIGN_NONE;
}

function delimiterCellFor(width, alignment, alignedDelimiter) {
  if (!alignedDelimiter) {
    if (alignment === ALIGN_CENTER) {
      return ':-:';
    }
    if (alignment === ALIGN_LEFT) {
      return ':--';
    }
    if (alignment === ALIGN_RIGHT) {
      return '--:';
    }
    return '---';
  }

  const minimumWidth =
    alignment === ALIGN_CENTER ? 3
    : alignment === ALIGN_NONE ? 1
    : 2;
  const cellWidth = Math.max(width, minimumWidth);

  if (alignment === ALIGN_CENTER) {
    return `:${'-'.repeat(Math.max(1, cellWidth - 2))}:`;
  }
  if (alignment === ALIGN_LEFT) {
    return `:${'-'.repeat(Math.max(1, cellWidth - 1))}`;
  }
  if (alignment === ALIGN_RIGHT) {
    return `${'-'.repeat(Math.max(1, cellWidth - 1))}:`;
  }
  return '-'.repeat(cellWidth);
}

function normalizeHeaderCell(cell) {
  return cell === '' ? '&nbsp;' : cell;
}

function formatCompactCell(cell) {
  return cell === '' ? ' ' : ` ${cell} `;
}

function formatCompactRow(cells, prefix) {
  return `${prefix}|${cells.map(formatCompactCell).join('|')}|`;
}

function formatDelimiterRow(headerCells, alignments, prefix, alignedDelimiter) {
  const cells = headerCells.map((headerCell, index) =>
    delimiterCellFor(
      Math.max(1, visualWidth(headerCell)),
      alignments[index] ?? ALIGN_NONE,
      alignedDelimiter
    )
  );

  return `${prefix}| ${cells.join(' | ')} |`;
}

function normalizeRows(rawLines) {
  if (rawLines.length < 2) {
    return null;
  }

  const prefix = getRowPrefix(rawLines[0]);
  const parsedRows = rawLines.map((line) => parseRow(line, prefix));
  const columnCount = parsedRows[1].length;

  if (columnCount === 0) {
    return null;
  }

  const normalizedRows = parsedRows.map((row) => {
    if (row.length > columnCount) {
      return null;
    }

    if (row.length === columnCount) {
      return row;
    }

    return row.concat(Array.from({ length: columnCount - row.length }, () => ''));
  });

  if (normalizedRows.some((row) => row === null)) {
    return null;
  }

  return { prefix, rows: normalizedRows };
}

function formatTable(rawLines, alignedDelimiter) {
  const normalized = normalizeRows(rawLines);
  if (!normalized) {
    return null;
  }

  const { prefix, rows } = normalized;
  const headerCells = rows[0].map(normalizeHeaderCell);
  const delimiterCells = rows[1];
  const alignments = delimiterCells.map(parseAlignment);

  const formattedLines = [formatCompactRow(headerCells, prefix)];
  formattedLines.push(
    formatDelimiterRow(headerCells, alignments, prefix, alignedDelimiter)
  );

  for (const row of rows.slice(2)) {
    formattedLines.push(formatCompactRow(row, prefix));
  }

  return formattedLines;
}

module.exports = {
  names: ['table-format', 'table-column-style-fix'],
  description: 'Format GitHub-Flavored Markdown tables to compact MD060 style.',
  information: new URL(
    'https://github.com/DavidAnson/markdownlint/blob/main/doc/md060.md'
  ),
  tags: ['table', 'fix', 'custom'],
  parser: 'markdownit',
  function: (params, onError) => {
    const config = params.config ?? {};
    const style = config.style ?? 'compact';
    if (style === 'any' || style !== 'compact') {
      return;
    }

    const alignedDelimiter = config.aligned_delimiter === true;
    const disabledLines = findDisabledLines(params.lines);
    const tokens = params.parsers.markdownit.tokens;

    for (const token of tokens) {
      if (token.type !== 'table_open' || !Array.isArray(token.map)) {
        continue;
      }

      const [startIndex, endIndex] = token.map;
      const startLineNumber = startIndex + 1;
      const endLineNumber = endIndex;

      let skipTable = false;
      for (
        let lineNumber = startLineNumber;
        lineNumber <= endLineNumber;
        lineNumber += 1
      ) {
        if (disabledLines.has(lineNumber)) {
          skipTable = true;
          break;
        }
      }
      if (skipTable) {
        continue;
      }

      const rawLines = params.lines.slice(startIndex, endIndex);
      const formattedLines = formatTable(rawLines, alignedDelimiter);

      if (!formattedLines || formattedLines.length !== rawLines.length) {
        continue;
      }

      const formattedText = formattedLines.join('\n');
      const rawText = rawLines.join('\n');
      if (formattedText === rawText) {
        continue;
      }

      for (let offset = rawLines.length - 1; offset >= 0; offset -= 1) {
        const lineNumber = startLineNumber + offset;
        const oldLine = rawLines[offset];
        const newLine = formattedLines[offset];
        if (oldLine === newLine) {
          continue;
        }
        const context = oldLine.length > 80 ? `${oldLine.slice(0, 80)}…` : oldLine;

        const error = {
          lineNumber,
          detail: 'Table formatting (compact style).',
          context,
        };

        error.fixInfo = {
          lineNumber,
          editColumn: 1,
          deleteCount: oldLine.length,
          insertText: newLine,
        };

        onError(error);
      }
    }
  },
};
