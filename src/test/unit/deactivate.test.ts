import * as assert from "assert";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import { deactivate, ORIGINAL_COLORS_KEY, TRANSPARENT_COLOR } from "../../extension";
import { clearConfigUpdateCalls, getConfigUpdateCalls, setMockConfig } from "./setup";

describe("deactivate", () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    clearConfigUpdateCalls();
  });

  describe("when extension is deactivated with hidden squiggles", () => {
    it("should restore original colors and clear the marker key", async () => {
      // Set up initial state: squiggles are hidden (marker key exists with original colors)
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
      };

      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: JSON.stringify(originalColors),
      });

      // Call deactivate
      await deactivate();

      // Verify config.update was called
      const updateCalls = getConfigUpdateCalls();
      assert.strictEqual(updateCalls.length, 1, "Should call config.update once");
      assert.strictEqual(updateCalls[0]!.section, "workbench");
      assert.strictEqual(updateCalls[0]!.key, "colorCustomizations");

      // Verify the new customizations restore original colors
      const newCustomizations = updateCalls[0]!.value as Record<string, unknown>;
      assert.strictEqual(
        newCustomizations["editorError.background"],
        "#ff0000",
        "Error background should be restored"
      );
      assert.strictEqual(
        newCustomizations["editorError.border"],
        "#ff0000",
        "Error border should be restored"
      );
      assert.strictEqual(
        newCustomizations["editorError.foreground"],
        "#ff0000",
        "Error foreground should be restored"
      );

      // Verify marker key is cleared
      assert.strictEqual(
        newCustomizations[ORIGINAL_COLORS_KEY],
        undefined,
        "Marker key should be cleared"
      );
    });

    it("should clear transparent colors that have no stored original", async () => {
      // Set up: transparent colors exist but only some have stored originals
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR, // No stored original for this
        "editorError.foreground": TRANSPARENT_COLOR, // No stored original for this
        [ORIGINAL_COLORS_KEY]: JSON.stringify({
          "editorError.background": "#ff0000", // Only this has a stored original
        }),
      });

      await deactivate();

      const updateCalls = getConfigUpdateCalls();
      const newCustomizations = updateCalls[0]!.value as Record<string, unknown>;

      // Stored original should be restored
      assert.strictEqual(newCustomizations["editorError.background"], "#ff0000");

      // Transparent colors without stored originals should be cleared (undefined)
      assert.strictEqual(
        newCustomizations["editorError.border"],
        undefined,
        "Transparent border with no original should be cleared"
      );
      assert.strictEqual(
        newCustomizations["editorError.foreground"],
        undefined,
        "Transparent foreground with no original should be cleared"
      );
    });
  });

  describe("when extension is deactivated with visible squiggles", () => {
    it("should not update config when no marker key exists", async () => {
      // Set up: normal state, no hidden squiggles (no marker key)
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
      });

      await deactivate();

      // Should not call config.update since nothing needs to be restored
      const updateCalls = getConfigUpdateCalls();
      assert.strictEqual(updateCalls.length, 0, "Should not call config.update");
    });

    it("should clean up null marker key if present", async () => {
      // Edge case: marker key exists but is null (from previous toggle restore)
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": "#ff0000",
        [ORIGINAL_COLORS_KEY]: null,
      });

      await deactivate();

      // Should update to clean up the null key
      const updateCalls = getConfigUpdateCalls();
      assert.strictEqual(
        updateCalls.length,
        1,
        "Should call config.update to clean up"
      );

      const newCustomizations = updateCalls[0]!.value as Record<string, unknown>;
      assert.strictEqual(
        newCustomizations[ORIGINAL_COLORS_KEY],
        undefined,
        "Null marker key should be cleaned up to undefined"
      );
      // Existing colors should be preserved
      assert.strictEqual(newCustomizations["editorError.background"], "#ff0000");
    });
  });

  describe("error handling", () => {
    it("should catch and log errors without throwing", async () => {
      const consoleErrorStub = sinon.stub(console, "error");

      // Set up state that would trigger restoration
      setMockConfig("workbench", "colorCustomizations", {
        [ORIGINAL_COLORS_KEY]: "invalid json{", // Will cause parse error in restoreAndCleanup
      });

      // deactivate should not throw even if there's an error
      await assert.doesNotReject(async () => {
        await deactivate();
      });

      // Note: The error is logged by restoreAndCleanup, not deactivate's try-catch
      // The try-catch in deactivate catches config.update errors
      assert.ok(consoleErrorStub.called, "Should log error for invalid JSON");
    });

    it("should preserve non-squiggle customizations during restoration", async () => {
      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": TRANSPARENT_COLOR,
        "custom.userSetting": "#123456", // Non-squiggle customization
        "anotherCustom.color": "#abcdef",
        [ORIGINAL_COLORS_KEY]: JSON.stringify({
          "editorError.background": "#ff0000",
        }),
      });

      await deactivate();

      const updateCalls = getConfigUpdateCalls();
      const newCustomizations = updateCalls[0]!.value as Record<string, unknown>;

      // Non-squiggle customizations should be preserved
      assert.strictEqual(
        newCustomizations["custom.userSetting"],
        "#123456",
        "Non-squiggle customizations should be preserved"
      );
      assert.strictEqual(
        newCustomizations["anotherCustom.color"],
        "#abcdef",
        "Non-squiggle customizations should be preserved"
      );
    });
  });

  describe("multiple squiggle types", () => {
    it("should restore all squiggle types that were hidden", async () => {
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
        "editorWarning.background": "#ffaa00",
        "editorWarning.border": "#ffaa00",
        "editorWarning.foreground": "#ffaa00",
        "editorInfo.background": "#00aaff",
        "editorInfo.border": "#00aaff",
        "editorInfo.foreground": "#00aaff",
        "editorHint.border": "#00ff00",
        "editorHint.foreground": "#00ff00",
      };

      setMockConfig("workbench", "colorCustomizations", {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "editorWarning.background": TRANSPARENT_COLOR,
        "editorWarning.border": TRANSPARENT_COLOR,
        "editorWarning.foreground": TRANSPARENT_COLOR,
        "editorInfo.background": TRANSPARENT_COLOR,
        "editorInfo.border": TRANSPARENT_COLOR,
        "editorInfo.foreground": TRANSPARENT_COLOR,
        "editorHint.border": TRANSPARENT_COLOR,
        "editorHint.foreground": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: JSON.stringify(originalColors),
      });

      await deactivate();

      const updateCalls = getConfigUpdateCalls();
      const newCustomizations = updateCalls[0]!.value as Record<string, unknown>;

      // All types should be restored
      assert.strictEqual(newCustomizations["editorError.background"], "#ff0000");
      assert.strictEqual(newCustomizations["editorWarning.background"], "#ffaa00");
      assert.strictEqual(newCustomizations["editorInfo.background"], "#00aaff");
      assert.strictEqual(newCustomizations["editorHint.border"], "#00ff00");
      assert.strictEqual(newCustomizations["editorHint.foreground"], "#00ff00");
    });
  });
});
