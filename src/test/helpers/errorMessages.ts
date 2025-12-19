/**
 * Error message formatting utilities for test failures
 * Ensures test failures include actionable information per SC-009:
 * - Test name
 * - Expected vs actual values
 * - File path and line number
 * - Stack trace
 * - Specific assertion failure details
 */

export interface TestErrorContext {
  testName: string;
  expected?: any;
  actual?: any;
  filePath?: string;
  lineNumber?: number;
  message?: string;
}

/**
 * Formats a test error message with all required context
 */
export function formatTestError(context: TestErrorContext): string {
  const parts: string[] = [];

  // Test name
  if (context.testName) {
    parts.push(`Test: ${context.testName}`);
  }

  // Expected vs actual
  if (context.expected !== undefined && context.actual !== undefined) {
    parts.push(`Expected: ${JSON.stringify(context.expected)}`);
    parts.push(`Actual: ${JSON.stringify(context.actual)}`);
  }

  // File and line
  if (context.filePath) {
    const location = context.lineNumber
      ? `${context.filePath}:${context.lineNumber}`
      : context.filePath;
    parts.push(`Location: ${location}`);
  }

  // Custom message
  if (context.message) {
    parts.push(`Details: ${context.message}`);
  }

  return parts.join("\n");
}

/**
 * Creates an assertion error with full context
 */
export function createAssertionError(context: TestErrorContext): Error {
  const message = formatTestError(context);
  const error = new Error(message);
  error.name = "AssertionError";
  return error;
}
