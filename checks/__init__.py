"""Deterministic, language-agnostic pull request checks.

Each module is a small standalone CLI that reports errors (which block) and warnings
(which advise), following the rule in docs/architecture.md that a tool's action may not
exceed the certainty of its detection. Invoke a check as a module, for example:

    python -m checks.check_pr_title "feat: add config precedence rule"
"""

__all__ = ()
