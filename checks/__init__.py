"""Deterministic, language-agnostic pull request checks.

Each module is a small standalone CLI that reports errors (which block) and warnings
(which advise). Invoke a check as a module, for example:

    python -m checks.check_commit_messages origin/main..HEAD
"""

__all__ = ()
