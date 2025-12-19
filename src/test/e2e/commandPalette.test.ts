import * as assert from "assert";
import * as vscode from "vscode";
import {
  delay,
  enableAllHideFlags,
  getColorCustomizations,
  isSquiggleTypeTransparent,
  OriginalConfig,
  resetColorCustomizations,
  restoreOriginalConfig,
  saveOriginalConfig,
  SQUIGGLE_TYPES,
  toggleAndWaitForChange,
} from "../helpers/testUtils";

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

  test("Visual verification: squiggles should become transparent when toggled", async () => {
    // Reset colorCustomizations to a known "visible" state (no transparency, no originalColors)
    // This ensures the test starts from a deterministic state regardless of prior runs.
    await resetColorCustomizations();

    // Make the test deterministic regardless of a developer's local settings:
    // enable all hide flags so the toggle affects all squiggle types.
    await enableAllHideFlags();

    // Re-read config after updates
    const initialCustomizations = getColorCustomizations();

    // Verify we're starting from a clean state (no transparency)
    const startingState = SQUIGGLE_TYPES.map((type) => ({
      type,
      foreground: initialCustomizations[`editor${type}.foreground`],
    }));
    const isStartingClean = SQUIGGLE_TYPES.every(
      (type) => !isSquiggleTypeTransparent(type, initialCustomizations)
    );

    // First toggle: should make squiggles transparent
    await toggleAndWaitForChange();

    const afterFirstToggle = getColorCustomizations();
    const isTransparentAfterFirst = SQUIGGLE_TYPES.every((type) =>
      isSquiggleTypeTransparent(type, afterFirstToggle)
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
    await toggleAndWaitForChange();

    const afterSecondToggle = getColorCustomizations();
    const isTransparentAfterSecond = SQUIGGLE_TYPES.every((type) =>
      isSquiggleTypeTransparent(type, afterSecondToggle)
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
