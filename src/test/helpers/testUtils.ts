/**
 * Test utilities for common test patterns
 */

/**
 * Generates all combinations of boolean values for n variables
 * Useful for testing all configuration scenarios
 * @param n Number of boolean variables
 * @returns Array of arrays, each containing n boolean values
 */
export function generateBooleanCombinations(n: number): boolean[][] {
  const combinations: boolean[][] = [];
  const total = Math.pow(2, n);

  for (let i = 0; i < total; i++) {
    const combination: boolean[] = [];
    for (let j = 0; j < n; j++) {
      combination.push((i & (1 << j)) !== 0);
    }
    combinations.push(combination);
  }

  return combinations;
}

/**
 * Creates a delay for testing async operations
 * @param ms Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to be true
 * @param condition Function that returns true when condition is met
 * @param timeout Maximum time to wait in milliseconds
 * @param interval Check interval in milliseconds
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await delay(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Creates a test configuration object for squiggle types
 */
export interface SquiggleTypeConfig {
  hideErrors: boolean;
  hideWarnings: boolean;
  hideInfo: boolean;
  hideHint: boolean;
}

/**
 * Generates all 16 possible squiggle type configurations
 * (2^4 = 16 combinations)
 */
export function generateAllSquiggleConfigs(): SquiggleTypeConfig[] {
  const combinations = generateBooleanCombinations(4);
  return combinations.map(([hideErrors, hideWarnings, hideInfo, hideHint]) => ({
    hideErrors: hideErrors ?? false,
    hideWarnings: hideWarnings ?? false,
    hideInfo: hideInfo ?? false,
    hideHint: hideHint ?? false,
  }));
}

/**
 * Creates a mock color customizations object
 */
export function createMockColorCustomizations(
  overrides: Record<string, string> = {}
): Record<string, string> {
  const defaults: Record<string, string> = {
    "editorError.background": "#ff0000",
    "editorError.border": "#ff0000",
    "editorError.foreground": "#ff0000",
    "editorWarning.background": "#ffaa00",
    "editorWarning.border": "#ffaa00",
    "editorWarning.foreground": "#ffaa00",
    "editorInfo.background": "#00aaff",
    "editorInfo.border": "#00aaff",
    "editorInfo.foreground": "#00aaff",
    "editorHint.border": "#00ff00",
    "editorHint.foreground": "#00ff00",
  };

  return { ...defaults, ...overrides };
}
