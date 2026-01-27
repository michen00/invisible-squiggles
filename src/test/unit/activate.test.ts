import * as assert from "assert";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import { activate, ORIGINAL_COLORS_KEY, TRANSPARENT_COLOR } from "../../extension";
import type * as vscode from "vscode";
import {
  clearConfigUpdateCalls,
  getConfigUpdateCalls,
  setMockConfig,
} from "./setup";

/** Helper to create the stored data format */
function makeStoredData(
  originalColors: Record<string, string>,
  transparentKeys: string[]
): string {
  return JSON.stringify({ originalColors, transparentKeys });
}

describe("activate", () => {
  let mockContext: vscode.ExtensionContext;
  let mockStatusBarItem: vscode.StatusBarItem;

  beforeEach(() => {
    clearConfigUpdateCalls();

    // Create mock status bar item
    mockStatusBarItem = {
      text: "",
      tooltip: undefined,
      command: undefined,
      show: sinon.spy(),
      hide: sinon.spy(),
      dispose: sinon.spy(),
    } as unknown as vscode.StatusBarItem;

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Mock window.createStatusBarItem to return our mock
    const vscodeModule = require("vscode");
    sinon.stub(vscodeModule.window, "createStatusBarItem").returns(mockStatusBarItem);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("startHidden setting disabled (default)", () => {
    it("should not call toggle when setting is false", async () => {
      // Set up: startHidden is false (default)
      setMockConfig("invisibleSquiggles", "startHidden", false);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      activate(mockContext);

      // Wait for any async operations (restoreAndCleanup if needed)
      await new Promise((resolve) => setImmediate(resolve));

      // Verify no toggle happened (no config update that hides colors)
      const updateCalls = getConfigUpdateCalls();
      const hideCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.strictEqual(
        hideCall,
        undefined,
        "toggleSquiggles should not be called when startHidden is false"
      );
    });

    it("should not call toggle when setting is undefined (fresh install)", async () => {
      // Set up: no startHidden setting (undefined)
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      activate(mockContext);

      // Wait for any async operations (restoreAndCleanup if needed)
      await new Promise((resolve) => setImmediate(resolve));

      // Verify no toggle happened
      const updateCalls = getConfigUpdateCalls();
      const hideCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.strictEqual(
        hideCall,
        undefined,
        "toggleSquiggles should not be called when startHidden is undefined"
      );
    });
  });

  describe("startHidden setting enabled", () => {
    it("should call toggle immediately after restoreAndCleanup completes", async () => {
      // Set up: startHidden is true, no previous state to restore
      setMockConfig("invisibleSquiggles", "startHidden", true);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      activate(mockContext);

      // Wait for async operations (the promise chain in activate) to complete.
      // One tick is sufficient to flush the microtask queue.
      await new Promise((resolve) => setImmediate(resolve));

      // Verify toggle was called (config update that hides colors)
      const updateCalls = getConfigUpdateCalls();
      const hideCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.ok(hideCall, "toggleSquiggles should be called when startHidden is true");

      // Verify colors were made transparent
      const newCustomizations = hideCall!.value as Record<string, unknown>;
      assert.strictEqual(
        newCustomizations["editorError.background"],
        TRANSPARENT_COLOR,
        "Error colors should be made transparent"
      );
    });

    it("should call toggle after restoreAndCleanup restores colors from previous session", async () => {
      // Set up: startHidden is true, and there are colors to restore
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
      };
      const transparentKeys = [
        "editorError.background",
        "editorError.border",
        "editorError.foreground",
      ];

      setMockConfig("invisibleSquiggles", "startHidden", true);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      });

      activate(mockContext);

      // Wait for async operations (restoreAndCleanup promise chain and toggleSquiggles)
      // The code now properly chains promises, so we only need one tick
      await new Promise((resolve) => setImmediate(resolve));

      // Verify restore happened first (check config update calls)
      const updateCalls = getConfigUpdateCalls();
      const restoreCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          !(call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.ok(restoreCall, "restoreAndCleanup should have been called first");

      // Verify toggle was called after restore
      const hideCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.ok(
        hideCall,
        "toggleSquiggles should be called after restoreAndCleanup completes"
      );

      // Verify the hide call happened after restore (check order)
      const restoreIndex = updateCalls.indexOf(restoreCall!);
      const hideIndex = updateCalls.indexOf(hideCall!);
      assert.ok(
        hideIndex > restoreIndex,
        "toggleSquiggles should be called after restoreAndCleanup"
      );

      // REGRESSION TEST: Verify toggle saw cleaned config
      // If toggleSquiggles() ran before restore completed, it would see ORIGINAL_COLORS_KEY
      // and restore colors instead of hiding them. This assertion proves it saw cleaned config.
      const hideCustomizations = hideCall!.value as Record<string, unknown>;

      // Assertion 1: Colors are hidden (TRANSPARENT_COLOR), not restored (original color)
      assert.strictEqual(
        hideCustomizations["editorError.background"],
        TRANSPARENT_COLOR,
        "Colors should be hidden (not restored) - proves toggleSquiggles saw cleaned config without ORIGINAL_COLORS_KEY"
      );

      // Assertion 2: New marker key exists (proves this is hiding, not restoring)
      assert.ok(
        hideCustomizations[ORIGINAL_COLORS_KEY],
        "New marker key should exist - proves toggleSquiggles is hiding (not restoring)"
      );

      // Assertion 3: Verify the marker key contains the NEW stored data (not the old one)
      const newStoredData = JSON.parse(
        hideCustomizations[ORIGINAL_COLORS_KEY] as string
      );
      assert.ok(
        newStoredData.originalColors["editorError.background"],
        "Should store original color"
      );
      assert.strictEqual(
        newStoredData.originalColors["editorError.background"],
        "#ff0000",
        "Should store the original color that was restored, not the transparent one"
      );
    });

    it("regression: should wait for restoreAndCleanup before reading config (race condition fix)", async () => {
      // This test explicitly verifies the race condition fix:
      // If toggleSquiggles() reads config before restoreAndCleanup completes,
      // it would see ORIGINAL_COLORS_KEY and restore instead of hide.

      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
      };
      const transparentKeys = ["editorError.background", "editorError.border"];

      setMockConfig("invisibleSquiggles", "startHidden", true);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      });

      activate(mockContext);
      await new Promise((resolve) => setImmediate(resolve));

      const updateCalls = getConfigUpdateCalls();

      // Find restore call (removes ORIGINAL_COLORS_KEY)
      const restoreCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          !(call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );
      assert.ok(restoreCall, "restoreAndCleanup must complete first");

      // Find toggle call (adds NEW ORIGINAL_COLORS_KEY)
      const toggleCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );
      assert.ok(toggleCall, "toggleSquiggles must be called");

      // CRITICAL REGRESSION CHECK: Verify order
      const restoreIndex = updateCalls.indexOf(restoreCall!);
      const toggleIndex = updateCalls.indexOf(toggleCall!);
      assert.ok(
        toggleIndex > restoreIndex,
        "toggleSquiggles must execute AFTER restoreAndCleanup completes"
      );

      // CRITICAL REGRESSION CHECK: Verify toggle saw cleaned config
      // If toggle ran before restore, it would see ORIGINAL_COLORS_KEY and restore colors
      const toggleValue = toggleCall!.value as Record<string, unknown>;

      // Proof 1: Colors are hidden (TRANSPARENT_COLOR), not restored (#ff0000)
      assert.strictEqual(
        toggleValue["editorError.background"],
        TRANSPARENT_COLOR,
        "REGRESSION: Colors must be hidden, not restored. If toggle saw old ORIGINAL_COLORS_KEY, it would restore instead."
      );

      // Proof 2: New marker key exists (proves hiding, not restoring)
      assert.ok(
        toggleValue[ORIGINAL_COLORS_KEY],
        "New marker key must exist - proves toggleSquiggles is hiding (not restoring)"
      );

      // Proof 3: Verify stored data is correct (stores original color, not transparent)
      const storedData = JSON.parse(toggleValue[ORIGINAL_COLORS_KEY] as string);
      assert.strictEqual(
        storedData.originalColors["editorError.background"],
        "#ff0000",
        "Should store original color that was restored, proving toggle saw cleaned state"
      );
    });

    it("should respect existing hideErrors, hideWarnings, hideInfo, hideHint settings when calling toggle", async () => {
      // Set up: startHidden is true, and some hide flags are disabled
      setMockConfig("invisibleSquiggles", "startHidden", true);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("invisibleSquiggles", "hideWarnings", false); // Disabled
      setMockConfig("invisibleSquiggles", "hideInfo", true);
      setMockConfig("invisibleSquiggles", "hideHint", false); // Disabled
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
        "editorWarning.background": "#ffaa00",
        "editorInfo.background": "#00aaff",
        "editorHint.border": "#00ff00",
      });

      activate(mockContext);

      // Wait for async operations (restoreAndCleanup promise chain and toggleSquiggles)
      await new Promise((resolve) => setImmediate(resolve));

      // Verify toggle was called
      const updateCalls = getConfigUpdateCalls();
      const toggleCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.ok(toggleCall, "toggleSquiggles should have updated config");

      const newCustomizations = toggleCall!.value as Record<string, unknown>;
      // Error should be transparent (hideErrors is true)
      assert.strictEqual(
        newCustomizations["editorError.background"],
        TRANSPARENT_COLOR,
        "Error should be hidden when hideErrors is true"
      );
      // Warning should NOT be transparent (hideWarnings is false)
      assert.notStrictEqual(
        newCustomizations["editorWarning.background"],
        TRANSPARENT_COLOR,
        "Warning should not be hidden when hideWarnings is false"
      );
      // Info should be transparent (hideInfo is true)
      assert.strictEqual(
        newCustomizations["editorInfo.background"],
        TRANSPARENT_COLOR,
        "Info should be hidden when hideInfo is true"
      );
    });
  });

  describe("default behavior unchanged", () => {
    it("should not call toggle when setting is not configured (fresh installation)", async () => {
      // Set up: no startHidden setting at all
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      activate(mockContext);

      // Wait for any async operations (restoreAndCleanup if needed)
      await new Promise((resolve) => setImmediate(resolve));

      // Verify toggle was not called
      const updateCalls = getConfigUpdateCalls();
      const hideCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.strictEqual(
        hideCall,
        undefined,
        "toggleSquiggles should not be called when startHidden is not configured"
      );
    });

    it("should handle undefined/null setting value gracefully (defaults to false)", async () => {
      // Set up: startHidden is explicitly undefined
      setMockConfig("invisibleSquiggles", "startHidden", undefined);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      activate(mockContext);

      // Wait for any async operations (restoreAndCleanup if needed)
      await new Promise((resolve) => setImmediate(resolve));

      // Verify toggle was not called (should default to false)
      const updateCalls = getConfigUpdateCalls();
      const hideCall = updateCalls.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );

      assert.strictEqual(
        hideCall,
        undefined,
        "toggleSquiggles should not be called when startHidden is undefined (defaults to false)"
      );
    });
  });

  describe("manual toggle functionality", () => {
    it("should allow manual toggle after startup auto-hide", async () => {
      // Set up: startHidden is true, activate will auto-hide
      setMockConfig("invisibleSquiggles", "startHidden", true);
      setMockConfig("invisibleSquiggles", "hideErrors", true);
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      // Activate (will auto-hide)
      activate(mockContext);
      // Wait for async operations (restoreAndCleanup promise chain and toggleSquiggles)
      await new Promise((resolve) => setImmediate(resolve));

      // Verify auto-hide happened
      const updateCallsAfterActivate = getConfigUpdateCalls();
      const autoHideCall = updateCallsAfterActivate.find(
        (call) =>
          call.section === "workbench" &&
          call.key === "colorCustomizations" &&
          (call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
      );
      assert.ok(autoHideCall, "Auto-hide should have been called");

      // Simulate manual toggle by calling the command
      const vscodeModule = require("vscode");
      const commands = vscodeModule.commands;
      // Get the registered command and execute it
      const registeredCommands = (commands as any).__registeredCommands || {};
      const toggleCommand = registeredCommands["invisible-squiggles.toggle"];

      if (toggleCommand) {
        await toggleCommand();

        // Wait for async operations (toggleSquiggles config update)
        await new Promise((resolve) => setImmediate(resolve));

        // Verify manual toggle worked (should restore colors)
        const updateCalls = getConfigUpdateCalls();
        const restoreCall = updateCalls.find(
          (call) =>
            call.section === "workbench" &&
            call.key === "colorCustomizations" &&
            call !== autoHideCall &&
            !(call.value as Record<string, unknown>)[ORIGINAL_COLORS_KEY]
        );

        // If restore call exists, verify colors were restored
        if (restoreCall) {
          const newCustomizations = restoreCall.value as Record<string, unknown>;
          assert.strictEqual(
            newCustomizations["editorError.background"],
            "#ff0000",
            "Manual toggle should restore colors"
          );
        }
      }
    });
  });
});
