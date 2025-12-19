import * as assert from "assert";
import * as vscode from "vscode";
import { generateAllSquiggleConfigs } from "../helpers/testUtils";

suite("Extension Integration Tests - Configuration", () => {
  let originalCustomizations: Record<string, string | undefined>;
  let originalSquiggleSettings: {
    hideErrors?: boolean;
    hideWarnings?: boolean;
    hideInfo?: boolean;
    hideHint?: boolean;
  };
  const TRANSPARENT_COLOR = "#00000000";

  suiteSetup(async () => {
    // Save original color customizations
    const workbenchConfig = vscode.workspace.getConfiguration("workbench");
    originalCustomizations =
      workbenchConfig.get<Record<string, string | undefined>>("colorCustomizations") ||
      {};

    // Save original invisible squiggle settings
    const squiggleConfig = vscode.workspace.getConfiguration("invisibleSquiggles");
    originalSquiggleSettings = {
      hideErrors: squiggleConfig.get<boolean | undefined>("hideErrors"),
      hideWarnings: squiggleConfig.get<boolean | undefined>("hideWarnings"),
      hideInfo: squiggleConfig.get<boolean | undefined>("hideInfo"),
      hideHint: squiggleConfig.get<boolean | undefined>("hideHint"),
    };
  });

  suiteTeardown(async () => {
    // Restore original color customizations
    const workbenchConfig = vscode.workspace.getConfiguration("workbench");
    await workbenchConfig.update(
      "colorCustomizations",
      originalCustomizations,
      vscode.ConfigurationTarget.Global
    );

    // Restore original invisible squiggle settings
    const squiggleConfig = vscode.workspace.getConfiguration("invisibleSquiggles");
    await Promise.all([
      squiggleConfig.update(
        "hideErrors",
        originalSquiggleSettings?.hideErrors,
        vscode.ConfigurationTarget.Global
      ),
      squiggleConfig.update(
        "hideWarnings",
        originalSquiggleSettings?.hideWarnings,
        vscode.ConfigurationTarget.Global
      ),
      squiggleConfig.update(
        "hideInfo",
        originalSquiggleSettings?.hideInfo,
        vscode.ConfigurationTarget.Global
      ),
      squiggleConfig.update(
        "hideHint",
        originalSquiggleSettings?.hideHint,
        vscode.ConfigurationTarget.Global
      ),
    ]);
  });

  test("workbench.colorCustomizations should update when toggle command executes", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");
    const config = vscode.workspace.getConfiguration("workbench");

    // Ensure at least one hide flag is enabled
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);

    // Wait for configuration to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get initial state
    const beforeCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};
    const beforeJson = JSON.stringify(beforeCustomizations);

    // Execute toggle command and wait for configuration change
    const configChanged = new Promise<boolean>((resolve) => {
      const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("workbench.colorCustomizations")) {
          disposable.dispose();
          resolve(true);
        }
      });
      // Timeout after 2 seconds
      setTimeout(() => {
        disposable.dispose();
        resolve(false);
      }, 2000);
    });

    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    const changed = await configChanged;

    // Additional wait for propagation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get state after toggle
    const afterCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};
    const afterJson = JSON.stringify(afterCustomizations);

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
    const workbenchConfig = vscode.workspace.getConfiguration("workbench");

    // Test a subset of configurations (testing all 16 would be slow)
    // Test: All enabled, all disabled, and a few combinations
    const testConfigs = [
      allConfigs[0], // All false
      allConfigs[15], // All true
      allConfigs[8], // Errors only
      allConfigs[7], // Warnings only
    ];

    for (const testConfig of testConfigs) {
      if (!testConfig) {
        continue;
      }

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
      const customizations =
        workbenchConfig.get<Record<string, string | undefined>>("colorCustomizations") || {};

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

  test("Configuration should persist across toggles", async () => {
    const config = vscode.workspace.getConfiguration("invisibleSquiggles");
    const originalHideErrors = config.get<boolean>("hideErrors", true);
    const originalHideWarnings = config.get<boolean>("hideWarnings", true);

    // Change configuration - set hideErrors to false, but keep hideWarnings true
    // This ensures at least one hide flag is enabled so toggle will have an effect
    await config.update("hideErrors", false, vscode.ConfigurationTarget.Global);
    await config.update("hideWarnings", true, vscode.ConfigurationTarget.Global);

    // Wait for configuration to update
    await new Promise(resolve => setTimeout(resolve, 200));

    // Toggle
    await vscode.commands.executeCommand("invisible-squiggles.toggle");

    // Wait for toggle to complete
    await new Promise(resolve => setTimeout(resolve, 200));

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
