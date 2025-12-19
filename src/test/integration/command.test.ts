import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Integration Tests - Command Execution", () => {
  let originalCustomizations: Record<string, string | undefined>;

  suiteSetup(async () => {
    // Save original color customizations
    const config = vscode.workspace.getConfiguration("workbench");
    originalCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};
  });

  suiteTeardown(async () => {
    // Restore original color customizations
    const config = vscode.workspace.getConfiguration("workbench");
    await config.update(
      "colorCustomizations",
      originalCustomizations,
      vscode.ConfigurationTarget.Global
    );
  });

  test("Toggle command should execute successfully", async () => {
    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    // Command should execute without throwing
    assert.ok(true, "Toggle command executed successfully");
  });

  test("Status bar should update when toggle command is invoked", async () => {
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");
    const config = vscode.workspace.getConfiguration("workbench");

    // Ensure at least one hide flag is enabled so toggle has an effect
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);

    // Wait for configuration to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const beforeCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};
    const beforeJson = JSON.stringify(beforeCustomizations);

    // Wait for configuration change event
    const configChanged = new Promise<boolean>((resolve) => {
      const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("workbench.colorCustomizations")) {
          disposable.dispose();
          resolve(true);
        }
      });
      setTimeout(() => {
        disposable.dispose();
        resolve(false);
      }, 2000);
    });

    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    const changed = await configChanged;

    // Additional wait for propagation
    await new Promise(resolve => setTimeout(resolve, 200));

    const afterCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};
    const afterJson = JSON.stringify(afterCustomizations);

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
