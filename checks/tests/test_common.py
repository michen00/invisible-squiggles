"""Tests for checks._common."""

from __future__ import annotations

from pathlib import Path

import pytest

from checks._common import (
    CONVENTIONAL_TYPES,
    SUBJECT_MAX_DEFAULT,
    Findings,
    _form_problem,
    _looks_non_imperative,
    check_subject,
    subject_max_length,
)


class TestFindings:
    def test_merge_combines_errors_and_warnings(self) -> None:
        first = Findings(errors=["e1"], warnings=["w1"])
        second = Findings(errors=["e2"], warnings=["w2"])
        first.merge(second)
        assert first.errors == ["e1", "e2"]
        assert first.warnings == ["w1", "w2"]

    def test_ok_is_true_only_without_errors(self) -> None:
        assert Findings().ok is True
        assert Findings(warnings=["w"]).ok is True
        assert Findings(errors=["e"]).ok is False

    def test_emit_annotates_under_github_actions(
        self, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
    ) -> None:
        monkeypatch.setenv("GITHUB_ACTIONS", "true")
        code = Findings(warnings=["watch out"]).emit("all good")
        out = capsys.readouterr().out
        assert code == 0
        assert "::warning::watch out" in out
        assert "all good (with warnings)" in out

    def test_emit_prints_plain_lines_outside_actions(
        self, capsys: pytest.CaptureFixture[str]
    ) -> None:
        code = Findings(errors=["boom"]).emit("all good")
        captured = capsys.readouterr()
        assert code == 1
        assert "error: boom" in captured.err
        assert "all good" not in captured.out

    def test_emit_records_warnings_and_errors_to_files(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        warnings_file = tmp_path / "warnings.txt"
        errors_file = tmp_path / "errors.txt"
        monkeypatch.setenv("PR_WARNINGS_FILE", str(warnings_file))
        monkeypatch.setenv("PR_ERRORS_FILE", str(errors_file))
        Findings(errors=["e1"], warnings=["w1"]).emit("ok")
        assert warnings_file.read_text() == "w1\n"
        assert errors_file.read_text() == "e1\n"


class TestCheckSubject:
    @pytest.mark.parametrize("kind", CONVENTIONAL_TYPES)
    def test_accepts_every_conventional_type(self, kind: str) -> None:
        found = check_subject(f"{kind}: does a thing")
        assert found.ok
        assert found.errors == []

    def test_accepts_a_scope(self) -> None:
        found = check_subject("fix(parser): handle empty input")
        assert found.ok

    def test_rejects_a_subject_with_no_type_prefix(self) -> None:
        found = check_subject("add a feature")
        assert not found.ok
        assert "no 'type: ' prefix" in found.errors[0]

    def test_rejects_an_unrecognized_type(self) -> None:
        found = check_subject("feet: add config precedence rule")
        assert not found.ok
        assert "not a type" in found.errors[0]

    def test_rejects_an_uppercase_type(self) -> None:
        found = check_subject("Fix: guard empty body")
        assert not found.ok
        assert "must be lowercase" in found.errors[0]

    def test_rejects_a_malformed_scope(self) -> None:
        found = check_subject("fix(bad scope!): guard empty body")
        assert not found.ok
        assert "scope" in found.errors[0]

    def test_rejects_a_colon_with_no_following_space(self) -> None:
        found = check_subject("fix:guard empty body")
        assert not found.ok
        assert "followed by" in found.errors[0]

    def test_rejects_an_empty_subject(self) -> None:
        found = check_subject("fix: ")
        assert not found.ok

    def test_rejects_a_subject_over_the_default_max_length(self) -> None:
        found = check_subject("fix: " + "x" * 50)
        assert not found.ok
        assert "exceeds hard max" in found.errors[0]

    def test_accepts_a_custom_max_length(self) -> None:
        found = check_subject("fix: " + "x" * 60, max_length=100)
        assert found.ok

    def test_rejects_a_trailing_period(self) -> None:
        found = check_subject("fix: guard empty body.")
        assert not found.ok
        assert "must not end with a period" in found.errors[0]

    def test_warns_on_an_uppercase_first_word(self) -> None:
        found = check_subject("fix: Guard empty body")
        assert found.ok
        assert any("lowercase" in warning for warning in found.warnings)

    @pytest.mark.parametrize("first_word", ["added", "fixed", "updating"])
    def test_warns_on_non_imperative_mood(self, first_word: str) -> None:
        found = check_subject(f"fix: {first_word} the guard")
        assert found.ok
        assert any("imperative" in warning for warning in found.warnings)

    def test_warns_on_an_embedded_plan_identifier(self) -> None:
        found = check_subject("feat: land F12 for the new gate")
        assert found.ok
        assert any("plan identifier" in warning for warning in found.warnings)

    def test_label_appears_in_messages(self) -> None:
        found = check_subject("nope", label="abc1234")
        assert found.errors[0].startswith("abc1234:")


class TestFormProblem:
    def test_reports_missing_prefix(self) -> None:
        assert "no 'type: ' prefix" in _form_problem("add a feature")

    def test_reports_unrecognized_type(self) -> None:
        assert "not a type" in _form_problem("nope: subject")


class TestLooksNonImperative:
    def test_true_for_a_known_past_tense_word(self) -> None:
        assert _looks_non_imperative("Added")

    def test_true_for_an_ing_suffix(self) -> None:
        assert _looks_non_imperative("adding")

    def test_false_for_an_imperative_word(self) -> None:
        assert not _looks_non_imperative("add")


class TestSubjectMaxLength:
    def test_explicit_wins_over_the_environment(self) -> None:
        assert subject_max_length(72, environ={"SUBJECT_MAX_LENGTH": "10"}) == 72

    def test_environment_wins_over_the_default(self) -> None:
        assert subject_max_length(environ={"SUBJECT_MAX_LENGTH": "72"}) == 72

    def test_falls_back_to_the_default(self) -> None:
        assert subject_max_length(environ={}) == SUBJECT_MAX_DEFAULT

    @pytest.mark.parametrize("configured", ["0", "-5", "not-a-number", ""])
    def test_ignores_an_invalid_configured_value(self, configured: str) -> None:
        result = subject_max_length(environ={"SUBJECT_MAX_LENGTH": configured})
        assert result == SUBJECT_MAX_DEFAULT
