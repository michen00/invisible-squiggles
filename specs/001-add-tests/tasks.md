# Tasks: Comprehensive Testing Infrastructure

**Input**: Design documents from `/specs/001-add-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as they are explicitly part of this testing infrastructure feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Test files in `src/test/` organized by type: `unit/`, `integration/`, `e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test infrastructure setup

- [x] T001 Create test directory structure: `src/test/unit/`, `src/test/integration/`, `src/test/e2e/`
- [x] T002 Install test dependencies: `sinon`, `@types/sinon`, `c8` via `npm install --save-dev`
- [x] T003 [P] Update `package.json` scripts for test execution (test:unit, test:integration, test:e2e, test:coverage)
- [x] T004 [P] Configure c8 coverage tool in `package.json` with terminal output and 80% threshold warning
- [x] T005 [P] Update `.gitignore` to exclude `coverage/` directory
- [x] T006 [P] Update `tsconfig.json` to include test files in compilation
- [x] T007 Remove placeholder test file: `src/test/extension.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create VSCode API mock helpers in `src/test/helpers/mockVSCode.ts` for unit test mocking
- [x] T009 [P] Create test utilities for common test patterns in `src/test/helpers/testUtils.ts`
- [x] T010 [P] Configure `.vscode-test.mjs` for integration and E2E test execution
- [x] T011 [P] Update ESLint configuration to include test directories in linting
- [x] T012 Create test setup file for shared test configuration in `src/test/setup.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Unit Testing Infrastructure (Priority: P1) 🎯 MVP

**Goal**: Developers can run unit tests with mocked VSCode APIs to test core functions (`toggleSquiggles`, `setStatus`, color logic) in isolation without VSCode runtime

**Independent Test**: Run `npm run test:unit` - all unit tests execute successfully in < 5 seconds with mocked VSCode APIs, covering core functions

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Create unit test for `setStatus()` function in `src/test/unit/setStatus.test.ts`
- [ ] T014 [P] [US1] Create unit test for color manipulation logic in `src/test/unit/colorLogic.test.ts`
- [ ] T015 [US1] Create unit test for `toggleSquiggles()` function in `src/test/unit/toggleSquiggles.test.ts` (depends on mock helpers)

### Implementation for User Story 1

- [ ] T016 [US1] Refactor `setStatus()` to be testable using dependency injection: accept statusBarItem as parameter instead of using module-level variable in `src/extension.ts`
- [ ] T017 [US1] Refactor `toggleSquiggles()` to be testable using dependency injection: extract VSCode workspace/configuration APIs as parameters or create wrapper functions that can be mocked in `src/extension.ts`
- [ ] T018 [US1] Implement unit test for `setStatus()` with mocked status bar item in `src/test/unit/setStatus.test.ts`
- [ ] T019 [US1] Implement unit test for color logic (transparent colors, original color saving/restoration) in `src/test/unit/colorLogic.test.ts`
- [ ] T020 [US1] Implement unit test for `toggleSquiggles()` with mocked VSCode workspace and configuration APIs in `src/test/unit/toggleSquiggles.test.ts`
- [ ] T021 [US1] Add unit tests for edge cases: invalid JSON parsing in `invisibleSquiggles.originalColors`, missing configuration values for squiggle types in `src/test/unit/toggleSquiggles.test.ts`
- [ ] T021a [US1] Add unit test for VSCode configuration API error handling during toggle operation in `src/test/unit/toggleSquiggles.test.ts`
- [ ] T021b [US1] Add unit test for status bar item not initialized before `setStatus()` is called in `src/test/unit/setStatus.test.ts`
- [ ] T021c [US1] Add unit test for concurrent toggle command execution (race condition handling) in `src/test/unit/toggleSquiggles.test.ts`
- [ ] T021d [US1] Add unit test for conflicting color customizations (existing customizations merge) in `src/test/unit/toggleSquiggles.test.ts`
- [ ] T022 [US1] Verify unit tests run independently via `npm run test:unit` and execute in < 5 seconds

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Unit tests provide fast feedback without VSCode runtime.

---

## Phase 4: User Story 2 - Integration Testing Infrastructure (Priority: P2)

**Goal**: Developers can run integration tests with real VSCode APIs to verify extension activation, command registration, configuration updates, and status bar integration work together correctly

**Independent Test**: Run `npm run test:integration` - integration test suite uses VSCode test framework to verify extension activates, registers command, and updates configuration correctly

### Tests for User Story 2

- [ ] T023 [P] [US2] Create integration test for extension activation in `src/test/integration/activation.test.ts`
- [ ] T024 [P] [US2] Create integration test for command registration in `src/test/integration/command.test.ts`
- [ ] T025 [US2] Create integration test for configuration updates in `src/test/integration/configuration.test.ts`

### Implementation for User Story 2

- [ ] T026 [US2] Implement integration test for extension activation and command registration in `src/test/integration/activation.test.ts`
- [ ] T027 [US2] Implement integration test for `workbench.colorCustomizations` updates when toggle command executes in `src/test/integration/configuration.test.ts`
- [ ] T027a [US2] Implement integration test for all 16 configuration scenarios (all combinations of Error/Warning/Info/Hint enabled/disabled: 2^4 = 16 scenarios) in `src/test/integration/configuration.test.ts`
- [ ] T028 [US2] Implement integration test for status bar item creation and initial state in `src/test/integration/activation.test.ts`
- [ ] T029 [US2] Implement integration test for status bar updates when toggle command is invoked in `src/test/integration/command.test.ts`
- [ ] T029a [US2] Implement integration test for VSCode API failure during extension activation (error handling) in `src/test/integration/activation.test.ts`
- [ ] T030 [US2] Verify integration tests run independently via `npm run test:integration` using real VSCode APIs

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Integration tests verify component interactions with real VSCode APIs.

---

## Phase 5: User Story 3 - End-to-End Testing Infrastructure (Priority: P3)

**Goal**: Developers can run E2E tests that launch VSCode Extension Development Host and verify complete user workflows (command palette, status bar button, visual squiggle changes)

**Independent Test**: Run `npm run test:e2e` - E2E test suite launches Extension Development Host, executes commands, and verifies squiggle visibility changes are applied correctly

### Tests for User Story 3

- [ ] T031 [P] [US3] Create E2E test for command palette execution in `src/test/e2e/commandPalette.test.ts`
- [ ] T032 [US3] Create E2E test for status bar button interaction in `src/test/e2e/statusBar.test.ts`

### Implementation for User Story 3

- [ ] T033 [US3] Implement E2E test for Extension Development Host launch with extension loaded in `src/test/e2e/commandPalette.test.ts`
- [ ] T034 [US3] Implement E2E test for "Toggle Squiggles" command execution via command palette in `src/test/e2e/commandPalette.test.ts`
- [ ] T035 [US3] Implement E2E test for status bar button click and toggle command execution in `src/test/e2e/statusBar.test.ts`
- [ ] T036 [US3] Implement E2E test for visual verification of squiggle visibility changes: verify by reading `workbench.colorCustomizations` via VSCode configuration API to check if colors are transparent (`#00000000`) or visible (original color values) in `src/test/e2e/commandPalette.test.ts`
- [ ] T037 [US3] Verify E2E tests run independently via `npm run test:e2e` in Extension Development Host

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. E2E tests verify complete user workflows from activation to visual changes.

---

## Phase 6: User Story 4 - Coverage Measurement and Reporting (Priority: P4)

**Goal**: Developers can generate coverage reports showing line, branch, and function coverage percentages, identify untested code paths, and receive warnings when coverage falls below 80% threshold

**Independent Test**: Run `npm run test:coverage` - coverage report is generated in terminal format showing coverage percentages per file and overall, with warning if below 80% threshold

### Tests for User Story 4

- [ ] T038 [US4] Verify coverage tooling (c8) generates reports when tests run with coverage enabled

### Implementation for User Story 4

- [ ] T039 [US4] Configure c8 coverage tool with terminal output format in `package.json`
- [ ] T040 [US4] Configure coverage threshold (80%) with warning-only enforcement (does not fail build) in `package.json`
- [ ] T041 [US4] Configure coverage to include `src/extension.ts` and exclude test files in `package.json` or `.c8rc`
- [ ] T042 [US4] Add `test:coverage` script that runs all tests with coverage enabled in `package.json`
- [ ] T043 [US4] Verify coverage reports show line, branch, and function coverage percentages in terminal output
- [ ] T044 [US4] Verify coverage reports show per-file and overall project coverage
- [ ] T045 [US4] Verify coverage warning is displayed (not failing build) when coverage falls below 80%
- [ ] T046 [US4] Verify coverage reports are generated automatically on every test run via `npm run test:coverage`
- [ ] T047 [US4] Verify developers can identify untested code paths within 30 seconds using coverage reports
- [ ] T047a [US4] Verify coverage measurement identifies at least 3 previously untested edge cases or error paths by comparing coverage report against known edge cases list (SC-010) in `src/test/integration/coverageValidation.test.ts`

**Checkpoint**: At this point, all user stories should be complete. Coverage measurement provides visibility into testing completeness and identifies gaps.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final integration

- [ ] T048 [P] Update `npm test` script to run all test suites (unit, integration, E2E) together
- [ ] T049 [P] Verify all test types can run independently (test:unit, test:integration, test:e2e) and together (test)
- [ ] T050 [P] Update documentation: Add testing section to `AGENTS.md` with test commands and structure
- [ ] T051 [P] Update documentation: Add testing section to `CLAUDE.md` with test execution details
- [ ] T052 [P] Update documentation: Add testing section to `.github/copilot-instructions.md` with test infrastructure details
- [ ] T053 [P] Verify test execution in CI/CD environment (headless VSCode mode)
- [ ] T053a [P] Implement error message formatting utilities to ensure test failures include: test name, expected vs actual values, file path and line number, stack trace, and specific assertion failure details in `src/test/helpers/errorMessages.ts`
- [ ] T054 Verify test failures provide clear, actionable error messages (including test name, expected vs actual values, file path and line number, stack trace, and specific assertion failure details) per SC-009
- [ ] T055 Verify all test types execute successfully in both local development and CI/CD environments (SC-005)
- [ ] T056 Verify test suite achieves at least 80% code coverage for `src/extension.ts` (SC-002)
- [ ] T057 Run quickstart.md validation to ensure all test commands work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2 → P3 → P4)
  - Or in parallel if team capacity allows (after foundational phase)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent from US1, uses different test approach
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent from US1/US2, uses Extension Development Host
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Works with all test types, but benefits from having tests to measure

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Test structure setup before test implementation
- Core test implementation before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T006)
- All Foundational tasks marked [P] can run in parallel (T009-T011)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- All unit test files for US1 marked [P] can run in parallel (T013-T014)
- All integration test files for US2 marked [P] can run in parallel (T023-T024)
- All E2E test files for US3 marked [P] can run in parallel (T031-T032)
- All documentation updates in Polish phase marked [P] can run in parallel (T050-T052)

---

## Parallel Example: User Story 1

```bash
# Launch all unit test file creation together:
Task: "Create unit test for setStatus() function in src/test/unit/setStatus.test.ts"
Task: "Create unit test for color manipulation logic in src/test/unit/colorLogic.test.ts"

# These can be implemented in parallel as they test different functions
```

---

## Parallel Example: User Story 2

```bash
# Launch all integration test file creation together:
Task: "Create integration test for extension activation in src/test/integration/activation.test.ts"
Task: "Create integration test for command registration in src/test/integration/command.test.ts"

# These can be implemented in parallel as they test different aspects
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Unit Testing Infrastructure)
4. **STOP and VALIDATE**: Run `npm run test:unit` - verify all unit tests pass in < 5 seconds
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Unit Tests) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Integration Tests) → Test independently → Deploy/Demo
4. Add User Story 3 (E2E Tests) → Test independently → Deploy/Demo
5. Add User Story 4 (Coverage) → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Unit Tests)
   - Developer B: User Story 2 (Integration Tests) - can start in parallel
   - Developer C: User Story 3 (E2E Tests) - can start in parallel
   - Developer D: User Story 4 (Coverage) - can start after some tests exist
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Unit tests must execute in < 5 seconds (SC-001)
- Coverage threshold is warning-only (does not fail build) per clarification
- All test types must run in CI/CD environments (FR-008)
- All 16 configuration scenarios (2^4 squiggle type combinations) must be tested (FR-012, SC-007)
- All 7 edge cases must have corresponding test tasks (FR-013)
- Error messages must include: test name, expected vs actual values, file path/line number, stack trace, assertion details (SC-009)
- Visual verification in E2E tests uses VSCode configuration API to check color values (transparent = `#00000000`)
