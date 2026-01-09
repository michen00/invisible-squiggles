import * as assert from "assert";
import * as vscode from "vscode";
import {
  delay,
  getColorCustomizations,
  OriginalConfig,
  restoreOriginalConfig,
  saveOriginalConfig,
  toggleAndWaitForChange,
} from "../helpers/testUtils";

/**
 * E2E tests verify the extension works correctly in the Extension Development Host.
 * These tests focus on user-facing scenarios (command palette, extension activation).
 *
 * Detailed toggle logic and edge cases are tested in integration tests.
 */
suite("Extension E2E Tests - Command Palette", () => {
  let originalConfig: OriginalConfig;

  suiteSetup(async () => {
    originalConfig = await saveOriginalConfig();
  });

  suiteTeardown(async () => {
    await restoreOriginalConfig(originalConfig);
  });

  test("Extension Development Host should launch with extension loaded", async () => {
    const extension = vscode.extensions.getExtension("michen00.invisible-squiggles");
    assert.ok(extension, "Extension should be loaded");
    assert.ok(extension.isActive, "Extension should be active");
  });

  test("Toggle Squiggles command should execute via command palette", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Ensure at least one hide flag is enabled so toggle has an effect
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    // Execute command via command palette simulation
    const changed = await toggleAndWaitForChange();

    const afterJson = JSON.stringify(getColorCustomizations());

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      "Command should update color customizations"
    );
  });
});
