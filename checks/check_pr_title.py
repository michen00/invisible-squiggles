"""Check a pull request title against the repository conventions.

Deterministic problems (a bad Conventional Commit form, exceeding the maximum length, a
trailing period) are errors and exit non-zero. Everything else is a warning and does
not: mood, a capitalized start, and plan identifiers.

The length answers for the title as typed. A squash merge appends `" (#123)"`, and this
check used to reserve room for it -- a tighter band before the number was known, and a
projection of the landed subject once it was. Both are gone. Those characters are the
platform's and an author cannot spend them, and a 50-character title landing at 58 is
still well inside the 72 where GitHub truncates a subject. What the reservation bought
was a title budget that moved with the pull request number; what it cost was a rule
nobody could apply without knowing that number first.

Usage:
    python -m checks.check_pr_title "feat: add config precedence rule"
    PR_TITLE="fix: guard empty body" python -m checks.check_pr_title
    SUBJECT_MAX_LENGTH=72 python -m checks.check_pr_title "fix: guard empty body"
"""

from __future__ import annotations

import argparse
import os

from ._common import check_subject


def main(argv: list[str] | None = None) -> int:
    """Validate the title and return a process exit code."""
    parser = argparse.ArgumentParser(description="Check a PR title.")
    parser.add_argument(
        "title",
        nargs="?",
        default=os.environ.get("PR_TITLE"),
        help="the PR title; falls back to the PR_TITLE environment variable",
    )
    parser.add_argument(
        "--max-length",
        type=int,
        default=None,
        help=(
            "the maximum length a title may spend; falls back to SUBJECT_MAX_LENGTH, "
            "and then to the documented default of 50"
        ),
    )
    args = parser.parse_args(argv)
    if not args.title:
        parser.error("provide a title argument or set PR_TITLE")

    found = check_subject(args.title, label="title", max_length=args.max_length)
    return found.emit("title OK")


if __name__ == "__main__":
    raise SystemExit(main())
