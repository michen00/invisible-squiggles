import * as assert from "assert";
import { describe, it } from "mocha";
import {
    ToggleSquigglesConfig,
    toggleSquigglesCore,
    TRANSPARENT_COLOR,
} from "../../extension";

describe("toggleSquigglesCore", () => {
  describe("basic toggle functionality", () => {
    it("should apply transparent colors when not already transparent", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
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
      assert.strictEqual(result.isAlreadyTransparent, false);
    });

    it("should restore colors when already transparent", () => {
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
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
        result.newCustomizations["editorError.foreground"],
        "#ff0000"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle invalid JSON in invisibleSquiggles.originalColors", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "invisibleSquiggles.originalColors": "invalid json{",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      // Should not throw, should fall back to empty object
      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);
      assert.ok(result);
      // Should still restore (but with empty stored colors)
      assert.strictEqual(result.isAlreadyTransparent, true);
      // Transparent colors should be removed
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        undefined
      );
    });

    it("should handle missing invisibleSquiggles.originalColors", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);
      assert.ok(result);
      // Should detect as already transparent
      assert.strictEqual(result.isAlreadyTransparent, true);
      // When restoring with no stored colors, should remove transparent colors
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        undefined
      );
    });

    it("should handle non-string invisibleSquiggles.originalColors", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        // Simulate a case where originalColors is not a string (e.g., number)
        // In practice, this shouldn't happen, but we should handle it gracefully
        "invisibleSquiggles.originalColors": 123 as any,
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);
      assert.ok(result);
      // Should detect as already transparent (all Error colors are transparent)
      // and restore (but with empty stored colors since originalColors was invalid)
      assert.strictEqual(result.isAlreadyTransparent, true);
      // Transparent colors should be removed (no stored colors to restore)
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        undefined
      );
    });

    it("should handle missing configuration values (use defaults)", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
      };

      // All false means no squiggles should be hidden
      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);
      // No transparent colors should be applied
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        "#ff0000"
      );
    });

    it("should handle conflicting color customizations (merge correctly)", () => {
      const currentCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
        "editorWarning.background": "#ffaa00",
        "custom.setting": "custom-value", // Existing customization
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      // Should preserve existing customizations
      assert.strictEqual(
        result.newCustomizations["custom.setting"],
        "custom-value"
      );
      // Should apply transparency to Error
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        TRANSPARENT_COLOR
      );
      // Should preserve Warning
      assert.strictEqual(
        result.newCustomizations["editorWarning.background"],
        "#ffaa00"
      );
    });
  });

  describe("concurrent execution simulation", () => {
    it("should handle multiple rapid toggles correctly (last state wins)", () => {
      const initialCustomizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      // Simulate first toggle (hide)
      const result1 = toggleSquigglesCore(initialCustomizations, hideSquiggles);
      assert.strictEqual(result1.isAlreadyTransparent, false);

      // Simulate second toggle (show) - using result1's newCustomizations as current
      const result2 = toggleSquigglesCore(
        result1.newCustomizations,
        hideSquiggles
      );
      assert.strictEqual(result2.isAlreadyTransparent, true);

      // Simulate third toggle (hide again)
      const result3 = toggleSquigglesCore(
        result2.newCustomizations,
        hideSquiggles
      );
      assert.strictEqual(result3.isAlreadyTransparent, false);

      // Each toggle should produce valid state
      assert.ok(result1.newCustomizations);
      assert.ok(result2.newCustomizations);
      assert.ok(result3.newCustomizations);
    });
  });
});
