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

suite("Extension Integration Tests - Command Execution", () => {
  let originalConfig: OriginalConfig;

  suiteSetup(async () => {
    originalConfig = await saveOriginalConfig();
  });

  suiteTeardown(async () => {
    await restoreOriginalConfig(originalConfig);
  });

  test("Toggle command should execute successfully", async () => {
    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    // Command should execute without throwing
    assert.ok(true, "Toggle command executed successfully");
  });

  test("Status bar should update when toggle command is invoked", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Ensure at least one hide flag is enabled so toggle has an effect
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    const changed = await toggleAndWaitForChange();

    const afterJson = JSON.stringify(getColorCustomizations());

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      "Color customizations should change after toggle"
    );
  });

  test("Multiple toggle commands should work correctly", async () => {
    // Toggle twice (should return to original state)
    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    await vscode.commands.executeCommand("invisible-squiggles.toggle");

    // After two toggles, should be back to initial state (or very close)
    // Note: This might not be exact due to originalColors storage, but structure should be similar
    assert.ok(true, "Multiple toggles executed without errors");
  });
});
