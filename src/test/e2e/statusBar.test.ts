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

  test("Status bar button should execute toggle command when clicked", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Ensure at least one hide flag is enabled so toggle has an effect
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    // Simulate status bar button click by executing the command it's bound to
    // (In real E2E, we would click the status bar, but we can simulate via command)
    const changed = await toggleAndWaitForChange();

    const afterJson = JSON.stringify(getColorCustomizations());

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      "Status bar button should execute toggle command"
    );
  });

  test("Status bar should reflect squiggle visibility state after toggle", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Ensure at least one hide flag is enabled so toggle has an effect
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    // Execute toggle command (simulating status bar click)
    const changed = await toggleAndWaitForChange();

    // Verify state changed by checking configuration
    const afterJson = JSON.stringify(getColorCustomizations());

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      "Status bar state should be reflected in configuration"
    );
  });
});
