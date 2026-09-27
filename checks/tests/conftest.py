"""Shared fixtures for the checks test suite."""

from __future__ import annotations

import pytest

_CLEARED_ENV_VARS = (
    "GITHUB_ACTIONS",
    "PR_TITLE",
    "PR_BODY",
    "PR_WARNINGS_FILE",
    "PR_ERRORS_FILE",
    "SUBJECT_MAX_LENGTH",
)


@pytest.fixture(autouse=True)
def _clean_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Isolate every test from the ambient environment.

    These checks read os.environ directly, and the real CI job that runs this
    suite sets GITHUB_ACTIONS=true -- without this, a test observing output
    routing or file-recording behavior would pass locally and fail in CI, or
    vice versa.
    """
    for name in _CLEARED_ENV_VARS:
        monkeypatch.delenv(name, raising=False)
