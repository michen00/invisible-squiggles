<!--
Sync Impact Report
==================
Version: 1.0.0 (initial creation)
Ratification Date: 2025-01-27
Last Amended: 2025-01-27

Modified Principles: N/A (initial version)
Added Sections: All sections (initial version)
Removed Sections: N/A

Templates Requiring Updates:
- ⚠ pending: .specify/templates/plan-template.md (not yet created)
- ⚠ pending: .specify/templates/spec-template.md (not yet created)
- ⚠ pending: .specify/templates/tasks-template.md (not yet created)
- ⚠ pending: .specify/templates/commands/*.md (not yet created)

Follow-up TODOs: None
-->

# Project Constitution: invisible-squiggles

**Version:** 1.0.0
**Ratified:** 2025-01-27
**Last Amended:** 2025-01-27

## Project Identity

**Name:** invisible-squiggles
**Type:** VSCode Extension
**Primary Language:** TypeScript
**Repository:** <https://github.com/michen00/invisible-squiggles>
**Maintainer:** Michael I Chen

## Purpose

invisible-squiggles is a VSCode extension that toggles error, warning, info, and hint squiggles for distraction-free coding. The extension manipulates VSCode's `workbench.colorCustomizations` setting to make diagnostic squiggles transparent by setting colors to `#00000000`.

## Principles

### P1: Conventional Commits

**MUST** use Conventional Commits format for all commit messages:

```
<type>[optional scope]: <description>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`

**Rationale:** Ensures consistent commit history, enables automated changelog generation, and improves code review efficiency.

### P2: Type Safety

**MUST** maintain TypeScript strict mode. All code **MUST** pass type checking via `npm run check-types` before commit.

**Rationale:** Prevents runtime errors, improves IDE support, and maintains code quality through compile-time guarantees.

### P3: Code Quality Validation

**MUST** pass all validation checks before committing:

- Type checking: `npm run check-types`
- Linting: `npm run lint`
- Build: `npm run compile`

**Rationale:** Ensures code quality, consistency, and prevents regressions from entering the codebase.

### P4: Documentation Consistency

**MUST** keep all documentation files consistent with each other:

- `README.md` - User-facing quickstart (update if information becomes inaccurate)
- `AGENTS.md` - Agent-focused workflow guide
- `CLAUDE.md` - Detailed guidance for Claude Code
- `.github/copilot-instructions.md` - Comprehensive Copilot context

When updating documentation:

1. Update the relevant documentation file(s)
2. Cross-check that information aligns across all docs
3. Ensure command examples and architecture descriptions match

**Rationale:** Prevents confusion, reduces maintenance burden, and ensures all contributors have accurate information.

### P5: Build Validation

**MUST** ensure `npm run compile` passes before committing code changes. The compile command runs type checking, linting, and builds the extension.

**Rationale:** Catches errors early, ensures the extension can be built, and maintains build system integrity.

### P6: Manual Verification

**SHOULD** perform manual verification after significant changes:

- Press `F5` in VSCode to launch Extension Development Host
- Run "Toggle Squiggles" command via Command Palette (`Ctrl/Cmd+Shift+P`)
- Verify status bar eye icon (👁️) appears and toggling works correctly
- Reload with `Ctrl/Cmd+R` after code changes

**Rationale:** VSCode extensions require runtime testing that automated tests cannot fully cover. Manual verification catches integration issues and UI problems.

### P7: Testing Discipline

**SHOULD** write tests for new functionality. Currently, test coverage is minimal (placeholder tests only). As the project matures:

- Unit tests for core logic (`toggleSquiggles`, `setStatus`)
- Integration tests for extension activation
- End-to-end tests for command execution and UI updates

**Rationale:** Tests provide confidence in changes, prevent regressions, and document expected behavior. Current state acknowledges minimal coverage while establishing the principle for future work.

### P8: Focused Scope

**MUST** maintain the extension's focused, single-purpose nature. All core logic resides in `src/extension.ts`. Avoid unnecessary complexity or feature bloat.

**Rationale:** Keeps the extension maintainable, fast, and easy to understand. The project's value comes from simplicity and reliability.

## Governance

### Amendment Procedure

1. Propose changes via GitHub issue or discussion
2. Update constitution file with version bump according to semantic versioning:
   - **MAJOR:** Backward incompatible governance/principle removals or redefinitions
   - **MINOR:** New principle/section added or materially expanded guidance
   - **PATCH:** Clarifications, wording, typo fixes, non-semantic refinements
3. Update `LAST_AMENDED_DATE` to amendment date
4. Update Sync Impact Report at top of file
5. Propagate changes to dependent templates and documentation
6. Commit with message: `docs: amend constitution to v<version> (<description>)`

### Versioning Policy

Constitution versions follow semantic versioning (MAJOR.MINOR.PATCH). Version changes **MUST** be documented in the Sync Impact Report at the top of the file.

### Compliance Review

All code changes **MUST** comply with principles P1-P8. Before merging pull requests:

- Verify commit messages follow P1
- Ensure type checking and linting pass (P2, P3)
- Confirm documentation updates maintain consistency (P4)
- Validate build succeeds (P5)
- Note manual verification performed if applicable (P6)

Non-compliance **MUST** be addressed before merge, except for P7 (testing) which is aspirational given current test coverage state.
