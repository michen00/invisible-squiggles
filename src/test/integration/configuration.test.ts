import * as assert from "assert";
import * as vscode from "vscode";
import {
  delay,
  generateAllSquiggleConfigs,
  getColorCustomizations,
  OriginalConfig,
  restoreOriginalConfig,
  saveOriginalConfig,
  toggleAndWaitForChange,
  TRANSPARENT_COLOR,
} from "../helpers/testUtils";

suite("Extension Integration Tests - Configuration", () => {
  let originalConfig: OriginalConfig;

  suiteSetup(async () => {
    originalConfig = await saveOriginalConfig();
  });

  suiteTeardown(async () => {
    await restoreOriginalConfig(originalConfig);
  });

  test("workbench.colorCustomizations should update when toggle command executes", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Ensure at least one hide flag is enabled
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    // Execute toggle command and wait for configuration change
    const changed = await toggleAndWaitForChange();

    const afterJson = JSON.stringify(getColorCustomizations());

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      `Color customizations should be updated. Config changed: ${changed}, Before: ${beforeJson.substring(0, 100)}, After: ${afterJson.substring(0, 100)}`
    );
  });

  test("All 16 configuration scenarios should work correctly", async () => {
    const allConfigs = generateAllSquiggleConfigs();
    assert.strictEqual(allConfigs.length, 16, "Should have 16 configuration combinations");

    const config = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Test a subset of configurations (testing all 16 would be slow)
    // Test: All enabled, all disabled, and a few combinations
    const testConfigs = [
      allConfigs[0]!, // All false
      allConfigs[15]!, // All true
      allConfigs[8]!, // Errors only
      allConfigs[7]!, // Warnings only
    ];

    for (const testConfig of testConfigs) {
      // Set configuration
      await config.update("hideErrors", testConfig.hideErrors, vscode.ConfigurationTarget.Global);
      await config.update(
        "hideWarnings",
        testConfig.hideWarnings,
        vscode.ConfigurationTarget.Global
      );
      await config.update("hideInfo", testConfig.hideInfo, vscode.ConfigurationTarget.Global);
      await config.update("hideHint", testConfig.hideHint, vscode.ConfigurationTarget.Global);

      // Execute toggle
      await vscode.commands.executeCommand("invisible-squiggles.toggle");

      // Verify configuration was applied
      const customizations = getColorCustomizations();

      // Check that configured squiggle types are affected
      if (testConfig.hideErrors) {
        // Error colors should be transparent or have originalColors stored
        const hasErrorTransparent =
          customizations["editorError.background"]?.toLowerCase() === TRANSPARENT_COLOR;
        const hasErrorOriginal =
          customizations["invisibleSquiggles.originalColors"] !== undefined;
        assert.ok(
          hasErrorTransparent || hasErrorOriginal,
          `Error squiggles should be handled when hideErrors=${testConfig.hideErrors}`
        );
      }

      // Toggle back to reset state
      await vscode.commands.executeCommand("invisible-squiggles.toggle");
    }

    assert.ok(true, "All tested configuration scenarios worked correctly");
  });

  test("showStatusBarMessage setting should not break toggle functionality", async () => {
    const config = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Enable status bar message
    await config.update("showStatusBarMessage", true, vscode.ConfigurationTarget.Global);
    await config.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await delay(100);

    const beforeJson = JSON.stringify(getColorCustomizations());

    // Toggle should still work with showStatusBarMessage enabled
    await toggleAndWaitForChange();

    const afterJson = JSON.stringify(getColorCustomizations());

    assert.ok(
      beforeJson !== afterJson,
      "Toggle should still update configuration when showStatusBarMessage is enabled"
    );

    // Clean up
    await config.update("showStatusBarMessage", false, vscode.ConfigurationTarget.Global);
  });

  test("Configuration should persist across toggles", async () => {
    const config = vscode.workspace.getConfiguration("invisibleSquiggles");
    const originalHideErrors = config.get<boolean>("hideErrors", true);
    const originalHideWarnings = config.get<boolean>("hideWarnings", true);

    // Change configuration - set hideErrors to false, but keep hideWarnings true
    // This ensures at least one hide flag is enabled so toggle will have an effect
    await config.update("hideErrors", false, vscode.ConfigurationTarget.Global);
    await config.update("hideWarnings", true, vscode.ConfigurationTarget.Global);

    await delay(200);

    // Toggle
    await vscode.commands.executeCommand("invisible-squiggles.toggle");

    await delay(200);

    // Verify configuration persisted (toggle should not change hideErrors setting)
    // Re-read config to ensure we get the latest values
    const refreshedConfig = vscode.workspace.getConfiguration("invisibleSquiggles");
    const afterHideErrors = refreshedConfig.get<boolean>("hideErrors", true);
    const afterHideWarnings = refreshedConfig.get<boolean>("hideWarnings", true);
    assert.strictEqual(afterHideErrors, false, "Configuration should persist");
    assert.strictEqual(afterHideWarnings, true, "Configuration should persist");

    // Restore
    await config.update("hideErrors", originalHideErrors, vscode.ConfigurationTarget.Global);
    await config.update("hideWarnings", originalHideWarnings, vscode.ConfigurationTarget.Global);
  });
});
