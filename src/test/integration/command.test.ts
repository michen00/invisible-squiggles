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
  setLegacyMode,
  SQUIGGLE_TYPES,
  toggleAndWaitForChange,
} from "../helpers/testUtils";

suite("Extension Integration Tests - Command Execution", () => {
  let originalConfig: OriginalConfig;

  suiteSetup(async () => {
    originalConfig = await saveOriginalConfig();
    // Use legacy mode for tests that check color customizations
    await setLegacyMode();
  });

  suiteTeardown(async () => {
    await restoreOriginalConfig(originalConfig);
  });

  test("Toggle command should execute successfully", async () => {
    await vscode.commands.executeCommand("invisible-squiggles.toggle");
    // Command should execute without throwing
    assert.ok(true, "Toggle command executed successfully");
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
      "Color customizations should change after toggle"
    );
  });

  test("Double toggle should restore squiggles to visible state", async () => {
    // Reset to clean state and enable all hide flags for deterministic test
    await resetColorCustomizations();
    await enableAllHideFlags();

    // Verify starting state: no squiggles are transparent
    const initialCustomizations = getColorCustomizations();
    const initiallyTransparent = SQUIGGLE_TYPES.some((type) =>
      isSquiggleTypeTransparent(type, initialCustomizations)
    );
    assert.strictEqual(
      initiallyTransparent,
      false,
      "Should start with no transparent squiggles"
    );

    // First toggle: hide squiggles
    await toggleAndWaitForChange();
    const afterFirstToggle = getColorCustomizations();
    const transparentAfterFirst = SQUIGGLE_TYPES.every((type) =>
      isSquiggleTypeTransparent(type, afterFirstToggle)
    );
    assert.strictEqual(
      transparentAfterFirst,
      true,
      "After first toggle, all squiggles should be transparent"
    );

    // Second toggle: restore squiggles
    await toggleAndWaitForChange();
    const afterSecondToggle = getColorCustomizations();
    const transparentAfterSecond = SQUIGGLE_TYPES.some((type) =>
      isSquiggleTypeTransparent(type, afterSecondToggle)
    );
    assert.strictEqual(
      transparentAfterSecond,
      false,
      "After second toggle, squiggles should be visible (not transparent)"
    );
  });
});
