"""Tests for checks.check_pr_body."""

from __future__ import annotations

import io
from pathlib import Path

import pytest

from checks.check_pr_body import check_body, main

_REQUIRED = ["Summary", "Test plan"]


def _valid_body(extra: str = "") -> str:
    return f"## Summary\n\nDoes a thing.\n\n## Test plan\n\n- ran the tests\n{extra}"


class TestCheckBody:
    def test_passes_a_well_formed_body(self) -> None:
        found = check_body(_valid_body(), _REQUIRED)
        assert found.ok
        assert found.warnings == []

    def test_reports_each_missing_required_section(self) -> None:
        found = check_body("no headings here", _REQUIRED)
        assert not found.ok
        assert len(found.errors) == 2

    def test_heading_match_is_case_insensitive(self) -> None:
        body = "## summary\n\nx\n\n## TEST PLAN\n\ny\n"
        assert check_body(body, _REQUIRED).ok

    def test_heading_must_start_the_section_text(self) -> None:
        found = check_body("## Not Summary\n\nx\n", ["Summary"])
        assert not found.ok

    def test_warns_on_an_unfilled_placeholder(self) -> None:
        found = check_body(_valid_body("<fill this in>"), _REQUIRED)
        assert found.ok
        assert any("placeholder" in warning for warning in found.warnings)

    def test_ignores_allowed_html_tags_as_placeholders(self) -> None:
        body = _valid_body("<details><summary>notes</summary></details>")
        found = check_body(body, _REQUIRED)
        assert not any("placeholder" in warning for warning in found.warnings)

    @pytest.mark.parametrize("marker", ["TBD", "TODO"])
    def test_warns_on_a_tbd_or_todo_marker(self, marker: str) -> None:
        found = check_body(_valid_body(f"{marker}: fill in later"), _REQUIRED)
        assert any(marker in warning for warning in found.warnings)

    def test_warns_on_a_leftover_markdownlint_directive(self) -> None:
        body = _valid_body("<!-- markdownlint-disable MD033 -->")
        found = check_body(body, _REQUIRED)
        assert any("markdownlint directive" in warning for warning in found.warnings)

    def test_warns_on_an_unlabeled_fenced_code_block(self) -> None:
        body = _valid_body("```\nsome code\n```")
        found = check_body(body, _REQUIRED)
        assert any("language tag" in warning for warning in found.warnings)

    def test_a_labeled_fence_does_not_warn(self) -> None:
        body = _valid_body("```python\nsome code\n```")
        found = check_body(body, _REQUIRED)
        assert not any("language tag" in warning for warning in found.warnings)

    def test_ignores_placeholder_looking_text_inside_a_fence(self) -> None:
        body = _valid_body("```text\n<fill this in>\n```")
        found = check_body(body, _REQUIRED)
        assert not any("placeholder" in warning for warning in found.warnings)

    def test_ignores_a_marker_inside_inline_code(self) -> None:
        found = check_body(_valid_body("`TBD`"), _REQUIRED)
        assert not any("TBD" in warning for warning in found.warnings)


class TestMain:
    def test_reads_from_a_body_file(
        self, tmp_path: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        body_file = tmp_path / "body.md"
        body_file.write_text(_valid_body())
        code = main(["--body-file", str(body_file)])
        assert code == 0
        assert "body OK" in capsys.readouterr().out

    def test_reads_from_stdin_by_default(
        self, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
    ) -> None:
        monkeypatch.setattr("sys.stdin", io.StringIO(_valid_body()))
        code = main([])
        assert code == 0
        assert "body OK" in capsys.readouterr().out

    def test_custom_require_list(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("sys.stdin", io.StringIO("no headings here"))
        code = main(["--require", "Overview"])
        assert code == 1
