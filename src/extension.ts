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
  // Setting a color key to `undefined` explicitly clears that customization.
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
  const storedColors = (() => {
    const storedJson = currentCustomizations[ORIGINAL_COLORS_KEY];
    if (!storedJson || typeof storedJson !== "string") {
      return {};
    }
    try {
      return JSON.parse(storedJson);
    } catch (error) {
      console.error("Error parsing saved colors JSON:", error);
      return {};
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
  const isInvisibleState =
    ORIGINAL_COLORS_KEY in currentCustomizations &&
    currentCustomizations[ORIGINAL_COLORS_KEY] !== null &&
    currentCustomizations[ORIGINAL_COLORS_KEY] !== undefined;

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
    // Restore ALL colors from storedColors, regardless of current checkbox settings
    Object.keys(storedColors).forEach((key) => {
      const storedValue = (storedColors as Record<string, unknown>)[key];
      if (typeof storedValue === "string") {
        newCustomizations[key] = storedValue;
      }
    });

    // Clear any transparent squiggle colors not in storedColors
    ALL_SQUIGGLE_COLOR_KEYS.forEach((key) => {
      if (
        typeof newCustomizations[key] === "string" &&
        newCustomizations[key]!.toLowerCase() === TRANSPARENT_COLOR &&
        !(key in storedColors)
      ) {
        newCustomizations[key] = undefined;
      }
    });

    // Explicitly clear this marker key. VS Code may retain old object keys otherwise.
    newCustomizations[ORIGINAL_COLORS_KEY] = null;
  } else {
    // Save current state and apply transparency
    const savedColors = Object.fromEntries(
      Object.keys(transparentColorsToApply)
        .filter((key) => typeof currentCustomizations[key] === "string")
        .map((key) => [key, currentCustomizations[key] as string])
    );

    newCustomizations[ORIGINAL_COLORS_KEY] = JSON.stringify(savedColors);
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

  // Parse stored colors
  let storedColors: Record<string, string> = {};
  try {
    storedColors = JSON.parse(storedJson);
  } catch (error) {
    console.error("Error parsing saved colors JSON during cleanup:", error);
  }

  const newCustomizations = { ...currentCustomizations };

  // Restore original colors
  Object.entries(storedColors).forEach(([key, value]) => {
    newCustomizations[key] = value;
  });

  // Clear any transparent squiggle colors not in storedColors
  ALL_SQUIGGLE_COLOR_KEYS.forEach((key) => {
    if (
      typeof newCustomizations[key] === "string" &&
      newCustomizations[key]!.toLowerCase() === TRANSPARENT_COLOR &&
      !(key in storedColors)
    ) {
      newCustomizations[key] = undefined;
    }
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
      config.get<Record<string, string | null | undefined>>("colorCustomizations") || {};

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
