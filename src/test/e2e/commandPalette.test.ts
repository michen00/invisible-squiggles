import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension E2E Tests - Command Palette", () => {
  const TRANSPARENT_COLOR = "#00000000";

  test("Extension Development Host should launch with extension loaded", async () => {
    const extension = vscode.extensions.getExtension("michen00.invisible-squiggles");
    assert.ok(extension, "Extension should be loaded");
    assert.ok(extension.isActive, "Extension should be active");
  });

  test("Toggle Squiggles command should execute via command palette", async () => {
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

    // Execute command via command palette simulation
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
      "Command should update color customizations"
    );
  });

  test("Visual verification: squiggles should become transparent when toggled", async () => {
    const config = vscode.workspace.getConfiguration("workbench");
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

    // Get initial state
    const initialCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};

    // Check if already transparent
    const isInitiallyTransparent = ["Error", "Warning", "Info", "Hint"].every((type) => {
      const hideKey = `hide${type}s`;
      const shouldHide = settings.get<boolean>(hideKey, true);
      if (!shouldHide) {
        return true; // Not configured to hide, so "transparent" check doesn't apply
      }

      return (
        initialCustomizations[`editor${type}.background`]?.toLowerCase() ===
        TRANSPARENT_COLOR.toLowerCase()
      );
    });

    // Execute toggle
    await vscode.commands.executeCommand("invisible-squiggles.toggle");

    const afterCustomizations =
      config.get<Record<string, string | undefined>>("colorCustomizations") || {};

    // Verify visual change by checking color values via configuration API
    if (isInitiallyTransparent) {
      // Should restore (colors should NOT be transparent)
      const hasTransparentColors = ["Error", "Warning", "Info", "Hint"].some((type) => {
        const hideKey = `hide${type}s`;
        const shouldHide = settings.get<boolean>(hideKey, true);
        return (
          shouldHide &&
          afterCustomizations[`editor${type}.background`]?.toLowerCase() ===
            TRANSPARENT_COLOR.toLowerCase()
        );
      });
      assert.ok(
        !hasTransparentColors || afterCustomizations["invisibleSquiggles.originalColors"] === undefined,
        "Squiggles should be visible (not transparent) after toggle"
      );
    } else {
      // Should apply transparency
      const hasTransparentColors = ["Error", "Warning", "Info", "Hint"].some((type) => {
        const hideKey = `hide${type}s`;
        const shouldHide = settings.get<boolean>(hideKey, true);
        return (
          shouldHide &&
          afterCustomizations[`editor${type}.background`]?.toLowerCase() ===
            TRANSPARENT_COLOR.toLowerCase()
        );
      });
      assert.ok(
        hasTransparentColors || afterCustomizations["invisibleSquiggles.originalColors"] !== undefined,
        "Squiggles should be transparent after toggle"
      );
    }
  });
});
