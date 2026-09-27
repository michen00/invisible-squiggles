"""Tests for checks.check_pr_title."""

from __future__ import annotations

import pytest

from checks.check_pr_title import main


def test_accepts_a_valid_title_argument(capsys: pytest.CaptureFixture[str]) -> None:
    code = main(["feat: add config precedence rule"])
    assert code == 0
    assert "title OK" in capsys.readouterr().out


def test_falls_back_to_the_pr_title_env_var(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("PR_TITLE", "fix: guard empty body")
    code = main([])
    assert code == 0
    assert "title OK" in capsys.readouterr().out


def test_argument_wins_over_the_env_var(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PR_TITLE", "not a conventional title")
    code = main(["feat: add config precedence rule"])
    assert code == 0


def test_errors_without_a_title_argument_or_env_var() -> None:
    with pytest.raises(SystemExit) as exc_info:
        main([])
    assert exc_info.value.code == 2


def test_rejects_an_invalid_title(capsys: pytest.CaptureFixture[str]) -> None:
    code = main(["not a conventional title"])
    captured = capsys.readouterr()
    assert code == 1
    assert "error" in captured.err.lower()


def test_annotates_under_github_actions(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    code = main(["not a conventional title"])
    captured = capsys.readouterr()
    assert code == 1
    assert "::error::" in captured.out


def test_rejects_a_title_over_the_default_max_length(
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = main(["feat: " + "x" * 50])
    captured = capsys.readouterr()
    assert code == 1
    assert "exceeds hard max" in captured.err


def test_max_length_flag_raises_the_ceiling() -> None:
    code = main(["feat: " + "x" * 60, "--max-length", "100"])
    assert code == 0


def test_subject_max_length_env_var_raises_the_ceiling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUBJECT_MAX_LENGTH", "100")
    code = main(["feat: " + "x" * 60])
    assert code == 0
