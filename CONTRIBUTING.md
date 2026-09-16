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
- [Releasing a new version](#releasing-a-new-version)

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

#### Dependency overrides

Every dependency here is a development dependency: `dependencies` is empty and [.vscodeignore](.vscodeignore) ships only the bundled `dist/`, so nothing in `node_modules` reaches a user. Security advisories against this tree are build- and test-time risks, not shipped ones, and they are still worth clearing — a clean `npm audit` is what makes the next real advisory visible.

Most of them clear with a lockfile-only bump, which changes no declared range:

```sh
npm audit fix --package-lock-only
```

The rest are transitive dependencies whose parent pins a range that excludes the fixed version. Dependabot cannot fix those — its npm updates only bump direct dependencies — so they need an entry in `overrides` in [package.json](package.json), and they stay open indefinitely until someone adds one.

Nest the entry under the parent whose range you are overriding rather than declaring it at the top level. An override is a deliberate breach of a declared semver contract, and nesting it says whose contract:

```json
"overrides": { "mocha": { "serialize-javascript": "^7.0.5" } }
```

Verify an override before trusting it, because a wrong one fails quietly. `npm audit` reports the resolved version and goes green whether or not the package still works, and the unit suite does not exercise most of the toolchain. Two ways that has already bitten this repository:

- Forcing `brace-expansion` to 5.x resolves cleanly and leaves all unit tests passing, but 5.x dropped the default export that `minimatch` 3 and 9 both import, so mocha throws the first time a pattern is brace-expanded.
- mocha requires `serialize-javascript` only from its parallel worker pool, so a normal serial run never loads it at all. A broken major would have looked green everywhere. [ci.yml](.github/workflows/ci.yml) now runs the unit tests a second time under `--parallel` for no reason other than to load that one package.

So run `make test` in full, then find the code path the overridden package actually sits behind and make something exercise it. A green audit is not evidence.

Drop an override once the parent's own range catches up. Leaving a stale one pinned holds the tree behind the version the parent would otherwise pick.

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

#### Keeping the description true

Revise the PR description whenever review changes what the branch does. A description written when the PR opened describes the branch as it was then, and on anything that takes more than one round it usually stops matching: an approach gets replaced, a fix turns out to be wrong, a reviewer's point reshapes the change. Reviewers read the description to decide what to look at, and after the merge it is the only prose explaining why the commit exists — the branch is gone and the discussion is buried.

Two habits keep it honest:

- When a later commit supersedes an earlier one, say so, rather than leaving both stories standing. A description claiming a fix the branch no longer contains is worse than one that says nothing.
- Write for somebody who was not in the review. Avoid tool names, round numbers, and references to who suggested what; describe the problem in terms of this repository, and say how the change was checked.

Editing a merged PR's description is fine and worth doing when it turns out to be wrong. Note at the top that it was rewritten, so the discussion below still makes sense.

## Releasing a new version

See [RELEASING.md](RELEASING.md) for how to cut, publish, and verify a release.

[issues]: https://github.com/michen00/invisible-squiggles/issues
[issues_new]: https://github.com/michen00/invisible-squiggles/issues/new
[issues_bugs]: https://github.com/michen00/invisible-squiggles/issues?q=label%3Abug
[discussions]: https://github.com/michen00/invisible-squiggles/discussions
[discussions_new]: https://github.com/michen00/invisible-squiggles/discussions/new/choose
[good_first_issue]: https://github.com/michen00/invisible-squiggles/issues?q=label%3A%22good+first+issue%22
