/**
 * Shared test setup and configuration
 * This file is imported by test files to set up common test infrastructure
 */

import * as sinon from "sinon";

// Global test timeout
export const TEST_TIMEOUT = 5000; // 5 seconds for unit tests

// Cleanup function to restore all stubs after each test
export function restoreStubs(): void {
  sinon.restore();
}

// Setup function to be called before each test
export function setupTest(): void {
  // Any global test setup can go here
}

// Teardown function to be called after each test
export function teardownTest(): void {
  restoreStubs();
}
