"""Tests for checks.check_commit_messages."""

from __future__ import annotations

import subprocess
import uuid
from pathlib import Path

import pytest

from checks.check_commit_messages import _commit_rows, _is_bot, check_commits, main


def _git(*args: str, cwd: Path) -> None:
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)


def _commit(repo: Path, *, author: str, subject: str) -> None:
    (repo / f"{uuid.uuid4().hex}.txt").write_text(subject)
    _git("add", "-A", cwd=repo)
    _git(
        "commit",
        "--quiet",
        f"--author={author} <author@example.com>",
        "-m",
        subject,
        cwd=repo,
    )


@pytest.fixture
def git_repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A throwaway git repository, made the current working directory.

    ``_commit_rows`` shells out to plain ``git log`` without an explicit cwd,
    so exercising it means running the test from inside a repo.
    """
    repo = tmp_path / "repo"
    repo.mkdir()
    _git("init", "--quiet", "--initial-branch=main", cwd=repo)
    _git("config", "user.email", "test@example.com", cwd=repo)
    _git("config", "user.name", "Test User", cwd=repo)
    monkeypatch.chdir(repo)
    return repo


class TestIsBot:
    @pytest.mark.parametrize(
        "author",
        [
            "dependabot[bot]",
            "some-tool[bot]",
            "dependabot",
            "GITHUB-ACTIONS",
            "pre-commit-ci",
        ],
    )
    def test_recognizes_known_bot_identities(self, author: str) -> None:
        assert _is_bot(author)

    def test_does_not_recognize_a_human_author(self) -> None:
        assert not _is_bot("Jane Doe")


class TestCommitRows:
    def test_reads_sha_author_and_subject_for_the_latest_commit(
        self, git_repo: Path
    ) -> None:
        _commit(git_repo, author="Alice", subject="feat: add widget")
        _commit(git_repo, author="Bob", subject="fix: guard empty body")
        rows = _commit_rows("HEAD~1..HEAD")
        assert len(rows) == 1
        sha, author, subject = rows[0]
        assert len(sha) == 40
        assert author == "Bob"
        assert subject == "fix: guard empty body"

    def test_reads_every_commit_when_given_a_single_revision(
        self, git_repo: Path
    ) -> None:
        _commit(git_repo, author="Alice", subject="feat: add widget")
        _commit(git_repo, author="Bob", subject="fix: guard empty body")
        rows = _commit_rows("HEAD")
        assert [subject for _, _, subject in rows] == [
            "fix: guard empty body",
            "feat: add widget",
        ]

    def test_excludes_merge_commits(self, git_repo: Path) -> None:
        _commit(git_repo, author="Alice", subject="feat: add widget")
        _git("checkout", "-b", "topic", cwd=git_repo)
        _commit(git_repo, author="Alice", subject="feat: add topic file")
        _git("checkout", "main", cwd=git_repo)
        _commit(git_repo, author="Bob", subject="fix: guard empty body")
        _git("merge", "--no-ff", "-m", "merge: combine topic", "topic", cwd=git_repo)
        subjects = [subject for _, _, subject in _commit_rows("HEAD")]
        assert "merge: combine topic" not in subjects
        assert "feat: add topic file" in subjects


class TestCheckCommits:
    def test_skips_bot_authored_rows(self) -> None:
        rows = [
            ("aaa", "dependabot[bot]", "not a conventional subject"),
            ("bbb", "Alice", "feat: add widget"),
        ]
        assert check_commits(rows).ok

    def test_reports_a_bad_human_subject(self) -> None:
        found = check_commits([("aaa", "Alice", "not a conventional subject")])
        assert not found.ok
        assert found.errors[0].startswith("aaa:")

    def test_aggregates_findings_across_rows(self) -> None:
        rows = [
            ("aaa", "Alice", "not conventional"),
            ("bbb", "Bob", "also not conventional"),
        ]
        assert len(check_commits(rows).errors) == 2

    def test_passes_max_length_through_to_check_subject(self) -> None:
        rows = [("aaa", "Alice", "fix: " + "x" * 60)]
        assert check_commits(rows, max_length=100).ok
        assert not check_commits(rows).ok


class TestMain:
    def test_reports_ok_for_a_clean_range(
        self, git_repo: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        _commit(git_repo, author="Alice", subject="feat: add widget")
        _commit(git_repo, author="Bob", subject="fix: guard empty body")
        code = main(["HEAD~1..HEAD"])
        assert code == 0
        assert "1 commit subject(s) OK" in capsys.readouterr().out

    def test_fails_for_a_bad_subject(
        self, git_repo: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        _commit(git_repo, author="Alice", subject="not conventional")
        code = main(["HEAD"])
        captured = capsys.readouterr()
        assert code == 1
        assert "error" in captured.err.lower()

    def test_errors_when_git_log_fails(self, git_repo: Path) -> None:
        code = main(["not-a-real-range"])
        assert code == 2

    def test_default_range_is_origin_main_to_head(
        self, git_repo: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        _commit(git_repo, author="Alice", subject="feat: add widget")
        code = main([])
        captured = capsys.readouterr()
        # No `origin` remote exists in this throwaway repo, so the default
        # range fails to resolve -- this only confirms the CLI wires up
        # "origin/main..HEAD" as the default rather than some other value.
        assert code == 2
        assert "origin/main..HEAD" in captured.err
