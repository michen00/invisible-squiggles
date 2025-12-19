# Research: Comprehensive Testing Infrastructure

**Date**: 2025-01-27
**Feature**: Comprehensive Testing Infrastructure
**Phase**: 0 - Research

## Research Questions

### Q1: Unit Testing Framework and Mocking Library

**Question**: What unit testing framework and mocking library should be used for testing VSCode extension code with mocked VSCode APIs?

**Research Findings**:

1. **Mocha** is already configured in the project (`@types/mocha` in devDependencies)
2. **Sinon** is the standard mocking library for Mocha in Node.js/TypeScript projects
3. VSCode extension unit testing best practices:
   - Use Sinon for creating spies, stubs, and mocks
   - Mock `vscode` module using `sinon.createStubInstance()` or custom mock objects
   - Test pure functions separately from VSCode API-dependent code
   - Use `rewire` or dependency injection for testing functions that use VSCode APIs

**Decision**: Use **Mocha** (already configured) with **Sinon** for mocking VSCode APIs

**Rationale**:

- Mocha is already in the project, minimizing new dependencies
- Sinon is the industry standard for Mocha and works well with TypeScript
- Sinon provides comprehensive mocking capabilities (spies, stubs, mocks)
- Well-documented patterns exist for mocking VSCode APIs with Sinon

**Alternatives Considered**:

- **Jest**: Popular but would require replacing Mocha infrastructure
- **Vitest**: Modern but unnecessary complexity for this project
- **Custom mocks**: More work, less maintainable than using Sinon

---

### Q2: Coverage Tooling

**Question**: Which code coverage tool should be used for TypeScript/VSCode extension testing?

**Research Findings**:

1. **c8** (modern successor to nyc):
   - Uses Node.js built-in coverage (no compilation step)
   - Fast and simple
   - Good TypeScript support
   - Terminal output built-in
   - Active maintenance

2. **nyc** (Istanbul command-line interface):
   - Mature and widely used
   - Requires Istanbul instrumenter
   - More configuration needed
   - Slower than c8

3. **Istanbul** (original):
   - Legacy tool, mostly replaced by nyc/c8

**Decision**: Use **c8** for coverage measurement

**Rationale**:

- Modern, fast, and simple
- Built-in terminal output (matches spec requirement)
- Good TypeScript support without additional configuration
- Uses Node.js native coverage (no compilation overhead)
- Active development and maintenance

**Alternatives Considered**:

- **nyc**: More mature but slower and more complex
- **Istanbul**: Legacy, not recommended for new projects

---

### Q3: VSCode Extension Testing Best Practices

**Question**: What are the best practices for structuring and organizing unit, integration, and E2E tests for VSCode extensions?

**Research Findings**:

1. **Test Organization**:
   - Separate test directories by type: `unit/`, `integration/`, `e2e/`
   - Mirror source structure in test directories
   - Use descriptive test file names: `*.test.ts`

2. **Unit Testing**:
   - Test pure logic functions without VSCode runtime
   - Mock all VSCode API dependencies
   - Test edge cases and error handling
   - Keep tests fast (< 5 seconds total)

3. **Integration Testing**:
   - Use `@vscode/test-electron` for real VSCode API access
   - Test component interactions (commands, configuration, status bar)
   - Test configuration persistence
   - Use test workspace fixtures

4. **E2E Testing**:
   - Launch Extension Development Host
   - Test complete user workflows
   - Verify UI changes (status bar, command palette)
   - Use `vscode-test` API for UI interactions

5. **Coverage**:
   - Focus on core extension logic (`src/extension.ts`)
   - Exclude test files from coverage
   - Set reasonable thresholds (80% for core logic)

**Decision**: Organize tests by type in `src/test/unit/`, `src/test/integration/`, `src/test/e2e/`

**Rationale**:

- Clear separation of concerns
- Easy to run test types independently
- Follows VSCode extension testing conventions
- Aligns with spec requirements (FR-006, FR-007)

**Alternatives Considered**:

- Flat structure: Less organized, harder to maintain
- Co-located tests: Not suitable for VSCode extension structure

---

### Q4: Mocking VSCode APIs for Unit Tests

**Question**: How should VSCode APIs be mocked for unit tests?

**Research Findings**:

1. **Approach 1: Sinon Stubs**:
   - Create stub instances of VSCode API objects
   - Use `sinon.createStubInstance()` for complex objects
   - Manually stub methods and properties

2. **Approach 2: Custom Mock Objects**:
   - Create TypeScript interfaces matching VSCode API
   - Implement mock objects with testable behavior
   - More maintainable for complex scenarios

3. **Approach 3: Dependency Injection**:
   - Refactor code to accept VSCode APIs as parameters
   - Inject mock objects during testing
   - More testable but requires code changes

**Decision**: Use **Sinon stubs** with **custom mock helpers** for complex VSCode API objects

**Rationale**:

- Sinon provides powerful stubbing capabilities
- Custom helpers reduce boilerplate for common VSCode API patterns
- Minimal code changes required
- Follows established patterns in VSCode extension testing

**Implementation Pattern**:

```typescript
// Create mock VSCode workspace configuration
const mockConfig = {
  get: sinon.stub(),
  update: sinon.stub().resolves(),
  // ... other methods
};

// Create mock VSCode workspace
const mockWorkspace = {
  getConfiguration: sinon.stub().returns(mockConfig),
  // ... other methods
};
```

**Alternatives Considered**:

- Full dependency injection: Too invasive for current codebase
- Pure mock objects only: Less flexible than Sinon stubs

---

### Q5: CI/CD Test Execution

**Question**: How should tests run in CI/CD environments, especially E2E tests that require VSCode?

**Research Findings**:

1. **@vscode/test-electron** supports headless execution:
   - Can run in CI/CD environments
   - Uses Electron in headless mode
   - Requires Xvfb on Linux CI systems

2. **Test Execution Strategy**:
   - All test types can run in CI/CD
   - E2E tests are slower but provide critical validation
   - Use test timeouts and retries for flaky tests

3. **CI/CD Configuration**:
   - Install VSCode test dependencies
   - Run tests in sequence or parallel (unit tests can be parallel)
   - Generate coverage reports
   - Upload coverage artifacts

**Decision**: Run all test types in CI/CD using `@vscode/test-electron` in headless mode

**Rationale**:

- Matches spec requirement (FR-008, clarification: all test types)
- Provides comprehensive validation before merge
- `@vscode/test-electron` supports headless execution
- Standard practice for VSCode extension CI/CD

**Alternatives Considered**:

- Skip E2E in CI: Reduces validation coverage
- Run E2E only on schedule: Delays feedback

---

## Resolved NEEDS CLARIFICATION Items

1. ✅ **Unit Testing Framework**: Mocha (existing) + Sinon (new dependency)
2. ✅ **Coverage Tooling**: c8 (new dependency)
3. ✅ **Mocking Strategy**: Sinon stubs with custom mock helpers
4. ✅ **Test Organization**: Separate directories by type (unit/integration/e2e)
5. ✅ **CI/CD Execution**: All test types using headless VSCode

## Dependencies to Add

- `sinon` - Mocking library for unit tests
- `@types/sinon` - TypeScript types for Sinon
- `c8` - Code coverage tool
- (Optional) `chai` - Assertion library (if not using Node.js assert)

## Next Steps

Proceed to Phase 1: Design & Contracts to create:

- Data model for test structure
- Test contracts/interfaces
- Quickstart guide for running tests
