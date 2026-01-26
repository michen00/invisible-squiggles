<!-- omit in toc -->

# Contributing

We welcome all contributions. Please read the relevant section below before contributing.

This project follows a [code of conduct](CODE_OF_CONDUCT.md). Please adhere to it in all interactions.

> If you don't have time to contribute code, you can still help:
>
> - [Star](https://github.com/michen00/invisible-squiggles/stargazers) the project
> - Share it on social media
> - Mention it in your README or at meetups

## TODO

- develop build-release-publish workflows
- add an option to always start with squiggles hidden
- update the demo on README.md for the eyeball status bar feature
- refactor code: optimizations and improvements are welcome
- expose the status message duration as a configuration option (`vscode.window.setStatusBarMessage(message, 2500);`)

<!-- omit in toc -->

## Table of contents

- [I have a question](#i-have-a-question)
- [I want to contribute](#i-want-to-contribute)
  - [Reporting bugs](#reporting-bugs)
  - [Suggesting enhancements](#suggesting-enhancements)
  - [Your first code contribution](#your-first-code-contribution)
- [Creating a release](#creating-a-release)

## I have a question

First, search existing [issues][issues] and [discussions][discussions]. If you still need help:

- Start a [discussion][discussions_new]
- Include relevant context (VSCode version, extension version, OS)

## I want to contribute

New to this project? Look for issues labeled [`good first issue`][good_first_issue].

### Reporting bugs

Before filing, check whether the issue already exists in the [bug tracker][issues_bugs].

To report a bug, [open an issue][issues_new]. The issue template will guide you through providing the necessary information (VSCode version, extension version, reproduction steps, etc.).

After you file:

1. The team labels the issue
2. A maintainer attempts to reproduce it
3. If reproducible, it gets prioritized by severity

### Suggesting enhancements

Before suggesting, [search existing issues][issues] to avoid duplicates. If your idea is new:

- [Open an issue][issues_new] with a clear, descriptive title
- Describe current vs. expected behavior
- Explain why this would benefit most users
- Include screenshots or GIFs if helpful

### Your first code contribution

#### Prerequisites

- Node.js >= 20 (LTS recommended)
- npm
- VSCode

#### Architecture

This is a single-file extension. All logic lives in `src/extension.ts`. See [CLAUDE.md](CLAUDE.md) for details.

#### Getting started

[Fork the repository](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo), then clone it:

```sh
git clone https://github.com/<your username>/invisible-squiggles.git
```

Install dependencies and create a branch:

```sh
cd invisible-squiggles
make develop
git switch -c <branch name>
```

#### Development workflow

Make changes, then verify:

```sh
npm run compile    # Type check + lint + build
npm run test:unit  # Run unit tests
```

To test manually, press `F5` in VSCode to launch the Extension Development Host.

> **Note:** After installing a `.vsix` file, run **Developer: Reload Window** to load the new version.

#### Committing changes

Use [conventional commits](https://www.conventionalcommits.org):

```sh
git commit -am 'feat: add new feature'
```

Types: `build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `chore`

Push your branch:

```sh
git push origin <branch name>
```

#### Before opening a pull request

- `npm run compile` passes
- `npm run test:unit` passes
- `make run-pre-commit` passes
- Manual testing in VSCode works

Then open a PR.

## Creating a release

1. Prepare a release branch: `git switch main && git pull && git switch -c release/vX.Y.Z`
2. Update `CHANGELOG.md`:
   - Run `make update-unreleased` to update the Unreleased section (this auto-commits).
   - Make any additional edits (e.g., rename heading from "Unreleased" to the version).
3. Update version in `package.json`.
4. Build and test: `make rebuild && make check`
5. Test locally: `make install-vsix`
6. Commit remaining changes: `git commit -am "chore: release vX.Y.Z"`
7. Push the branch and open a PR: `git push -u origin release/vX.Y.Z`
8. Merge the PR into `main` (via GitHub).
9. Get the latest main: `git switch main && git pull`
10. Create a signed tag: `git tag -a vX.Y.Z -m vX.Y.Z -s`
11. Push with tags: `git push --follow-tags`
12. Create a GitHub release from the tag: `make release VERSION=vX.Y.Z`
13. Review the release notes and edit them if needed (via GitHub web UI).
14. Publish to the VSCode Marketplace: `make publish`

[issues]: https://github.com/michen00/invisible-squiggles/issues
[issues_new]: https://github.com/michen00/invisible-squiggles/issues/new
[issues_bugs]: https://github.com/michen00/invisible-squiggles/issues?q=label%3Abug
[discussions]: https://github.com/michen00/invisible-squiggles/discussions
[discussions_new]: https://github.com/michen00/invisible-squiggles/discussions/new/choose
[good_first_issue]: https://github.com/michen00/invisible-squiggles/issues?q=label%3A%22good+first+issue%22
