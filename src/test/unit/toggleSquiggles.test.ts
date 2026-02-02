import * as assert from 'assert';
import { afterEach, describe, it } from 'mocha';
import sinon from 'sinon';
import {
  ORIGINAL_COLORS_KEY,
  restoreAndCleanup,
  ToggleSquigglesConfig,
  toggleSquigglesCore,
  TRANSPARENT_COLOR,
} from '../../extension';

/** Helper to create the stored data format */
function makeStoredData(
  originalColors: Record<string, string>,
  transparentKeys: string[]
): string {
  return JSON.stringify({ originalColors, transparentKeys });
}

describe('toggleSquigglesCore', () => {
  // Ensure all sinon stubs/spies are restored after each test
  afterEach(() => {
    sinon.restore();
  });
  describe('basic toggle functionality', () => {
    it('should apply transparent colors when not already transparent', () => {
      const currentCustomizations: Record<string, string | undefined> = {
        'editorError.background': '#ff0000',
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(result.isAlreadyTransparent, false);
    });

    it('should restore colors when already transparent', () => {
      const originalColors = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
      };
      const transparentKeys = [
        'editorError.background',
        'editorError.border',
        'editorError.foreground',
      ];
      const currentCustomizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        'invisibleSquiggles.originalColors': makeStoredData(
          originalColors,
          transparentKeys
        ),
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      assert.strictEqual(result.isAlreadyTransparent, true);
      assert.strictEqual(result.newCustomizations['editorError.background'], '#ff0000');
      assert.strictEqual(result.newCustomizations['editorError.border'], '#ff0000');
      assert.strictEqual(result.newCustomizations['editorError.foreground'], '#ff0000');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON in invisibleSquiggles.originalColors', () => {
      const consoleErrorStub = sinon.stub(console, 'error');
      const currentCustomizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        'invisibleSquiggles.originalColors': 'invalid json{',
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
      // Should still restore (but with empty stored colors, so nothing to clear)
      assert.strictEqual(result.isAlreadyTransparent, true);
      // Transparent colors remain because transparentKeys is empty (invalid JSON)
      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR
      );

      assert.ok(
        consoleErrorStub.called,
        'Expected toggleSquigglesCore to log an error'
      );
      assert.strictEqual(
        consoleErrorStub.firstCall.args[0],
        'Error parsing saved colors JSON:'
      );
      // Cleanup handled by afterEach -> sinon.restore()
    });

    describe('should handle JSON primitive in originalColors (manual edit edge case)', () => {
      // If someone manually edits settings to put a JSON primitive instead of object,
      // the code should handle it gracefully without throwing TypeError on `in` operator
      const testCases = [
        { value: '"hello"', description: 'string' },
        { value: '123', description: 'number' },
        { value: 'true', description: 'boolean' },
        { value: 'null', description: 'null' },
        { value: '[1, 2, 3]', description: 'array' },
      ];

      testCases.forEach(({ value, description }) => {
        it(`handles ${description}`, () => {
          const currentCustomizations: Record<string, string | undefined> = {
            'editorError.background': TRANSPARENT_COLOR,
            'editorError.border': TRANSPARENT_COLOR,
            'editorError.foreground': TRANSPARENT_COLOR,
            'invisibleSquiggles.originalColors': value,
          };

          const hideSquiggles: ToggleSquigglesConfig = {
            hideErrors: true,
            hideWarnings: false,
            hideInfo: false,
            hideHint: false,
          };

          // Should not throw TypeError
          const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);
          assert.ok(result, `Should handle ${description} without crashing`);
          // Should treat as invisible state (marker key exists) and restore
          assert.strictEqual(
            result.isAlreadyTransparent,
            true,
            `Should detect invisible state for ${description}`
          );
          // Transparent colors remain because transparentKeys is empty (invalid format)
          assert.strictEqual(
            result.newCustomizations['editorError.background'],
            TRANSPARENT_COLOR,
            `Should preserve transparent colors for ${description} (no transparentKeys to clear)`
          );
        });
      });
    });

    it('should handle missing configuration values (use defaults)', () => {
      const currentCustomizations: Record<string, string | undefined> = {
        'editorError.background': '#ff0000',
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
      assert.strictEqual(result.newCustomizations['editorError.background'], '#ff0000');
    });

    it('should handle conflicting color customizations (merge correctly)', () => {
      const currentCustomizations: Record<string, string | undefined> = {
        'editorError.background': '#ff0000',
        'editorWarning.background': '#ffaa00',
        'custom.setting': 'custom-value', // Existing customization
      };

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

      // Should preserve existing customizations
      assert.strictEqual(result.newCustomizations['custom.setting'], 'custom-value');
      // Should apply transparency to Error
      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR
      );
      // Should preserve Warning
      assert.strictEqual(
        result.newCustomizations['editorWarning.background'],
        '#ffaa00'
      );
    });
  });

  describe('configuration change scenarios', () => {
    it('should restore previously transparent colors when their hide flag is disabled', () => {
      // Scenario:
      // 1. User toggles with hideErrors=true, hideWarnings=true → both transparent
      // 2. User changes config to hideErrors=false
      // 3. User toggles again → Warning restores, AND Error should also restore

      // Step 1: Initial toggle with both enabled
      const step1Customizations: Record<string, string | undefined> = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
        'editorWarning.background': '#ffaa00',
        'editorWarning.border': '#ffaa00',
        'editorWarning.foreground': '#ffaa00',
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
        result1.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result1.newCustomizations['editorWarning.background'],
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
        result2.newCustomizations['editorWarning.background'],
        '#ffaa00'
      );

      // Error was transparent but is NO LONGER configured - should ALSO restore
      // This is the bug fix: previously Error would remain #00000000
      assert.strictEqual(
        result2.newCustomizations['editorError.background'],
        '#ff0000',
        'Error colors should be restored even though hideErrors is now false'
      );
      assert.strictEqual(result2.newCustomizations['editorError.border'], '#ff0000');
      assert.strictEqual(
        result2.newCustomizations['editorError.foreground'],
        '#ff0000'
      );
    });

    it('should clear transparent colors in transparentKeys even if not in originalColors', () => {
      // Edge case: a key is in transparentKeys but not in originalColors
      // (user had no color before, we made it transparent, now we restore)
      const originalColors = {
        'editorWarning.background': '#ffaa00',
        // No Error colors in originals (user had none before hiding)
      };
      const transparentKeys = [
        'editorError.background',
        'editorError.border',
        'editorError.foreground',
        'editorWarning.background',
        'editorWarning.border',
        'editorWarning.foreground',
      ];
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        'editorWarning.background': TRANSPARENT_COLOR,
        'editorWarning.border': TRANSPARENT_COLOR,
        'editorWarning.foreground': TRANSPARENT_COLOR,
        'invisibleSquiggles.originalColors': makeStoredData(
          originalColors,
          transparentKeys
        ),
      };

      const config: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: true,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Warning restores from stored colors
      assert.strictEqual(
        result.newCustomizations['editorWarning.background'],
        '#ffaa00'
      );

      // Error was in transparentKeys but not in originalColors, so it's cleared (undefined)
      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        undefined,
        'Transparent colors with no stored original should be cleared'
      );
    });

    it('should restore all colors when ALL hide flags are disabled while invisible', () => {
      // BUG SCENARIO:
      // 1. User toggles with all types checked → all transparent
      // 2. User unchecks ALL hide flags while invisible
      // 3. User toggles → should restore, but currently returns unchanged (stuck transparent)

      const originalColors = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
        'editorWarning.background': '#ffaa00',
        'editorWarning.border': '#ffaa00',
        'editorWarning.foreground': '#ffaa00',
      };
      const transparentKeys = [
        'editorError.background',
        'editorError.border',
        'editorError.foreground',
        'editorWarning.background',
        'editorWarning.border',
        'editorWarning.foreground',
      ];

      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        'editorWarning.background': TRANSPARENT_COLOR,
        'editorWarning.border': TRANSPARENT_COLOR,
        'editorWarning.foreground': TRANSPARENT_COLOR,
        'invisibleSquiggles.originalColors': makeStoredData(
          originalColors,
          transparentKeys
        ),
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
        result.newCustomizations['editorError.background'],
        '#ff0000',
        'Error colors should be restored even when all hide flags are disabled'
      );
      assert.strictEqual(
        result.newCustomizations['editorWarning.background'],
        '#ffaa00',
        'Warning colors should be restored even when all hide flags are disabled'
      );
      // Marker key is set to `null` to signal removal (restoreAndCleanup converts to undefined)
      assert.strictEqual(
        result.newCustomizations['invisibleSquiggles.originalColors'],
        null,
        'originalColors should be marked for removal after restore'
      );
    });

    it('should use originalColors presence to detect invisible state, not checkbox state', () => {
      // The presence of originalColors indicates we're in "invisible" state
      // Checkbox state should be ignored during restore - restore everything in originalColors

      const originalColors = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
        'editorWarning.background': '#ffaa00',
        'editorWarning.border': '#ffaa00',
        'editorWarning.foreground': '#ffaa00',
        'editorInfo.background': '#00aaff',
        'editorInfo.border': '#00aaff',
        'editorInfo.foreground': '#00aaff',
      };
      const transparentKeys = Object.keys(originalColors);

      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        'editorWarning.background': TRANSPARENT_COLOR,
        'editorWarning.border': TRANSPARENT_COLOR,
        'editorWarning.foreground': TRANSPARENT_COLOR,
        'editorInfo.background': TRANSPARENT_COLOR,
        'editorInfo.border': TRANSPARENT_COLOR,
        'editorInfo.foreground': TRANSPARENT_COLOR,
        'invisibleSquiggles.originalColors': makeStoredData(
          originalColors,
          transparentKeys
        ),
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
        result.newCustomizations['editorError.background'],
        '#ff0000',
        'Error should restore from originalColors regardless of hideErrors setting'
      );
      assert.strictEqual(
        result.newCustomizations['editorWarning.background'],
        '#ffaa00',
        'Warning should restore from originalColors'
      );
      assert.strictEqual(
        result.newCustomizations['editorInfo.background'],
        '#00aaff',
        'Info should restore from originalColors regardless of hideInfo setting'
      );
    });

    it('should return isAlreadyTransparent=true when restoring, even if new hide flags were enabled while hidden', () => {
      // BUG SCENARIO:
      // 1. User toggles with hideErrors=true → Error transparent, originalColors stored
      // 2. User enables hideWarnings=true while hidden (Warning NOT transparent yet)
      // 3. User toggles → should RESTORE and return isAlreadyTransparent=true
      //
      // Previously, isAlreadyTransparent checked transparentColorsToApply (Error+Warning),
      // but Warning wasn't transparent, so it returned false even though we were restoring.
      // This caused the status bar to incorrectly show "hidden" after a restore.

      const originalColors = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
      };
      const transparentKeys = [
        'editorError.background',
        'editorError.border',
        'editorError.foreground',
      ];

      const customizations: Record<string, string | undefined> = {
        // Error IS transparent (was hidden in step 1)
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        // Warning is NOT transparent (user just enabled hideWarnings in step 2)
        'editorWarning.background': '#ffaa00',
        'editorWarning.border': '#ffaa00',
        'editorWarning.foreground': '#ffaa00',
        'invisibleSquiggles.originalColors': makeStoredData(
          originalColors,
          transparentKeys
        ),
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
        result.newCustomizations['editorError.background'],
        '#ff0000',
        'Error should be restored'
      );

      // isAlreadyTransparent should be TRUE because we're in restore mode
      // (originalColors existed, so we restore regardless of current transparency)
      assert.strictEqual(
        result.isAlreadyTransparent,
        true,
        "isAlreadyTransparent should be true when restoring, so status bar shows 'visible'"
      );

      // Marker key is set to `null` to signal removal (restoreAndCleanup converts to undefined)
      assert.strictEqual(
        result.newCustomizations['invisibleSquiggles.originalColors'],
        null,
        'originalColors should be marked for removal after restore'
      );
    });

    it('should recover when transparent colors exist without marker key (settings sync conflict)', () => {
      // BUG SCENARIO (the fix for this test):
      // User has transparent squiggle colors but the marker key is missing
      // (e.g., settings sync conflict, manual edit, or legacy state)
      // Without the fix:
      // 1. Toggle treats state as visible (marker missing)
      // 2. Saves transparent colors as "originals"
      // 3. Applies transparency again (no visible change)
      // 4. Now "originals" are transparent, making restoration impossible
      //
      // With the fix:
      // 1. Toggle detects transparency without marker
      // 2. Clears transparent colors (restores to default/visible)
      // 3. User can then toggle again to hide properly

      const customizations: Record<string, string | undefined> = {
        // Transparent colors WITHOUT the marker key
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        // NO invisibleSquiggles.originalColors key!
      };

      const config: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Should detect stuck transparent state and restore by clearing transparent colors
      assert.strictEqual(
        result.isAlreadyTransparent,
        true,
        'Should detect transparent state even without marker key'
      );

      // Transparent colors should be cleared (set to undefined) since there are no originals to restore
      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        undefined,
        'Transparent colors should be cleared when no originals exist'
      );
      assert.strictEqual(
        result.newCustomizations['editorError.border'],
        undefined,
        'Transparent colors should be cleared when no originals exist'
      );
      assert.strictEqual(
        result.newCustomizations['editorError.foreground'],
        undefined,
        'Transparent colors should be cleared when no originals exist'
      );

      // Should NOT create a marker key since we're restoring, not hiding
      assert.ok(
        result.newCustomizations['invisibleSquiggles.originalColors'] === undefined ||
          result.newCustomizations['invisibleSquiggles.originalColors'] === null,
        'Should not create marker key when recovering from stuck state'
      );

      // User can now toggle again to hide properly
      const result2 = toggleSquigglesCore(result.newCustomizations, config);
      assert.strictEqual(
        result2.isAlreadyTransparent,
        false,
        'Second toggle should apply transparency normally'
      );
      assert.strictEqual(
        result2.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR,
        'Should apply transparent colors on second toggle'
      );
    });

    it('should not falsely detect stuck state when only some colors are transparent', () => {
      // Edge case: only SOME colors are transparent (partial transparency)
      // This should NOT trigger the recovery logic since it's not a "stuck" state
      // areSquigglesCurrentlyTransparent returns false when not ALL configured colors are transparent

      const customizations: Record<string, string | undefined> = {
        // Only background is transparent, border and foreground are not
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
        // NO marker key
      };

      const config: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Should NOT detect as stuck transparent state (not all colors are transparent)
      assert.strictEqual(
        result.isAlreadyTransparent,
        false,
        'Should not falsely detect stuck state when only some colors are transparent'
      );

      // Should save partial transparency as original and apply full transparency
      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result.newCustomizations['editorError.border'],
        TRANSPARENT_COLOR
      );
      assert.strictEqual(
        result.newCustomizations['editorError.foreground'],
        TRANSPARENT_COLOR
      );

      // Should have created marker key with the partial original
      assert.ok(
        result.newCustomizations['invisibleSquiggles.originalColors'],
        'Should create marker key when applying transparency'
      );
    });
  });

  describe('manual edits while squiggles are hidden', () => {
    it('should ignore non-transparent colors added manually while squiggles are hidden', () => {
      // BUG SCENARIO:
      // 1. User has default colors (no custom squiggle colors)
      // 2. User toggles OFF → originalColors is {}
      // 3. User manually adds editorError.background: "#00ff00" while squiggles are OFF
      // 4. User toggles ON → manual edit should be ignored/cleared
      // 5. Toggle OFF again → should not save the manual edit as "original"

      const hideSquiggles: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: false,
        hideInfo: false,
        hideHint: false,
      };

      // Step 1: Start with no custom colors
      const initialCustomizations: Record<string, string | undefined> = {};

      // Step 2: Toggle OFF
      const afterHide = toggleSquigglesCore(initialCustomizations, hideSquiggles);
      assert.strictEqual(
        afterHide.newCustomizations['editorError.background'],
        TRANSPARENT_COLOR
      );
      // originalColors should be empty since there were no colors to save
      const afterHideSavedData = JSON.parse(
        afterHide.newCustomizations[ORIGINAL_COLORS_KEY] as string
      );
      assert.deepStrictEqual(
        afterHideSavedData.originalColors,
        {},
        'originalColors should be empty'
      );
      assert.ok(
        afterHideSavedData.transparentKeys.length > 0,
        'transparentKeys should have entries'
      );

      // Step 3: User manually edits settings.json while squiggles are OFF
      const manuallyEdited = {
        ...afterHide.newCustomizations,
        'editorError.background': '#00ff00', // User added this color manually!
        'editorError.border': '#00ff00',
        'editorError.foreground': '#00ff00',
      };

      // Step 4: Toggle ON (should ignore/clear the manual edits)
      const afterRestore = toggleSquigglesCore(manuallyEdited, hideSquiggles);
      assert.strictEqual(
        afterRestore.isAlreadyTransparent,
        true,
        'Should detect invisible state and restore'
      );

      // Manual edits should be cleared since they weren't in originalColors
      assert.strictEqual(
        afterRestore.newCustomizations['editorError.background'],
        undefined,
        'Manually-added color should be cleared (not in originalColors)'
      );
      assert.strictEqual(
        afterRestore.newCustomizations['editorError.border'],
        undefined,
        'Manually-added color should be cleared (not in originalColors)'
      );
      assert.strictEqual(
        afterRestore.newCustomizations['editorError.foreground'],
        undefined,
        'Manually-added color should be cleared (not in originalColors)'
      );

      // Step 5: Toggle OFF again - should NOT save manual edits as originals
      const afterSecondHide = toggleSquigglesCore(
        afterRestore.newCustomizations,
        hideSquiggles
      );
      const savedData = JSON.parse(
        afterSecondHide.newCustomizations[ORIGINAL_COLORS_KEY] as string
      );
      assert.deepStrictEqual(
        savedData.originalColors,
        {},
        'Should not have saved manual edits as original colors'
      );
    });

    it("should preserve manually-added colors that weren't made transparent by the extension", () => {
      // Scenario: User hides warnings, then manually adds error colors while hidden
      // On restore, manually-added error colors should be PRESERVED (not cleared)
      // because Error was never made transparent by the extension
      const originalColors = {
        'editorWarning.background': '#ffaa00',
      };
      const transparentKeys = [
        'editorWarning.background',
        'editorWarning.border',
        'editorWarning.foreground',
      ];

      const customizations: Record<string, string | undefined> = {
        // Warning was made transparent by extension (should be restored)
        'editorWarning.background': TRANSPARENT_COLOR,
        'editorWarning.border': TRANSPARENT_COLOR,
        'editorWarning.foreground': TRANSPARENT_COLOR,
        // Error was manually added while hidden (should be PRESERVED)
        'editorError.background': '#00ff00',
        'editorError.border': '#00ff00',
        'editorError.foreground': '#00ff00',
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      };

      const config: ToggleSquigglesConfig = {
        hideErrors: true,
        hideWarnings: true,
        hideInfo: false,
        hideHint: false,
      };

      const result = toggleSquigglesCore(customizations, config);

      // Warning should be restored from originalColors
      assert.strictEqual(
        result.newCustomizations['editorWarning.background'],
        '#ffaa00',
        'Original colors should be restored'
      );

      // Error colors (manually added) should be PRESERVED (the fix!)
      assert.strictEqual(
        result.newCustomizations['editorError.background'],
        '#00ff00',
        'Manually-added colors should be preserved'
      );
      assert.strictEqual(
        result.newCustomizations['editorError.border'],
        '#00ff00',
        'Manually-added colors should be preserved'
      );
      assert.strictEqual(
        result.newCustomizations['editorError.foreground'],
        '#00ff00',
        'Manually-added colors should be preserved'
      );
    });
  });

  describe('preserving unrelated custom colors', () => {
    it('should preserve custom colors for squiggle types not being hidden', () => {
      // User has custom error colors but only wants to hide warnings
      const customizations: Record<string, string | undefined> = {
        'editorError.foreground': '#ff0000', // Custom error color - should NOT be touched
        'editorWarning.background': '#ffaa00',
      };

      const config: ToggleSquigglesConfig = {
        hideErrors: false, // NOT hiding errors
        hideWarnings: true,
        hideInfo: false,
        hideHint: false,
      };

      // Toggle to hide warnings
      const afterHide = toggleSquigglesCore(customizations, config);

      // Custom error color should be preserved
      assert.strictEqual(
        afterHide.newCustomizations['editorError.foreground'],
        '#ff0000',
        'Custom error color should be preserved when hiding warnings'
      );

      // Toggle to restore
      const afterRestore = toggleSquigglesCore(afterHide.newCustomizations, config);

      // Custom error color should STILL be preserved (this is the bug)
      assert.strictEqual(
        afterRestore.newCustomizations['editorError.foreground'],
        '#ff0000',
        'Custom error color should be preserved after restoring warnings'
      );
    });
  });

  describe('concurrent execution simulation', () => {
    it('should handle multiple rapid toggles correctly (last state wins)', () => {
      const initialCustomizations: Record<string, string | undefined> = {
        'editorError.background': '#ff0000',
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

describe('restoreAndCleanup', () => {
  describe('when originalColors key exists with valid JSON', () => {
    it('should restore original colors and remove the key', () => {
      const originalColors = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
      };
      const transparentKeys = [
        'editorError.background',
        'editorError.border',
        'editorError.foreground',
      ];
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR,
        'editorError.foreground': TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result, 'Should return a result');
      assert.strictEqual(result!['editorError.background'], '#ff0000');
      assert.strictEqual(result!['editorError.border'], '#ff0000');
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
    });

    it('should clear transparent colors not in originalColors', () => {
      const originalColors = {
        'editorError.background': '#ff0000',
      };
      const transparentKeys = [
        'editorError.background',
        'editorError.border',
        'editorError.foreground',
      ];
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorError.border': TRANSPARENT_COLOR, // Not in originalColors but in transparentKeys
        'editorError.foreground': TRANSPARENT_COLOR, // Not in originalColors but in transparentKeys
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result!['editorError.background'], '#ff0000');
      assert.strictEqual(result!['editorError.border'], undefined);
      assert.strictEqual(result!['editorError.foreground'], undefined);
    });

    it('should preserve non-squiggle customizations', () => {
      const originalColors = { 'editorError.background': '#ff0000' };
      const transparentKeys = ['editorError.background'];
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'custom.setting': 'custom-value',
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result!['custom.setting'], 'custom-value');
    });
  });

  describe('when originalColors key is missing or invalid', () => {
    it('should return null when key does not exist', () => {
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
      };

      const result = restoreAndCleanup(customizations);

      assert.strictEqual(result, null);
    });

    it('should clean up null key and return cleaned object', () => {
      const customizations: Record<string, string | null | undefined> = {
        'editorError.background': '#ff0000',
        [ORIGINAL_COLORS_KEY]: null,
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
      assert.strictEqual(result!['editorError.background'], '#ff0000');
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleErrorStub = sinon.stub(console, 'error');
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: 'invalid json{',
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      // Transparent colors remain (transparentKeys is empty due to invalid JSON)
      assert.strictEqual(result!['editorError.background'], TRANSPARENT_COLOR);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
      assert.ok(consoleErrorStub.called);
      sinon.restore();
    });

    it('should clean up non-string originalColors value', () => {
      const customizations = {
        'editorError.background': TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: 123,
      } as unknown as Record<string, string | undefined>;

      const result = restoreAndCleanup(customizations);

      // Non-string value means key exists but is invalid - should clean it up
      assert.ok(result);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
      // Transparent color preserved (no valid colors to restore from)
      assert.strictEqual(result!['editorError.background'], TRANSPARENT_COLOR);
    });
  });

  describe('edge cases', () => {
    describe('should handle JSON primitive in originalColors (manual edit edge case)', () => {
      // If someone manually edits settings to put a JSON primitive instead of object,
      // the code should handle it gracefully without throwing TypeError on `in` operator
      const testCases = [
        { value: '"hello"', description: 'string' },
        { value: '123', description: 'number' },
        { value: 'true', description: 'boolean' },
        { value: 'null', description: 'null' },
        { value: '[1, 2, 3]', description: 'array' },
      ];

      testCases.forEach(({ value, description }) => {
        it(`handles ${description}`, () => {
          const customizations: Record<string, string | undefined> = {
            'editorError.background': TRANSPARENT_COLOR,
            [ORIGINAL_COLORS_KEY]: value,
          };

          // Should not throw TypeError
          const result = restoreAndCleanup(customizations);
          assert.ok(result, `Should return result for ${description}`);
          // Marker key should be cleared
          assert.strictEqual(
            result![ORIGINAL_COLORS_KEY],
            undefined,
            `Should clear marker key for ${description}`
          );
          // Transparent colors remain (transparentKeys is empty due to invalid format)
          assert.strictEqual(
            result!['editorError.background'],
            TRANSPARENT_COLOR,
            `Should preserve transparent colors for ${description} (no transparentKeys to clear)`
          );
        });
      });
    });

    it('should handle empty stored data', () => {
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: makeStoredData({}, []),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      // Transparent color remains (no transparentKeys to clear)
      assert.strictEqual(result!['editorError.background'], TRANSPARENT_COLOR);
      assert.strictEqual(result![ORIGINAL_COLORS_KEY], undefined);
    });

    it('should handle all squiggle types', () => {
      const originalColors = {
        'editorError.background': '#ff0000',
        'editorWarning.background': '#ffaa00',
        'editorInfo.background': '#00aaff',
        'editorHint.foreground': '#00ff00',
      };
      const transparentKeys = Object.keys(originalColors);
      const customizations: Record<string, string | undefined> = {
        'editorError.background': TRANSPARENT_COLOR,
        'editorWarning.background': TRANSPARENT_COLOR,
        'editorInfo.background': TRANSPARENT_COLOR,
        'editorHint.foreground': TRANSPARENT_COLOR,
        [ORIGINAL_COLORS_KEY]: makeStoredData(originalColors, transparentKeys),
      };

      const result = restoreAndCleanup(customizations);

      assert.ok(result);
      assert.strictEqual(result!['editorError.background'], '#ff0000');
      assert.strictEqual(result!['editorWarning.background'], '#ffaa00');
      assert.strictEqual(result!['editorInfo.background'], '#00aaff');
      assert.strictEqual(result!['editorHint.foreground'], '#00ff00');
    });
  });
});
