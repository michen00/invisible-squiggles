# Implementation Plan: Comprehensive Testing Infrastructure

**Branch**: `001-add-tests` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-add-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement comprehensive testing infrastructure for the invisible-squiggles VSCode extension, including unit tests with mocked VSCode APIs, integration tests with real VSCode APIs, end-to-end tests in Extension Development Host, and coverage measurement with terminal reporting. The infrastructure will support all test types running in both local development and CI/CD environments, achieving at least 80% code coverage for core extension logic.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 20.x
**Primary Dependencies**:

- `@vscode/test-cli` ^0.0.10 (test runner)
- `@vscode/test-electron` ^2.4.1 (E2E testing)
- `@types/mocha` ^10.0.9 (test types)
- `sinon` (mocking library for unit tests)
- `@types/sinon` (TypeScript types)
- `c8` (code coverage tool)

**Storage**: N/A (extension uses VSCode's built-in configuration system)
**Testing**:

- Unit: Mocha with Sinon for mocking VSCode APIs
- Integration: `@vscode/test-electron` with real VSCode APIs
- E2E: `@vscode/test-electron` with Extension Development Host
- Coverage: c8 for terminal coverage reports

**Target Platform**: VSCode ^1.97.0, Node.js 20.x
**Project Type**: Single project (VSCode extension)
**Performance Goals**:

- Unit tests execute in < 5 seconds (SC-001)
- Coverage reports generated automatically on every test run
- All test types runnable in CI/CD environments

**Constraints**:

- Tests must work in headless CI/CD environments
- Unit tests must not require VSCode runtime
- Coverage reports must be terminal-only format (per clarification)
- Coverage threshold warnings only (not failing builds)

**Scale/Scope**:

- Single extension file: `src/extension.ts` (137 lines)
- Target: 80% coverage for core extension logic
- 4 user stories (unit, integration, E2E, coverage)
- All test types run in CI/CD

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Phase 0 Check

**P1: Conventional Commits** ✅

- All commits will follow Conventional Commits format
- Test-related commits will use `test:` type

**P2: Type Safety** ✅

- All test code will be TypeScript with strict mode
- Test files will pass `npm run check-types`

**P3: Code Quality Validation** ✅

- All test code will pass linting (`npm run lint`)
- Tests will be included in build validation

**P4: Documentation Consistency** ✅

- Testing documentation will be added to AGENTS.md, CLAUDE.md, and copilot-instructions.md
- README.md will be updated if testing information becomes inaccurate

**P5: Build Validation** ✅

- Test infrastructure will integrate with existing `npm run compile` workflow
- Tests will not break existing build process

**P6: Manual Verification** ✅

- Manual verification workflow remains unchanged
- E2E tests complement (not replace) manual F5 testing

**P7: Testing Discipline** ✅

- This feature directly implements P7 principle
- Establishes testing infrastructure as required by constitution

**P8: Focused Scope** ✅

- Testing infrastructure is focused on extension testing only
- No feature bloat or unnecessary complexity

**Result**: ✅ All gates pass. Proceed to Phase 0 research.

### Post-Phase 1 Check

**P1: Conventional Commits** ✅

- Test infrastructure commits will use `test:` type
- Coverage-related commits will use `build:` or `test:` type

**P2: Type Safety** ✅

- All test code uses TypeScript strict mode
- Test files included in TypeScript compilation

**P3: Code Quality Validation** ✅

- Test code will be linted with ESLint
- Tests included in build validation pipeline

**P4: Documentation Consistency** ✅

- Testing documentation added to quickstart.md
- Will update AGENTS.md, CLAUDE.md, copilot-instructions.md during implementation

**P5: Build Validation** ✅

- Test infrastructure integrates with existing build process
- `npm run compile` includes test compilation

**P6: Manual Verification** ✅

- E2E tests complement manual F5 testing
- Manual verification still recommended per P6

**P7: Testing Discipline** ✅

- This feature directly implements P7
- Establishes testing infrastructure as required

**P8: Focused Scope** ✅

- Testing infrastructure focused on extension testing
- No unnecessary complexity added

**Result**: ✅ All gates pass. Ready for Phase 2 (task breakdown).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── extension.ts          # Main extension logic (137 lines)
└── test/
    ├── extension.test.ts  # Existing placeholder (to be replaced)
    ├── unit/             # Unit tests with mocked VSCode APIs
    │   ├── toggleSquiggles.test.ts
    │   ├── setStatus.test.ts
    │   └── colorLogic.test.ts
    ├── integration/      # Integration tests with real VSCode APIs
    │   ├── activation.test.ts
    │   ├── command.test.ts
    │   └── configuration.test.ts
    └── e2e/              # End-to-end tests in Extension Development Host
        ├── commandPalette.test.ts
        └── statusBar.test.ts

out/                      # TypeScript compilation output (tests)
dist/                     # ESBuild production bundle
coverage/                 # Coverage reports (terminal output)
```

**Structure Decision**: Single project structure maintained. Tests organized by type (unit, integration, E2E) within `src/test/` directory. Coverage reports generated to `coverage/` directory. Existing `src/test/extension.test.ts` placeholder will be replaced with proper test suites.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
