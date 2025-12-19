/**
 * Test utilities for common test patterns
 */

import * as vscode from "vscode";
import {
  COLOR_PARTS_BY_SQUIGGLE_TYPE,
  SQUIGGLE_TYPES,
  TRANSPARENT_COLOR,
} from "../../extension";

// ============================================================================
// Constants
// ============================================================================

export { SQUIGGLE_TYPES, TRANSPARENT_COLOR } from "../../extension";

export type SquiggleType = (typeof SQUIGGLE_TYPES)[number];

// ============================================================================
// Configuration Save/Restore (for integration & E2E tests)
// ============================================================================

/**
 * Stores original configuration values for restoration after tests
 */
export interface OriginalConfig {
  colorCustomizations: Record<string, string | undefined>;
  hideErrors: boolean | undefined;
  hideWarnings: boolean | undefined;
  hideInfo: boolean | undefined;
  hideHint: boolean | undefined;
}

/**
 * Saves the current configuration values for later restoration.
 * Call this in suiteSetup().
 */
export async function saveOriginalConfig(): Promise<OriginalConfig> {
  const workbenchConfig = vscode.workspace.getConfiguration("workbench");
  const squigglesConfig = vscode.workspace.getConfiguration("invisibleSquiggles");

  return {
    colorCustomizations:
      workbenchConfig.get<Record<string, string | undefined>>("colorCustomizations") || {},
    hideErrors: squigglesConfig.get<boolean>("hideErrors"),
    hideWarnings: squigglesConfig.get<boolean>("hideWarnings"),
    hideInfo: squigglesConfig.get<boolean>("hideInfo"),
    hideHint: squigglesConfig.get<boolean>("hideHint"),
  };
}

/**
 * Restores configuration to the original values.
 * Call this in suiteTeardown().
 */
export async function restoreOriginalConfig(original: OriginalConfig): Promise<void> {
  const workbenchConfig = vscode.workspace.getConfiguration("workbench");
  const squigglesConfig = vscode.workspace.getConfiguration("invisibleSquiggles");

  await workbenchConfig.update(
    "colorCustomizations",
    original.colorCustomizations,
    vscode.ConfigurationTarget.Global
  );

  await Promise.all([
    squigglesConfig.update("hideErrors", original.hideErrors, vscode.ConfigurationTarget.Global),
    squigglesConfig.update("hideWarnings", original.hideWarnings, vscode.ConfigurationTarget.Global),
    squigglesConfig.update("hideInfo", original.hideInfo, vscode.ConfigurationTarget.Global),
    squigglesConfig.update("hideHint", original.hideHint, vscode.ConfigurationTarget.Global),
  ]);
}

// ============================================================================
// Wait Helpers (for integration & E2E tests)
// ============================================================================

/**
 * Waits for a colorCustomizations configuration change event.
 * @param timeout Maximum time to wait in milliseconds (default: 2000)
 * @returns true if change was detected, false if timeout
 */
export function waitForConfigChange(timeout: number = 2000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("workbench.colorCustomizations")) {
        disposable.dispose();
        resolve(true);
      }
    });
    setTimeout(() => {
      disposable.dispose();
      resolve(false);
    }, timeout);
  });
}

/**
 * Executes the toggle command and waits for the configuration change.
 * @param timeout Maximum time to wait for config change (default: 5000)
 * @param propagationDelay Additional delay after change detected (default: 200)
 */
export async function toggleAndWaitForChange(
  timeout: number = 5000,
  propagationDelay: number = 200
): Promise<boolean> {
  const changePromise = waitForConfigChange(timeout);
  await vscode.commands.executeCommand("invisible-squiggles.toggle");
  const changed = await changePromise;
  await delay(propagationDelay);
  return changed;
}

/**
 * Checks if a squiggle type is currently transparent in the given customizations.
 * Verifies ALL applicable color parts (background, border, foreground) are transparent,
 * matching the actual extension behavior.
 */
export function isSquiggleTypeTransparent(
  type: SquiggleType,
  customizations: Record<string, string | undefined>
): boolean {
  const parts = COLOR_PARTS_BY_SQUIGGLE_TYPE[type];
  return parts.every((part) => {
    const value = customizations[`editor${type}.${part}`];
    return value?.toLowerCase() === TRANSPARENT_COLOR.toLowerCase();
  });
}

/**
 * Gets the current color customizations from VSCode.
 */
export function getColorCustomizations(): Record<string, string | undefined> {
  return (
    vscode.workspace
      .getConfiguration("workbench")
      .get<Record<string, string | undefined>>("colorCustomizations") || {}
  );
}

/**
 * Enables all hide flags for deterministic testing.
 */
export async function enableAllHideFlags(): Promise<void> {
  const settings = vscode.workspace.getConfiguration("invisibleSquiggles");
  await Promise.all([
    settings.update("hideErrors", true, vscode.ConfigurationTarget.Global),
    settings.update("hideWarnings", true, vscode.ConfigurationTarget.Global),
    settings.update("hideInfo", true, vscode.ConfigurationTarget.Global),
    settings.update("hideHint", true, vscode.ConfigurationTarget.Global),
  ]);
  await delay(150);
}

/**
 * Resets colorCustomizations to an empty object for clean test state.
 */
export async function resetColorCustomizations(): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  await config.update("colorCustomizations", {}, vscode.ConfigurationTarget.Global);
  await delay(150);
}

// ============================================================================
// Boolean Combinations (for unit tests)
// ============================================================================

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
