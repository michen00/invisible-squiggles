# Quickstart: Running Tests

**Date**: 2025-01-27
**Feature**: Comprehensive Testing Infrastructure

## Prerequisites

- Node.js 20.x
- npm (comes with Node.js)
- VSCode ^1.97.0 (for integration and E2E tests)

## Installation

```bash
# Install dependencies (including new test dependencies)
npm install
```

New dependencies added:

- `sinon` - Mocking library
- `@types/sinon` - TypeScript types
- `c8` - Coverage tool

## Running Tests

### Run All Tests

```bash
npm test
```

This runs:

1. Type checking (`npm run check-types`)
2. Linting (`npm run lint`)
3. Compilation (`npm run compile`)
4. All test suites (unit, integration, E2E)
5. Coverage report generation

### Run Unit Tests Only

```bash
npm run test:unit
```

Fast execution (< 5 seconds), uses mocked VSCode APIs.

### Run Integration Tests Only

```bash
npm run test:integration
```

Uses real VSCode APIs, requires VSCode test environment.

### Run E2E Tests Only

```bash
npm run test:e2e
```

Launches Extension Development Host, tests complete workflows.

### Run Tests with Coverage

```bash
npm run test:coverage
```

Generates coverage report in terminal format. Shows:

- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Per-file coverage breakdown
- Warning if below 80% threshold (does not fail build)

## Test Structure

```
src/test/
├── unit/              # Unit tests (mocked APIs)
├── integration/       # Integration tests (real APIs)
└── e2e/               # End-to-end tests (Extension Host)
```

## Writing Tests

### Unit Test Example

```typescript
import * as assert from "assert";
import * as sinon from "sinon";
import { setStatus } from "../../extension";

describe("setStatus", () => {
  it("should update status bar text and tooltip", () => {
    const mockStatusBar = {
      text: "",
      tooltip: "",
    };

    setStatus.call({ statusBarItem: mockStatusBar }, "visible");

    assert.strictEqual(mockStatusBar.text, "Squiggles: $(eye)");
    assert.strictEqual(mockStatusBar.tooltip, "Hide squiggles");
  });
});
```

### Integration Test Example

```typescript
import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Integration Tests", () => {
  test("should register toggle command", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes("invisible-squiggles.toggle"));
  });
});
```

### E2E Test Example

```typescript
import * as assert from "assert";
import { describe, it } from "mocha";
import * as vscode from "vscode";

suite("Extension E2E Tests", () => {
  it("should toggle squiggles via command palette", async () => {
    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    // Verify squiggles are hidden/shown
  });
});
```

## Coverage Reports

Coverage reports are generated automatically when running tests with coverage:

```bash
npm run test:coverage
```

**Output Format**: Terminal only (per specification)

**Threshold**: 80% for `src/extension.ts` (warning only, does not fail build)

**Coverage Types**:

- Line coverage
- Branch coverage
- Function coverage

## CI/CD

All test types run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

Tests run in headless VSCode mode using `@vscode/test-electron`.

## Troubleshooting

### Tests fail in CI/CD

- Ensure VSCode test dependencies are installed
- Check that headless mode is configured correctly
- Verify Xvfb is available on Linux CI systems

### Coverage not generating

- Ensure `c8` is installed: `npm install --save-dev c8`
- Check that test files are being executed
- Verify coverage script is configured in `package.json`

### Unit tests too slow

- Ensure VSCode APIs are properly mocked (not using real APIs)
- Check for unnecessary async operations
- Verify tests are not waiting for timeouts

## Next Steps

- See [data-model.md](./data-model.md) for test structure details
- See [research.md](./research.md) for technology decisions
- See [plan.md](./plan.md) for implementation plan
