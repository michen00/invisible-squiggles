import * as assert from "assert";
import { afterEach, describe, it } from "mocha";
import sinon from "sinon";
import {
  ORIGINAL_COLORS_KEY,
  restoreAndCleanup,
  ToggleSquigglesConfig,
  toggleSquigglesCore,
  TRANSPARENT_COLOR,
} from "../../extension";

describe("toggleSquigglesCore", () => {
  // Ensure all sinon stubs/spies are restored after each test
  afterEach(() => {
    sinon.restore();
  });
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
      assert.strictEqual(result.newCustomizations["editorError.background"], "#ff0000");
      assert.strictEqual(result.newCustomizations["editorError.border"], "#ff0000");
      assert.strictEqual(result.newCustomizations["editorError.foreground"], "#ff0000");
    });
  });

  describe("edge cases", () => {
    it("should handle invalid JSON in invisibleSquiggles.originalColors", () => {
      const consoleErrorStub = sinon.stub(console, "error");
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
      assert.strictEqual(result.newCustomizations["editorError.background"], undefined);

      assert.ok(
        consoleErrorStub.called,
        "Expected toggleSquigglesCore to log an error"
      );
      assert.strictEqual(
        consoleErrorStub.firstCall.args[0],
        "Error parsing saved colors JSON:"
      );
      // Cleanup handled by afterEach -> sinon.restore()
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
      assert.strictEqual(result.newCustomizations["editorError.background"], "#ff0000");
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
      assert.strictEqual(result.newCustomizations["custom.setting"], "custom-value");
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

  describe("configuration change scenarios", () => {
    it("should restore previously transparent colors when their hide flag is disabled", () => {
      // Scenario:
      // 1. User toggles with hideErrors=true, hideWarnings=true → both transparent
      // 2. User changes config to hideErrors=false
      // 3. User toggles again → Warning restores, AND Error should also restore

      // Step 1: Initial toggle with both enabled
      const step1Customizations: Record<string, string | undefined> = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
        "editorWarning.background": "#ffaa00",
        "editorWarning.border": "#ffaa00",
        "editorWarning.foreground": "#ffaa00",
      };

      const step1Config: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: true,
        hideInfo: false,
        hideHint: false,
      };

      const result1 = toggleSquigglesCore(step1Customizations, step1Config);
      assert.strictEqual(result1.isAlreadyTransparent, false);
      assert.strictEqual(
        result1.newCustomizations["editorError.background"],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result1.newCustomizations["editorWarning.background"],
        TRANSPARENT_COLOR
      );

      // Step 2: User changes config to hideErrors=false
      // Step 3: Toggle again with new config
      const step3Config: ToggleSquigglesConfig = {
        hideErrors: false, // Changed!
        hideWarnings: true,
        hideInfo: false,
        hideHint: false,
      };

      const result2 = toggleSquigglesCore(result1.newCustomizations, step3Config);

      // Warning was transparent and is still configured - should restore
      assert.strictEqual(result2.isAlreadyTransparent, true);
      assert.strictEqual(
        result2.newCustomizations["editorWarning.background"],
        "#ffaa00"
      );

      // Error was transparent but is NO LONGER configured - should ALSO restore
      // This is the bug fix: previously Error would remain #00000000
      assert.strictEqual(
        result2.newCustomizations["editorError.background"],
        "#ff0000",
        "Error colors should be restored even though hideErrors is now false"
      );
      assert.strictEqual(result2.newCustomizations["editorError.border"], "#ff0000");
      assert.strictEqual(
        result2.newCustomizations["editorError.foreground"],
        "#ff0000"
      );
    });

    it("should clear stale transparent colors when no stored original exists", () => {
      // Edge case: transparent color exists but wasn't in originalColors
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "editorWarning.background": TRANSPARENT_COLOR,
        "editorWarning.border": TRANSPARENT_COLOR,
        "editorWarning.foreground": TRANSPARENT_COLOR,
        // originalColors only has Warning (simulating a partial save)
        "invisibleSquiggles.originalColors": JSON.stringify({
          "editorWarning.background": "#ffaa00",
          "editorWarning.border": "#ffaa00",
          "editorWarning.foreground": "#ffaa00",
        }),
      };

      const config: ToggleSquigglesConfig = {
        hideErrors: false, // Not configured
        hideWarnings: true,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Warning restores from stored colors
      assert.strictEqual(
        result.newCustomizations["editorWarning.background"],
        "#ffaa00"
      );

      // Error has no stored original, so should be cleared (undefined)
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        undefined,
        "Stale transparent colors with no stored original should be cleared"
      );
    });

    it("should restore all colors when ALL hide flags are disabled while invisible", () => {
      // BUG SCENARIO:
      // 1. User toggles with all types checked → all transparent
      // 2. User unchecks ALL hide flags while invisible
      // 3. User toggles → should restore, but currently returns unchanged (stuck transparent)

      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
        "editorWarning.background": "#ffaa00",
        "editorWarning.border": "#ffaa00",
        "editorWarning.foreground": "#ffaa00",
      };

      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "editorWarning.background": TRANSPARENT_COLOR,
        "editorWarning.border": TRANSPARENT_COLOR,
        "editorWarning.foreground": TRANSPARENT_COLOR,
        "invisibleSquiggles.originalColors": JSON.stringify(originalColors),
      };

      // ALL hide flags disabled while squiggles are invisible
      const config: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Should detect we're in "invisible" state via originalColors and restore
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        "#ff0000",
        "Error colors should be restored even when all hide flags are disabled"
      );
      assert.strictEqual(
        result.newCustomizations["editorWarning.background"],
        "#ffaa00",
        "Warning colors should be restored even when all hide flags are disabled"
      );
      // originalColors should be cleared after restore
      assert.strictEqual(
        result.newCustomizations["invisibleSquiggles.originalColors"],
        null,
        "originalColors should be cleared after restore"
      );
    });

    it("should use originalColors presence to detect invisible state, not checkbox state", () => {
      // The presence of originalColors indicates we're in "invisible" state
      // Checkbox state should be ignored during restore - restore everything in originalColors

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
      };

      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        "editorWarning.background": TRANSPARENT_COLOR,
        "editorWarning.border": TRANSPARENT_COLOR,
        "editorWarning.foreground": TRANSPARENT_COLOR,
        "editorInfo.background": TRANSPARENT_COLOR,
        "editorInfo.border": TRANSPARENT_COLOR,
        "editorInfo.foreground": TRANSPARENT_COLOR,
        "invisibleSquiggles.originalColors": JSON.stringify(originalColors),
      };

      // Only one hide flag enabled - but we should still restore ALL stored colors
      const config: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: true, // Only this one checked
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // ALL colors from originalColors should be restored, not just Warning
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        "#ff0000",
        "Error should restore from originalColors regardless of hideErrors setting"
      );
      assert.strictEqual(
        result.newCustomizations["editorWarning.background"],
        "#ffaa00",
        "Warning should restore from originalColors"
      );
      assert.strictEqual(
        result.newCustomizations["editorInfo.background"],
        "#00aaff",
        "Info should restore from originalColors regardless of hideInfo setting"
      );
    });

    it("should return isAlreadyTransparent=true when restoring, even if new hide flags were enabled while hidden", () => {
      // BUG SCENARIO:
      // 1. User toggles with hideErrors=true → Error transparent, originalColors stored
      // 2. User enables hideWarnings=true while hidden (Warning NOT transparent yet)
      // 3. User toggles → should RESTORE and return isAlreadyTransparent=true
      //
      // Previously, isAlreadyTransparent checked transparentColorsToApply (Error+Warning),
      // but Warning wasn't transparent, so it returned false even though we were restoring.
      // This caused the status bar to incorrectly show "hidden" after a restore.

      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
        "editorError.foreground": "#ff0000",
      };

      const customizations: Record<string, string | undefined> = {
        // Error IS transparent (was hidden in step 1)
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        // Warning is NOT transparent (user just enabled hideWarnings in step 2)
        "editorWarning.background": "#ffaa00",
        "editorWarning.border": "#ffaa00",
        "editorWarning.foreground": "#ffaa00",
        "invisibleSquiggles.originalColors": JSON.stringify(originalColors),
      };

      // Both hide flags enabled - but Warning wasn't hidden when toggle happened
      const config: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: true, // Newly enabled while hidden
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Should restore Error colors
      assert.strictEqual(
        result.newCustomizations["editorError.background"],
        "#ff0000",
        "Error should be restored"
      );

      // isAlreadyTransparent should be TRUE because we're in restore mode
      // (originalColors existed, so we restore regardless of current transparency)
      assert.strictEqual(
        result.isAlreadyTransparent,
        true,
        "isAlreadyTransparent should be true when restoring, so status bar shows 'visible'"
      );

      // originalColors should be cleared
      assert.strictEqual(
        result.newCustomizations["invisibleSquiggles.originalColors"],
        null,
        "originalColors should be cleared after restore"
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
      const result2 = toggleSquigglesCore(result1.newCustomizations, hideSquiggles);
      assert.strictEqual(result2.isAlreadyTransparent, true);

      // Simulate third toggle (hide again)
      const result3 = toggleSquigglesCore(result2.newCustomizations, hideSquiggles);
      assert.strictEqual(result3.isAlreadyTransparent, false);

      // Each toggle should produce valid state
      assert.ok(result1.newCustomizations);
      assert.ok(result2.newCustomizations);
      assert.ok(result3.newCustomizations);
    });
  });
});

describe("restoreAndCleanup", () => {
  describe("when originalColors key exists with valid JSON", () => {
    it("should restore original colors and remove the key", () => {
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorError.border": "#ff0000",
      };
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR,
        "editorError.foreground": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: JSON.stringify(originalColors),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result, "Should return a result");
      assert.strictEqual(result!["editorError.background"], "#ff0000");
      assert.strictEqual(result!["editorError.border"], "#ff0000");
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
    });

    it("should clear transparent colors not in storedColors", () => {
      const originalColors = {
        "editorError.background": "#ff0000",
      };
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorError.border": TRANSPARENT_COLOR, // Not in originalColors
        "editorError.foreground": TRANSPARENT_COLOR, // Not in originalColors
        [ORIGINAL_COLORS_KEY]: JSON.stringify(originalColors),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result!["editorError.background"], "#ff0000");
      assert.strictEqual(result!["editorError.border"], undefined);
      assert.strictEqual(result!["editorError.foreground"], undefined);
    });

    it("should preserve non-squiggle customizations", () => {
      const originalColors = { "editorError.background": "#ff0000" };
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "custom.setting": "custom-value",
        [ORIGINAL_COLORS_KEY]: JSON.stringify(originalColors),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result!["custom.setting"], "custom-value");
    });
  });

  describe("when originalColors key is missing or invalid", () => {
    it("should return null when key does not exist", () => {
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
      };

      const result = restoreAndCleanup(customizations);

      assert.strictEqual(result, null);
    });

    it("should clean up null key and return cleaned object", () => {
      const customizations: Record<string, string | null | undefined> = {
        "editorError.background": "#ff0000",
        [ORIGINAL_COLORS_KEY]: null,
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
      assert.strictEqual(result!["editorError.background"], "#ff0000");
    });

    it("should handle invalid JSON gracefully", () => {
      const consoleErrorStub = sinon.stub(console, "error");
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: "invalid json{",
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      // Should clear transparent colors (no valid stored colors to restore)
      assert.strictEqual(result!["editorError.background"], undefined);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
      assert.ok(consoleErrorStub.called);
      sinon.restore();
    });

    it("should clean up non-string originalColors value", () => {
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: 123 as any,
      };

      const result = restoreAndCleanup(customizations);

      // Non-string value means key exists but is invalid - should clean it up
      assert.ok(result);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
      // Transparent color preserved (no valid colors to restore from)
      assert.strictEqual(result!["editorError.background"], TRANSPARENT_COLOR);
    });
  });

  describe("edge cases", () => {
    it("should handle empty originalColors object", () => {
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: JSON.stringify({}),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      // No colors to restore, but transparent should be cleared
      assert.strictEqual(result!["editorError.background"], undefined);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
    });

    it("should handle all squiggle types", () => {
      const originalColors = {
        "editorError.background": "#ff0000",
        "editorWarning.background": "#ffaa00",
        "editorInfo.background": "#00aaff",
        "editorHint.foreground": "#00ff00",
      };
      const customizations: Record<string, string | undefined> = {
        "editorError.background": TRANSPARENT_COLOR,
        "editorWarning.background": TRANSPARENT_COLOR,
        "editorInfo.background": TRANSPARENT_COLOR,
        "editorHint.foreground": TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: JSON.stringify(originalColors),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result!["editorError.background"], "#ff0000");
      assert.strictEqual(result!["editorWarning.background"], "#ffaa00");
      assert.strictEqual(result!["editorInfo.background"], "#00aaff");
      assert.strictEqual(result!["editorHint.foreground"], "#00ff00");
    });
  });
});
