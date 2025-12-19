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
      const savedColorsJson = result.newCustomizations["invisibleSquiggles.originalColors"];
      assert.ok(savedColorsJson);
      assert.strictEqual(typeof savedColorsJson, "string");

      const savedColors = JSON.parse(savedColorsJson as string);
      assert.strictEqual(savedColors["editorError.background"], "#ff0000");
      assert.strictEqual(savedColors["editorError.border"], "#ff0000");
      assert.strictEqual(savedColors["editorError.foreground"], "#ff0000");
    });

    it("should restore original colors when squiggles are already transparent", () => {
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
      };

      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "invisibleSquiggles.originalColors": JSON.stringify(originalColors),
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
  });
});
