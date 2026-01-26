import * as assert from "assert";
import { describe, it } from "mocha";
import {
  ToggleSquigglesConfig,
  toggleSquigglesCore,
  TRANSPARENT_COLOR,
} from "../../extension";

describe("Color Logic", () => {
  describe("toggleSquigglesCore - transparent color application", () => {
    it("should apply transparent colors when squiggles are not already transparent", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result.newCustomizations["editorError.border"],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result.newCustomizations["editorError.foreground"],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(result.isAlreadyTransparent, false);
    });

    it("should save original colors before applying transparency", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      // Check that original colors are saved in invisibleSquiggles.originalColors
      const savedDataJson = result.newCustomizations["invisibleSquiggles.originalColors"];
      assert.ok(savedDataJson);
      assert.strictEqual(typeof savedDataJson, "string");

      const savedData = JSON.parse(savedDataJson as string);
      assert.ok(savedData.originalColors, "Should have originalColors");
      assert.ok(savedData.transparentKeys, "Should have transparentKeys");
      assert.strictEqual(savedData.originalColors["editorError.background"], "#ff0000");
      assert.strictEqual(savedData.originalColors["editorError.border"], "#ff0000");
      assert.strictEqual(savedData.originalColors["editorError.foreground"], "#ff0000");
    });

    it("should restore original colors when squiggles are already transparent", () => {
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
      };
      const transparentKeys = [
        "editorError.background",
        "editorError.border",
        "editorError.foreground",
      ];
      const storedData = JSON.stringify({ originalColors, transparentKeys });

      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "invisibleSquiggles.originalColors": storedData,
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(result.isAlreadyTransparent, true);
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        "#ff0000"
      );
      assert.strictEqual(result.newCustomizations["editorError.border"], "#ff0000");
      // Marker key is set to `null` to signal removal (restoreAndCleanup converts to undefined)
      assert.strictEqual(
        result.newCustomizations["invisibleSquiggles.originalColors"],
        null
      );
    });

    it("should only apply transparency to configured squiggle types", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
        "editorWarning.background": "#ffaa00",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result.newCustomizations["editorWarning.background"],
        "#ffaa00"
      );
    });

    it("should apply transparency for Info when hideInfo is enabled", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorInfo.background": "#00aaff",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: false,
        hideInfo: true,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(
        result.newCustomizations["editorInfo.background"],
        TRANSPARENT_COLOR
      );
    });

    it("should apply transparency for Hint when hideHint is enabled", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorHint.foreground": "#00ff00",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: false,
        hideInfo: false,
        hideHint: true,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(
        result.newCustomizations["editorHint.foreground"],
        TRANSPARENT_COLOR
      );
    });

    // Regression test: when all hide flags are disabled, shouldShowMessage must be false
    // to prevent the status bar from incorrectly showing "hidden" when nothing was hidden
    it("should return shouldShowMessage=false when all hide flags are disabled", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
        "editorWarning.background": "#ffaa00",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      // shouldShowMessage must be false so the caller knows not to update status bar
      assert.strictEqual(
        result.shouldShowMessage,
        false,
        "shouldShowMessage should be false when no squiggle types are configured to hide"
      );
      // Customizations should remain unchanged
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        "#ff0000"
      );
      assert.strictEqual(
        result.newCustomizations["editorWarning.background"],
        "#ffaa00"
      );
    });
  });
});
