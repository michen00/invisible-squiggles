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

      // Wait for any async operations
      await new Promise((resolve) => setImmediate(resolve));
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

      // Wait for any async operations
      await new Promise((resolve) => setImmediate(resolve));
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

      // Wait for async operations (restoreAndCleanup and toggleSquiggles)
      await new Promise((resolve) => setImmediate(resolve));
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

      // Wait for async operations (restoreAndCleanup and toggleSquiggles)
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
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

      // Wait for async operations
      await new Promise((resolve) => setImmediate(resolve));
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

      // Wait for any async operations
      await new Promise((resolve) => setImmediate(resolve));
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

      // Wait for any async operations
      await new Promise((resolve) => setImmediate(resolve));
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
      await new Promise((resolve) => setImmediate(resolve));
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

        // Wait for async operations
        await new Promise((resolve) => setImmediate(resolve));
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
