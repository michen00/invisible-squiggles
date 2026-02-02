import * as assert from 'assert';
import { describe, it } from 'mocha';
import {
  areSquigglesCurrentlyTransparent,
  COLOR_PARTS_BY_SQUIGGLE_TYPE,
  SQUIGGLE_TYPES,
  ToggleSquigglesConfig,
  TRANSPARENT_COLOR,
} from '../../extension';

describe('areSquigglesCurrentlyTransparent', () => {
  // Helper to build a full set of transparent colors for all squiggle types
  function buildAllTransparentColors(): Record<string, string> {
    const colors: Record<string, string> = {};
    for (const type of SQUIGGLE_TYPES) {
      for (const part of COLOR_PARTS_BY_SQUIGGLE_TYPE[type]) {
        colors[`editor${type}.${part}`] = TRANSPARENT_COLOR;
      }
    }
    return colors;
  }

  // Helper to build transparent colors for specific types only
  function buildTransparentColorsForTypes(
    types: (typeof SQUIGGLE_TYPES)[number][]
  ): Record<string, string> {
    const colors: Record<string, string> = {};
    for (const type of types) {
      for (const part of COLOR_PARTS_BY_SQUIGGLE_TYPE[type]) {
        colors[`editor${type}.${part}`] = TRANSPARENT_COLOR;
      }
    }
    return colors;
  }

  const ALL_ENABLED: ToggleSquigglesConfig = {
    hideErrors: true,
    hideWarnings: true,
    hideInfo: true,
    hideHint: true,
  };

  const NONE_ENABLED: ToggleSquigglesConfig = {
    hideErrors: false,
    hideWarnings: false,
    hideInfo: false,
    hideHint: false,
  };

  const ERRORS_ONLY: ToggleSquigglesConfig = {
    hideErrors: true,
    hideWarnings: false,
    hideInfo: false,
    hideHint: false,
  };

  const ERRORS_AND_WARNINGS: ToggleSquigglesConfig = {
    hideErrors: true,
    hideWarnings: true,
    hideInfo: false,
    hideHint: false,
  };

  describe('when all types are configured', () => {
    it('should return true when all configured colors are transparent', () => {
      const customizations = buildAllTransparentColors();
      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ALL_ENABLED),
        true
      );
    });

    it('should return false when customizations is empty', () => {
      assert.strictEqual(areSquigglesCurrentlyTransparent({}, ALL_ENABLED), false);
    });

    it('should return false when any configured color is not transparent', () => {
      const customizations = buildAllTransparentColors();
      customizations['editorError.background'] = '#ff0000';

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ALL_ENABLED),
        false
      );
    });
  });

  describe('when only some types are configured', () => {
    it('should return true when only Error is configured and Error is transparent', () => {
      const customizations = buildTransparentColorsForTypes(['Error']);

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ERRORS_ONLY),
        true
      );
    });

    it('should return true when Error+Warning configured and both are transparent', () => {
      const customizations = buildTransparentColorsForTypes(['Error', 'Warning']);

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ERRORS_AND_WARNINGS),
        true
      );
    });

    it('should return false when Error is configured but not transparent', () => {
      const customizations: Record<string, string> = {
        'editorError.background': '#ff0000',
        'editorError.border': '#ff0000',
        'editorError.foreground': '#ff0000',
      };

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ERRORS_ONLY),
        false
      );
    });

    it('should ignore unconfigured types when checking transparency', () => {
      // Only Error is transparent, Warning is not, but Warning is not configured
      const customizations = buildTransparentColorsForTypes(['Error']);
      customizations['editorWarning.background'] = '#ffaa00'; // Not transparent

      // Should still return true because Warning is not in the config
      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ERRORS_ONLY),
        true
      );
    });

    it('should return false when one of multiple configured types is not transparent', () => {
      const customizations = buildTransparentColorsForTypes(['Error']); // Error transparent
      customizations['editorWarning.background'] = '#ffaa00'; // Warning not transparent

      // Error is transparent, Warning is not
      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ERRORS_AND_WARNINGS),
        false
      );
    });
  });

  describe('when no types are configured', () => {
    it('should return null when all hide flags are false', () => {
      const customizations = buildAllTransparentColors();

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, NONE_ENABLED),
        null
      );
    });

    it('should return null even when customizations is empty', () => {
      assert.strictEqual(areSquigglesCurrentlyTransparent({}, NONE_ENABLED), null);
    });
  });

  describe('case sensitivity', () => {
    it('should handle case-insensitive color comparison', () => {
      const customizations = buildAllTransparentColors();
      // Mix cases - should still match
      customizations['editorError.background'] = '#00000000'; // lowercase

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ALL_ENABLED),
        true
      );
    });
  });

  describe('edge cases', () => {
    it('should return false when colors are null', () => {
      const customizations: Record<string, string | null> = {};
      for (const type of SQUIGGLE_TYPES) {
        for (const part of COLOR_PARTS_BY_SQUIGGLE_TYPE[type]) {
          customizations[`editor${type}.${part}`] = null;
        }
      }

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ALL_ENABLED),
        false
      );
    });

    it('should return false when colors are undefined', () => {
      const customizations: Record<string, string | undefined> = {};
      for (const type of SQUIGGLE_TYPES) {
        for (const part of COLOR_PARTS_BY_SQUIGGLE_TYPE[type]) {
          customizations[`editor${type}.${part}`] = undefined;
        }
      }

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ALL_ENABLED),
        false
      );
    });

    it('should ignore extra keys in customizations', () => {
      const customizations = buildAllTransparentColors();
      customizations['custom.setting'] = '#ff0000';
      customizations['editor.background'] = '#000000';
      customizations['invisibleSquiggles.originalColors'] = '{}';

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, ALL_ENABLED),
        true
      );
    });

    it('should handle Hint correctly (no background property)', () => {
      const HINT_ONLY: ToggleSquigglesConfig = {
        hideErrors: false,
        hideWarnings: false,
        hideInfo: false,
        hideHint: true,
      };

      // Hint only has border and foreground (no background)
      const customizations: Record<string, string> = {
        'editorHint.border': TRANSPARENT_COLOR,
        'editorHint.foreground': TRANSPARENT_COLOR,
      };

      assert.strictEqual(
        areSquigglesCurrentlyTransparent(customizations, HINT_ONLY),
        true
      );
    });
  });
});
