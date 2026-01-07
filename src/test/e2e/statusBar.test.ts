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

suite("Extension E2E Tests - Status Bar", () => {
  let originalConfig: OriginalConfig;

  suiteSetup(async () => {
    originalConfig = await saveOriginalConfig();
  });

  suiteTeardown(async () => {
    await restoreOriginalConfig(originalConfig);
  });

  test("Toggle command should update color customizations", async () => {
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
      "Toggle command should update color customizations"
    );
  });

  test("Toggle command should reflect state change in configuration", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Ensure at least one hide flag is enabled so toggle has an effect
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    // Execute toggle command
    const changed = await toggleAndWaitForChange();

    // Verify state changed by checking configuration
    const afterJson = JSON.stringify(getColorCustomizations());

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      "Configuration should reflect state change after toggle"
    );
  });
});
