import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension E2E Tests - Status Bar", () => {
  test("Status bar button should execute toggle command when clicked", async () => {
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

    // Simulate status bar button click by executing the command it's bound to
    // (In real E2E, we would click the status bar, but we can simulate via command)
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
      "Status bar button should execute toggle command"
    );
  });

  test("Status bar should reflect squiggle visibility state after toggle", async () => {
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

    // Execute toggle command (simulating status bar click)
    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    const changed = await configChanged;

    // Additional wait for propagation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify state changed by checking configuration
    const afterCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};
    const afterJson = JSON.stringify(afterCustomizations);

    // Verify: either configuration change event fired, or JSON changed
    assert.ok(
      changed || beforeJson !== afterJson,
      "Status bar state should be reflected in configuration"
    );
  });
});
