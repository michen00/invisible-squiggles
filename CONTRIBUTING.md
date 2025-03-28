<!-- omit in toc -->

# Regarding contributions

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. We look forward to your contributions!

The project has defined a [code of conduct](https://github.com/michen00/.github/blob/main/CODE_OF_CONDUCT.md), providing a welcoming and friendly environment. Please adhere to it in all interactions.

> And if you like the project, but just don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation, which we would also be very happy about:
>
> - Star the project
> - Post about it on LinkedIn or other social media
> - Refer this project in your project's README
> - Mention the project at local meetups and tell your friends/colleagues

## TODO

- write tests
- get an icon for the marketplace listing
- add CI
  - lint
  - finish configuring pre-commit
  - test
  - build/publish/release
- update the demo on README.md for the eyeball status bar feature
- refactor code: optimizations and improvements are welcome
- add a workflow to [update license copyright years](https://github.com/marketplace/actions/update-license-copyright-year-s#i-want-my-pull-requests-to-be-automatically-merged)
- expose the status message duration as a configuration option (`vscode.window.setStatusBarMessage(message, 2500);`)

<!-- omit in toc -->

## Table of Contents

- [I have a question](#i-have-a-question)
- [I want to contribute](#i-want-to-contribute)
  - [Reporting bugs](#reporting-bugs)
    - [Before submitting a bug report](#before-submitting-a-bug-report)
    - [How do I submit a good bug report?](#how-do-i-submit-a-good-bug-report)
  - [Suggesting enhancements](#suggesting-enhancements)
    - [Before Submitting an Enhancement](#before-submitting-an-enhancement)
    - [How do I submit a good enhancement suggestion?](#how-do-i-submit-a-good-enhancement-suggestion)
  - [Your first code contribution](#your-first-code-contribution)
- [Creating a release](#creating-a-release)

## I have a question

Before you ask a question, it is best to search for existing [issues][issues] and [discussions][discussions] that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Create a [discussion][discussions_new].
- Provide as much context as you can about what you're running into.
- Provide project and platform versions, depending on what seems relevant.

We will then take care of the discussion as soon as possible.

## I want to contribute

### Reporting bugs

#### Before submitting a bug report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible:

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions.
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker][issues_bugs].
- Also make sure to search the internet to see if users outside of the GitHub community have discussed the issue.
- Collect information about the bug:
  - Stack trace
  - OS and version (Windows, Linux, macOS, x86, ARM)
  - Version of the interpreter, compiler, SDK, runtime environment, package manager, depending on what seems relevant
  - Possibly your input and the output
  - Can you reliably reproduce the issue? And can you also reproduce it with older versions?
  - Screenshots or animated GIFs showing the problem

#### How do I submit a good bug report?

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [issue][issues_new].
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the _reproduction steps_ that someone else can follow to recreate the issue on their own.
- Provide the information you collected in the previous section.

Once it's filed:

- The project team will label the issue accordingly.
- A team member will try to reproduce the issue with your provided steps. If there are no reproduction steps or no obvious way to reproduce the issue, the team will ask you for those steps. Bugs without steps will not be addressed until they can be reproduced.
- If the team is able to reproduce the issue, it will be prioritized according to severity.

### Suggesting enhancements

This section guides you through submitting an enhancement suggestion, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community understand your suggestion and find related suggestions.

#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the documentation carefully and find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search][issues] to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. Keep in mind that we want features that will be useful to the majority of our users and not just a small subset.

#### How do I submit a good enhancement suggestion?

Enhancement suggestions are tracked as [GitHub issues][issues].

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots and animated GIFs** which help you demonstrate the steps or point out the part which the suggestion is related to.
- **Explain why this enhancement would be useful** to most users. You may also want to point out other projects that solved it better and could serve as inspiration.

### Your first code contribution

Start by [forking the repository](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo), i.e. copying the repository to your account to grant you write access. Continue with cloning the forked repository to your local machine.

```sh
git clone https://github.com/<your username>/invisible-squiggles.git
```

Navigate into the cloned directory and create a new branch:

```sh
cd invisible-squiggles
git switch -c <branch name>
```

Update the code according to your requirements and commit the changes using the [conventional commits](https://www.conventionalcommits.org) message style:

```sh
git commit -a -m 'chore: follow the conventional commit style'
```

Continue with pushing the local commits to GitHub:

```sh
git push origin <branch name>
```

Before opening a Pull Request (PR), please consider the following guidelines:

- Please make sure that the code builds perfectly fine on your local system.
- The PR must meet the code standards and conventions of the project.
- Explanatory comments related to code functions are strongly recommended.

And finally, when you are satisfied with your changes, open a new PR.

## Creating a release

1. Describe the new release in `CHANGELOG.md` (`git reset main && git pull && git cliff --unreleased`)
1. Update version in `package.json`
1. Run `npm run release`
1. Commit the changes
1. Run `git tag -a v<major>.<minor>.<patch> -m v<major>.<minor>.<patch> -s`
1. Run `git push --follow-tags`
1. When the build pipeline is complete, update the GitHub release message.

[issues]: https://github.com/michen00/invisible-squiggles/issues
[issues_new]: https://github.com/michen00/invisible-squiggles/issues/new
[issues_bugs]: https://github.com/michen00/invisible-squiggles/issues?q=label%3Abug
[discussions]: https://github.com/michen00/invisible-squiggles/discussions
[discussions_new]: https://github.com/michen00/invisible-squiggles/discussions/new
