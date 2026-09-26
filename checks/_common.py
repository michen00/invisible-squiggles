"""Shared validation helpers for the deterministic PR checks.

These helpers embody the repository's governing rule: a tool's action may never be
stronger than its detection is certain. Heuristic or ambiguous problems are therefore
always warnings, which advise but never block. An exact detection is permitted to block
but is not obliged to: a plan identifier is matched exactly and still only advises,
because what a change is called is the author's to settle. See docs/architecture.md.
"""

from __future__ import annotations

__all__ = (
    "CONVENTIONAL_TYPES",
    "SUBJECT_MAX_DEFAULT",
    "Findings",
    "check_subject",
    "subject_max_length",
)

import os
import re
import sys
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

CONVENTIONAL_TYPES = (
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "revert",
)

# The type is a closed vocabulary that the changelog groups by, so it is matched as
# written. A scope names a part of the codebase, some of those names are capitalized,
# and the specification forbids treating it as case-sensitive.
_SCOPE = r"[A-Za-z0-9._/-]+"
_CONVENTIONAL = re.compile(
    r"^(?:" + "|".join(CONVENTIONAL_TYPES) + r")"
    r"(?:\(" + _SCOPE + r"\))?!?: (?P<subject>.+)$"
)

# The same parts, read loosely enough to match what _CONVENTIONAL rejects, so that the
# error can name the part that is wrong. It matches every string.
_LOOSE_FORM = re.compile(
    r"(?P<type>[^(!:\s]*)(?P<scope>\([^)]*\))?!?(?P<rest>.*)", re.DOTALL
)

# git documents this number rather than convention alone: git-commit(1) DISCUSSION asks
# for "a single short (no more than 50 characters) line summarizing the change", and
# Documentation/SubmittingPatches calls 50 the soft limit. It is a default rather than a
# constant because a repository copying this kit may answer to a different house rule --
# gitlint ships 72 and commitlint 100 -- and rebinding one should not mean editing this.
SUBJECT_MAX_DEFAULT = 50

_MAX_LENGTH_VARIABLE = "SUBJECT_MAX_LENGTH"

# Common non-imperative first words: third-person and past forms we see most often.
_NON_IMPERATIVE = frozenset(
    {
        "added",
        "adds",
        "fixed",
        "fixes",
        "updated",
        "updates",
        "removed",
        "removes",
        "changed",
        "changes",
        "refactored",
        "renamed",
        "moved",
        "deleted",
        "created",
        "implemented",
        "introduced",
        "bumped",
        "merged",
    }
)

_PLAN_ID = re.compile(r"\b(?:F\d+|S\d+|Phase\s*\d+|Slice\s*\w+)\b")


@dataclass(slots=True)
class Findings:
    """Result of a check: errors block, warnings advise (the action-strength rule)."""

    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def merge(self, other: Findings) -> None:
        """Fold another result into this one."""
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)

    @property
    def ok(self) -> bool:
        """Whether nothing blocks, i.e. there are no errors."""
        return not self.errors

    def _publish(self, severity: str, message: str) -> None:
        """Print one finding, as a workflow annotation when running under Actions.

        An annotation reaches the Checks tab and the run summary; a plain stderr
        line reaches only a job log, which nobody opens when the job is green.
        Workflow commands are read from stdout, so the annotation form goes there
        while a local run keeps the stream and the wording it always had.
        """
        if os.environ.get("GITHUB_ACTIONS"):
            print(f"::{severity}::{message}")
        else:
            print(f"{severity}: {message}", file=sys.stderr)

    def _record_to(self, env_var: str, items: list[str], *, label: str) -> None:
        """Append `items` to the file named by the environment variable `env_var`.

        Shared by `_record` (warnings) and `_record_errors` (errors): both name a
        different variable and a different list, but the write -- and what
        happens when it fails -- is identical. `label` names what a failure
        warns about, since the same `OSError` reads differently depending on
        which list it lost.
        """
        target = os.environ.get(env_var, "").strip()
        if not target or not items:
            return
        path = Path(target)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as handle:
                handle.writelines(f"{item}\n" for item in items)
        except OSError as error:
            self._publish("warning", f"could not record {label} to {path}: {error}")

    def _record(self) -> None:
        """Append the warnings to the file named by ``PR_WARNINGS_FILE``, if any.

        Each check step names its own file, so the stem identifies whichever check
        raised what the file holds and the upsert step can group by it without
        Findings ever learning about labels. Absent the variable -- every local
        run -- this does nothing, and a clean check writes no file at all, so the
        comment step never renders a heading with nothing under it.

        Recording is a convenience; the raw job log `_publish` writes to is the
        durable record -- GitHub renders at most ten annotations per level per
        step, so a high-warning check truncates on the Checks tab and the run
        summary while the log keeps every line. So a filesystem problem here --
        a bad permission, a full disk, a path component that already exists as
        a file -- is reported as a warning rather than raised, and never turns
        an otherwise-clean, warnings-only check into a hard failure.
        """
        self._record_to("PR_WARNINGS_FILE", self.warnings, label="warnings")

    def _record_errors(self) -> None:
        """Append the errors to the file named by ``PR_ERRORS_FILE``, if any.

        A separate variable and file from `_record`, deliberately: the
        advisory-comment workflow reads only `PR_WARNINGS_FILE`, and folding
        errors into that stream would present a blocking problem as mere
        advice. The gate step in pr-mechanical-checks.yml is this file's only
        reader -- it folds the content into its own failure message, so a red
        job names the actual problem instead of a bare `body=failure`. Absent
        the variable -- every local run -- this does nothing, matching
        `_record`.
        """
        self._record_to("PR_ERRORS_FILE", self.errors, label="errors")

    def emit(self, ok_message: str) -> int:
        """Print findings, record them via `_record`/`_record_errors`, and
        return an exit code.

        The filesystem writes are a real side effect a caller reading only this
        docstring should know about, not just the printed and annotated forms.
        """
        publish = self._publish
        for warning in self.warnings:
            publish("warning", warning)
        for error in self.errors:
            publish("error", error)
        self._record()
        self._record_errors()
        if self.ok:
            suffix = " (with warnings)" if self.warnings else ""
            print(f"{ok_message}{suffix}")
            return 0
        return 1


def _looks_non_imperative(first_word: str) -> bool:
    """Whether the first word reads as non-imperative (past tense or third person)."""
    low = first_word.lower()
    return low in _NON_IMPERATIVE or low.endswith("ing")


def _form_problem(subject_line: str) -> str:
    """The earliest part of a subject that breaks the Conventional Commit form.

    The parts are checked in reading order -- type, scope, separator, subject -- and
    only the first failure is named, so a subject with several problems reports them
    one at a time.
    """
    parts = _LOOSE_FORM.fullmatch(subject_line)
    assert parts is not None, "_LOOSE_FORM matches every string"
    kind, scope, rest = parts["type"], parts["scope"], parts["rest"]
    if kind not in CONVENTIONAL_TYPES:
        if kind.lower() in CONVENTIONAL_TYPES:
            return f"the type '{kind}' must be lowercase"
        if ":" not in subject_line:
            return "there is no 'type: ' prefix"
        return f"'{kind}' is not a type (types: {', '.join(CONVENTIONAL_TYPES)})"
    if scope is not None and not re.fullmatch(_SCOPE, scope[1:-1]):
        return (
            f"the scope '{scope}' must be one or more letters, digits, "
            "'.', '_', '/' or '-'"
        )
    head = subject_line[: len(subject_line) - len(rest)]
    if not rest.startswith(": "):
        return f"'{head}' must be followed by ': ' (a colon, then a space)"
    return f"nothing follows '{head}: '"


def subject_max_length(
    explicit: int | None = None, *, environ: Mapping[str, str] | None = None
) -> int:
    """The number of characters a subject line may spend, most specific source first.

    An argument beats the environment, and the environment beats the default. A value
    that is not a positive whole number is ignored rather than raised on: this runs as a
    gate on every pull request, and a typo in a repository variable should not fail all
    of them with a traceback that names the variable instead of the title.

    The count is of the subject as written. Nothing is held back for the `" (#123)"` a
    squash merge appends, because those characters are the platform's and an author
    cannot spend them -- reserving room for them only ever charged an author for what
    they did not type, and left the number that governs a title different from the one
    that governs a commit.
    """
    if explicit is not None:
        return explicit
    source = os.environ if environ is None else environ
    configured = source.get(_MAX_LENGTH_VARIABLE, "").strip()
    if configured.isdigit() and int(configured) > 0:
        return int(configured)
    return SUBJECT_MAX_DEFAULT


def check_subject(
    subject_line: str, *, label: str = "subject", max_length: int | None = None
) -> Findings:
    """Validate one Conventional Commit subject line against the conventions.

    These are the rules that govern every subject, a commit's as much as a title's, and
    the length is now among them on the same terms: a title and a commit subject answer
    to one number, resolved by subject_max_length.
    """
    found = Findings()
    maximum = subject_max_length(max_length)
    match = _CONVENTIONAL.match(subject_line)
    if match is None:
        found.errors.append(
            f"{label}: not Conventional Commit form 'type(scope): subject', "
            f"because {_form_problem(subject_line)}"
        )
        return found

    subject = match.group("subject")

    # Deterministic and unambiguous -> errors (block).
    if len(subject_line) > maximum:
        found.errors.append(
            f"{label}: {len(subject_line)} chars exceeds hard max {maximum}"
        )
    if subject_line.endswith("."):
        found.errors.append(f"{label}: must not end with a period")

    # Heuristic or ambiguous -> warnings (advise).
    first_word = subject.split(" ", 1)[0]
    if first_word[:1].isupper():
        found.warnings.append(
            f"{label}: subject should start lowercase ('{first_word}')"
        )
    if _looks_non_imperative(first_word):
        found.warnings.append(
            f"{label}: subject may not be imperative ('{first_word}')"
        )
    if _PLAN_ID.search(subject):
        found.warnings.append(
            f"{label}: contains a plan identifier; keep it out of the subject"
        )
    return found
