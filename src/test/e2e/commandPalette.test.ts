import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension E2E Tests - Command Palette", () => {
  const TRANSPARENT_COLOR = "#00000000";
  const HIDE_KEY_BY_TYPE: Record<string, string> = {
    Error: "hideErrors",
    Warning: "hideWarnings",
    Info: "hideInfo",
    Hint: "hideHint",
  };
  const SQUIGGLE_TYPES = ["Error", "Warning", "Info", "Hint"] as const;

  function isTypeTransparent(
    type: (typeof SQUIGGLE_TYPES)[number],
    customizations: Record<string, string | undefined>
  ): boolean {
    // Use `foreground` only. In practice, this is the squiggle/underline color key VS Code respects
    // across squiggle types, while some `background`/`border` keys may be ignored depending on VS Code version/theme.
    const value = customizations[`editor${type}.foreground`];
    return value?.toLowerCase() === TRANSPARENT_COLOR.toLowerCase();
  }

  async function toggleAndWaitForCustomizationsChange(): Promise<void> {
    const changed = new Promise<boolean>((resolve) => {
      const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("workbench.colorCustomizations")) {
          disposable.dispose();
          resolve(true);
        }
      });
      setTimeout(() => {
        disposable.dispose();
        resolve(false);
      }, 5000);
    });

    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    await changed;
    // Additional wait for propagation
    await new Promise(resolve => setTimeout(resolve, 200));
  }

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

    // Reset colorCustomizations to a known "visible" state (no transparency, no originalColors)
    // This ensures the test starts from a deterministic state regardless of prior runs.
    await config.update("colorCustomizations", {}, vscode.ConfigurationTarget.Global);
    await new Promise(resolve => setTimeout(resolve, 150));

    // Make the test deterministic regardless of a developer's local settings:
    // enable all hide flags so the toggle affects all squiggle types.
    await settings.update("hideErrors", true, vscode.ConfigurationTarget.Global);
    await settings.update("hideWarnings", true, vscode.ConfigurationTarget.Global);
    await settings.update("hideInfo", true, vscode.ConfigurationTarget.Global);
    await settings.update("hideHint", true, vscode.ConfigurationTarget.Global);

    // Wait for configuration to update
    await new Promise(resolve => setTimeout(resolve, 150));

    // Re-read config after updates
    const initialCustomizations =
      vscode.workspace.getConfiguration("workbench")
        .get<Record<string, string | undefined>>("colorCustomizations") || {};

    // Verify we're starting from a clean state (no transparency)
    const startingState = SQUIGGLE_TYPES.map((type) => ({
      type,
      foreground: initialCustomizations[`editor${type}.foreground`],
    }));
    const isStartingClean = SQUIGGLE_TYPES.every(
      (type) => !isTypeTransparent(type, initialCustomizations)
    );

    // First toggle: should make squiggles transparent
    await toggleAndWaitForCustomizationsChange();

    const afterFirstToggle =
      vscode.workspace.getConfiguration("workbench")
        .get<Record<string, string | undefined>>("colorCustomizations") || {};
    const isTransparentAfterFirst = SQUIGGLE_TYPES.every((type) =>
      isTypeTransparent(type, afterFirstToggle)
    );

    const debugSnapshot = JSON.stringify(
      {
        startingState,
        isStartingClean,
        afterFirstToggle: SQUIGGLE_TYPES.map((type) => ({
          type,
          foreground: afterFirstToggle[`editor${type}.foreground`],
        })),
        isTransparentAfterFirst,
        originalColors: afterFirstToggle["invisibleSquiggles.originalColors"],
      },
      null,
      2
    );

    assert.ok(
      isStartingClean,
      `Test should start with non-transparent squiggles.\n${debugSnapshot}`
    );
    assert.ok(
      isTransparentAfterFirst,
      `After first toggle, squiggles should be transparent.\n${debugSnapshot}`
    );

    // Second toggle: should restore squiggles to visible
    await toggleAndWaitForCustomizationsChange();

    const afterSecondToggle =
      vscode.workspace.getConfiguration("workbench")
        .get<Record<string, string | undefined>>("colorCustomizations") || {};
    const isTransparentAfterSecond = SQUIGGLE_TYPES.every((type) =>
      isTypeTransparent(type, afterSecondToggle)
    );

    assert.ok(
      !isTransparentAfterSecond,
      `After second toggle, squiggles should be visible (not transparent).\n` +
        JSON.stringify(
          {
            afterSecondToggle: SQUIGGLE_TYPES.map((type) => ({
              type,
              foreground: afterSecondToggle[`editor${type}.foreground`],
            })),
            originalColors: afterSecondToggle["invisibleSquiggles.originalColors"],
          },
          null,
          2
        )
    );
  });
});
