"""Deterministic, language-agnostic pull request checks.

Each module is a small standalone CLI that reports errors (which block) and warnings
(which advise). Invoke a check as a module, for example:

    python -m checks.check_pr_title "feat: add config precedence rule"
"""

__all__ = ()
