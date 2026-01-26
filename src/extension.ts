import * as vscode from "vscode";

export const TRANSPARENT_COLOR = "#00000000";
export const SQUIGGLE_TYPES = ["Error", "Hint", "Info", "Warning"] as const;

export const COLOR_PARTS_BY_SQUIGGLE_TYPE: Record<
  (typeof SQUIGGLE_TYPES)[number],
  ReadonlyArray<"background" | "border" | "foreground">
> = {
  // From VS Code's workbench color registry: Hint has no `editorHint.background`
  Error: ["background", "border", "foreground"],
  Hint: ["border", "foreground"],
  Info: ["background", "border", "foreground"],
  Warning: ["background", "border", "foreground"],
};

/**
 * Key used to store original colors in workbench.colorCustomizations.
 * Presence of this key indicates squiggles are currently hidden.
 */
export const ORIGINAL_COLORS_KEY = "invisibleSquiggles.originalColors";

/**
 * Stored data format for tracking hidden squiggle state.
 * - originalColors: colors that existed before we made them transparent
 * - transparentKeys: keys we set to transparent (for clearing on restore)
 */
interface StoredSquiggleData {
  originalColors: Record<string, string>;
  transparentKeys: string[];
}

/**
 * All squiggle color keys managed by this extension
 */
const ALL_SQUIGGLE_COLOR_KEYS = SQUIGGLE_TYPES.flatMap((type) =>
  COLOR_PARTS_BY_SQUIGGLE_TYPE[type].map((part) => `editor${type}.${part}`)
);

const TRANSPARENT_COLORS = Object.fromEntries(
  ALL_SQUIGGLE_COLOR_KEYS.map((key) => [key, TRANSPARENT_COLOR])
);

const HIDE_KEY_BY_TYPE: Record<
  (typeof SQUIGGLE_TYPES)[number],
  keyof ToggleSquigglesConfig
> = {
  Hint: "hideHint",
  Info: "hideInfo",
  Error: "hideErrors",
  Warning: "hideWarnings",
};

/**
 * Clears squiggle color keys that we made transparent.
 * Only clears keys in transparentKeys, leaving other customizations untouched.
 * @param customizations - The customizations object to modify
 * @param transparentKeys - The keys we set to transparent (to be cleared)
 */
function clearTransparentKeys(
  customizations: Record<string, string | null | undefined>,
  transparentKeys: string[]
): void {
  transparentKeys.forEach((key) => {
    customizations[key] = undefined;
  });
}

/**
 * Checks if configured squiggle colors are currently set to transparent.
 * Used to determine initial status bar state on activation.
 * @param currentCustomizations - Current workbench color customizations
 * @param hideSquiggles - Configuration for which squiggle types to hide
 * @returns true if all configured squiggle colors are transparent,
 *          false if any configured color is not transparent,
 *          null if no squiggle types are configured (all hide flags are false)
 */
export function areSquigglesCurrentlyTransparent(
  currentCustomizations: Record<string, string | null | undefined>,
  hideSquiggles: ToggleSquigglesConfig
): boolean | null {
  // Get color keys only for configured squiggle types
  const relevantKeys = SQUIGGLE_TYPES.flatMap((type) => {
    const hideKey = HIDE_KEY_BY_TYPE[type];
    return hideSquiggles[hideKey]
      ? COLOR_PARTS_BY_SQUIGGLE_TYPE[type].map((part) => `editor${type}.${part}`)
      : [];
  });

  // If nothing is configured, return null (caller decides what to do)
  if (relevantKeys.length === 0) {
    return null;
  }

  // Check if all relevant keys are transparent
  return relevantKeys.every(
    (key) => (currentCustomizations[key]?.toLowerCase() || "") === TRANSPARENT_COLOR
  );
}

let statusBarItem: vscode.StatusBarItem;

/**
 * Sets the status bar item text and tooltip based on visibility state
 * @param statusBarItem - The status bar item to update (for testability via dependency injection)
 * @param state - Whether squiggles are 'visible' or 'hidden'
 */
export function setStatus(
  statusBarItem: vscode.StatusBarItem | null | undefined,
  state: "visible" | "hidden"
): void {
  if (!statusBarItem) {
    return;
  }

  const icon = state === "visible" ? "$(eye)" : "$(eye-closed)";
  const action = state === "visible" ? "Hide" : "Show";

  statusBarItem.text = `Squiggles: ${icon}`;
  statusBarItem.tooltip = `${action} squiggles`;
}

/**
 * Internal wrapper that uses module-level statusBarItem
 */
function setStatusInternal(state: "visible" | "hidden"): void {
  setStatus(statusBarItem, state);
}

/**
 * Configuration interface for toggleSquigglesCore
 */
export interface ToggleSquigglesConfig {
  hideErrors: boolean;
  hideWarnings: boolean;
  hideInfo: boolean;
  hideHint: boolean;
}

/**
 * Result interface for toggleSquigglesCore
 */
export interface ToggleSquigglesResult {
  // VS Code can retain old workbench.colorCustomizations keys when updating objects.
  // - Color keys (e.g., editorError.background): set to `undefined` to clear
  // - Marker key (ORIGINAL_COLORS_KEY): set to `null` to mark for removal,
  //   then `restoreAndCleanup` converts to `undefined` on next activation
  newCustomizations: Record<string, string | null | undefined>;
  isAlreadyTransparent: boolean;
  shouldShowMessage: boolean;
}

/**
 * Core logic for toggling squiggles (testable without VSCode APIs)
 * @param currentCustomizations - Current workbench color customizations
 * @param hideSquiggles - Configuration for which squiggle types to hide
 * @returns Result containing new customizations and state information
 */
export function toggleSquigglesCore(
  currentCustomizations: Record<string, string | null | undefined>,
  hideSquiggles: ToggleSquigglesConfig
): ToggleSquigglesResult {
  const storedData = ((): StoredSquiggleData => {
    const storedJson = currentCustomizations[ORIGINAL_COLORS_KEY];
    if (!storedJson || typeof storedJson !== "string") {
      return { originalColors: {}, transparentKeys: [] };
    }
    try {
      const parsed: unknown = JSON.parse(storedJson);
      // Validate it's a plain object (not null, array, or primitive)
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { originalColors: {}, transparentKeys: [] };
      }
      const obj = parsed as Record<string, unknown>;
      // Check if it's the new format with originalColors and transparentKeys
      if ("originalColors" in obj && "transparentKeys" in obj) {
        return {
          originalColors: (obj.originalColors as Record<string, string>) ?? {},
          transparentKeys: (obj.transparentKeys as string[]) ?? [],
        };
      }
      // Invalid format
      return { originalColors: {}, transparentKeys: [] };
    } catch (error) {
      console.error("Error parsing saved colors JSON:", error);
      return { originalColors: {}, transparentKeys: [] };
    }
  })();

  const transparentColorsToApply = Object.fromEntries(
    SQUIGGLE_TYPES.flatMap((type) => {
      const hideKey = HIDE_KEY_BY_TYPE[type];
      return hideSquiggles[hideKey]
        ? Object.entries(TRANSPARENT_COLORS).filter(([key]) =>
            key.startsWith(`editor${type}`)
          )
        : [];
    })
  );

  // Detect "invisible" state: originalColors key exists (regardless of current checkbox settings)
  // This handles the case where user unchecks all flags while invisible
  // eslint-disable-next-line eqeqeq -- intentional: != null checks for both null and undefined
  const hasMarkerKey = currentCustomizations[ORIGINAL_COLORS_KEY] != null;

  // Fallback: detect transparency when marker key is missing (settings sync conflict, manual edit, legacy state)
  // If we find transparent colors without the marker, don't save them as "originals" - that would make restoration impossible
  const hasTransparentWithoutMarker =
    !hasMarkerKey &&
    areSquigglesCurrentlyTransparent(currentCustomizations, hideSquiggles) === true;

  // Combined invisible state: either has marker OR stuck in transparent state without marker
  const isInvisibleState = hasMarkerKey || hasTransparentWithoutMarker;

  // If no colors to apply AND not in invisible state, return unchanged
  if (Object.keys(transparentColorsToApply).length === 0 && !isInvisibleState) {
    return {
      newCustomizations: { ...currentCustomizations },
      isAlreadyTransparent: false,
      shouldShowMessage: false,
    };
  }

  const newCustomizations = { ...currentCustomizations };

  if (isInvisibleState) {
    if (hasMarkerKey) {
      // Normal restore: clear transparentKeys then apply originalColors
      clearTransparentKeys(newCustomizations, storedData.transparentKeys);
      Object.entries(storedData.originalColors).forEach(([key, value]) => {
        newCustomizations[key] = value;
      });
      // Mark marker key for removal. Using `null` signals "remove this key" to VS Code.
      newCustomizations[ORIGINAL_COLORS_KEY] = null;
    } else {
      // Stuck transparent without marker: clear all configured transparent colors
      // We don't know exactly what was made transparent, so clear configured squiggle types
      const keysToRecover = Object.keys(transparentColorsToApply);
      clearTransparentKeys(newCustomizations, keysToRecover);
    }
  } else {
    // Save current state and apply transparency
    const keysToMakeTransparent = Object.keys(transparentColorsToApply);
    const savedColors = Object.fromEntries(
      keysToMakeTransparent
        .filter((key) => typeof currentCustomizations[key] === "string")
        .map((key) => [key, currentCustomizations[key] as string])
    );

    const dataToStore: StoredSquiggleData = {
      originalColors: savedColors,
      transparentKeys: keysToMakeTransparent,
    };
    newCustomizations[ORIGINAL_COLORS_KEY] = JSON.stringify(dataToStore);
    Object.assign(newCustomizations, transparentColorsToApply);
  }

  // Return isInvisibleState to indicate whether we're restoring from the invisible state.
  // This correctly handles cases where hide flags change while colors are hidden.
  return {
    newCustomizations,
    isAlreadyTransparent: isInvisibleState,
    shouldShowMessage: true,
  };
}

/**
 * Restores original colors from stored JSON and clears transparent colors.
 * Used by activate() and deactivate() for cleanup.
 * @param currentCustomizations - Current workbench color customizations
 * @returns New customizations with colors restored and key removed, or null if no restoration needed
 */
export function restoreAndCleanup(
  currentCustomizations: Record<string, string | null | undefined>
): Record<string, string | null | undefined> | null {
  const storedJson = currentCustomizations[ORIGINAL_COLORS_KEY];

  // If no stored colors key, nothing to restore
  if (!storedJson || typeof storedJson !== "string") {
    // Check if key exists but is null (needs cleanup)
    if (ORIGINAL_COLORS_KEY in currentCustomizations) {
      const cleaned = { ...currentCustomizations };
      cleaned[ORIGINAL_COLORS_KEY] = undefined;
      return cleaned;
    }
    return null;
  }

  // Parse stored data
  let storedData: StoredSquiggleData = { originalColors: {}, transparentKeys: [] };
  try {
    const parsed: unknown = JSON.parse(storedJson);
    // Validate it's a plain object (not null, array, or primitive)
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      // Check if it's the new format with originalColors and transparentKeys
      if ("originalColors" in obj && "transparentKeys" in obj) {
        storedData = {
          originalColors: (obj.originalColors as Record<string, string>) ?? {},
          transparentKeys: (obj.transparentKeys as string[]) ?? [],
        };
      }
      // Invalid format - storedData stays empty
    }
  } catch (error) {
    console.error("Error parsing saved colors JSON during cleanup:", error);
  }

  const newCustomizations = { ...currentCustomizations };

  // Clear first: remove all keys we made transparent
  clearTransparentKeys(newCustomizations, storedData.transparentKeys);

  // Restore second: apply original colors (overwrites any that were just cleared)
  Object.entries(storedData.originalColors).forEach(([key, value]) => {
    newCustomizations[key] = value;
  });

  // Remove the marker key
  newCustomizations[ORIGINAL_COLORS_KEY] = undefined;

  return newCustomizations;
}

/**
 * VSCode API wrapper for toggleSquiggles
 */
async function toggleSquiggles(): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

  const hideSquiggles: ToggleSquigglesConfig = {
    hideErrors: settings.get<boolean>("hideErrors", true),
    hideWarnings: settings.get<boolean>("hideWarnings", true),
    hideInfo: settings.get<boolean>("hideInfo", true),
    hideHint: settings.get<boolean>("hideHint", true),
  };

  const currentCustomizations =
    config.get<Record<string, string | null | undefined>>("colorCustomizations") || {};

  const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);

  // Only update status bar if an actual toggle happened (not when all hide flags are disabled)
  if (result.shouldShowMessage) {
    setStatusInternal(result.isAlreadyTransparent ? "visible" : "hidden");
  }

  try {
    await config.update(
      "colorCustomizations",
      result.newCustomizations,
      vscode.ConfigurationTarget.Global
    );
    const showStatusBarMessage = settings.get<boolean>("showStatusBarMessage", false);
    if (showStatusBarMessage && result.shouldShowMessage) {
      const message = result.isAlreadyTransparent
        ? "Squiggles restored to previous visibility."
        : "Selected squiggles are now transparent.";
      vscode.window.setStatusBarMessage(message, 2500);
    }
  } catch (error) {
    console.error("Error toggling squiggle visibility:", error);
    vscode.window.showErrorMessage(
      "An error occurred while toggling squiggle settings. Check logs for details."
    );
  }
}

const COMMAND_TOGGLE_SQUIGGLES = "invisible-squiggles.toggle";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_TOGGLE_SQUIGGLES, toggleSquiggles)
  );

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = COMMAND_TOGGLE_SQUIGGLES;

  const config = vscode.workspace.getConfiguration("workbench");
  const currentCustomizations =
    config.get<Record<string, string | null | undefined>>("colorCustomizations") || {};

  // Always start visible: if originalColors key exists (from crash or unclean shutdown),
  // restore colors and remove the key
  const restoredCustomizations = restoreAndCleanup(currentCustomizations);
  if (restoredCustomizations) {
    // Fire and forget - don't block activation
    void config.update(
      "colorCustomizations",
      restoredCustomizations,
      vscode.ConfigurationTarget.Global
    );
  }

  // Status bar always shows visible on startup
  setStatusInternal("visible");

  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export async function deactivate(): Promise<void> {
  // Restore colors and clean up on shutdown/disable/uninstall
  try {
    const config = vscode.workspace.getConfiguration("workbench");
    const currentCustomizations =
      config.get<Record<string, string | null | undefined>>("colorCustomizations") ||
      {};

    const restoredCustomizations = restoreAndCleanup(currentCustomizations);
    if (restoredCustomizations) {
      await config.update(
        "colorCustomizations",
        restoredCustomizations,
        vscode.ConfigurationTarget.Global
      );
    }
  } catch (error) {
    console.error("Error restoring squiggle colors on deactivate:", error);
  }
}
