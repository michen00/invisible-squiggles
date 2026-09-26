"""Check that each commit subject on the branch follows the conventions.

Merge commits and bot- or tool-authored commits are skipped, because their subjects
are exempt from the human-authored title rules. Any human commit whose subject is not
valid Conventional Commit form (or exceeds the hard length limit, or ends in a period)
is an error and exits non-zero; mood preferences are warnings.

The 50-character hard limit is the only length rule applied here. The tighter preferred
length belongs to titles, which have to leave room for the `" (#123)"` a squash merge
appends; a commit subject on a branch never grows one.

Usage:
    python -m checks.check_commit_messages            # origin/main..HEAD
    python -m checks.check_commit_messages main..HEAD
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from collections.abc import Iterable

from ._common import Findings, check_subject

_UNIT = "\x1f"
_BOT_AUTHORS = frozenset({"dependabot", "github-actions", "pre-commit-ci"})


def _commit_rows(rev_range: str) -> list[tuple[str, str, str]]:
    """Return (sha, author, subject) for each non-merge commit in the range."""
    result = subprocess.run(
        ["git", "log", "--no-merges", f"--format=%H{_UNIT}%an{_UNIT}%s", rev_range],
        capture_output=True,
        text=True,
        check=True,
    )
    rows: list[tuple[str, str, str]] = []
    append_row = rows.append
    for line in result.stdout.splitlines():
        sha, author, subject = line.split(_UNIT)
        append_row((sha, author, subject))
    return rows


def _is_bot(author: str) -> bool:
    """Whether an author is an automation identity whose subjects are exempt."""
    return "[bot]" in author or author.lower() in _BOT_AUTHORS


def check_commits(
    rows: Iterable[tuple[str, str, str]], *, max_length: int | None = None
) -> Findings:
    """Validate the subject of every non-bot commit and combine the findings.

    Each row is (sha, author, subject). Bot- or tool-authored commits are skipped.

    `max_length` is passed through to check_subject, so a commit subject and a pull
    request title answer to the same number from the same sources.
    """
    aggregate = Findings()
    merge_findings = aggregate.merge
    for sha, author, subject in rows:
        if _is_bot(author):
            continue
        merge_findings(check_subject(subject, label=sha[:7], max_length=max_length))
    return aggregate


def main(argv: list[str] | None = None) -> int:
    """Validate every human commit subject in the range and return an exit code."""
    parser = argparse.ArgumentParser(description="Check commit subjects on a branch.")
    parser.add_argument(
        "range",
        nargs="?",
        default="origin/main..HEAD",
        help="a git revision range (default: origin/main..HEAD)",
    )
    parser.add_argument(
        "--max-length",
        type=int,
        default=None,
        help=(
            "the maximum length a subject may spend; falls back to SUBJECT_MAX_LENGTH, "
            "and then to the documented default of 50"
        ),
    )
    args = parser.parse_args(argv)

    try:
        rows = _commit_rows(args.range)
    except subprocess.CalledProcessError as exc:
        print(f"error: git log failed: {exc.stderr.strip()}", file=sys.stderr)
        return 2

    found = check_commits(rows, max_length=args.max_length)
    if found.ok:
        checked = sum(1 for _, author, _ in rows if not _is_bot(author))
        ok_message = f"{checked} commit subject(s) OK"
    else:
        ok_message = ""
    return found.emit(ok_message)


if __name__ == "__main__":
    raise SystemExit(main())
