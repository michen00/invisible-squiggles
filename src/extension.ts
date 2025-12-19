import * as vscode from "vscode";

export const TRANSPARENT_COLOR = "#00000000";
const SQUIGGLE_TYPES = ["Hint", "Info", "Error", "Warning"] as const;

const TRANSPARENT_COLORS = Object.fromEntries(
  SQUIGGLE_TYPES.flatMap((type) => [
    [`editor${type}.background`, TRANSPARENT_COLOR],
    [`editor${type}.border`, TRANSPARENT_COLOR],
    [`editor${type}.foreground`, TRANSPARENT_COLOR],
  ])
);

let statusBarItem: vscode.StatusBarItem;

/**
 * Sets the status bar item text and tooltip based on visibility state
 * @param statusBarItem - The status bar item to update (for testability via dependency injection)
 * @param state - Whether squiggles are 'visible' or 'hidden'
 */
export function setStatus(
  statusBarItem: vscode.StatusBarItem | null | undefined,
  state: 'visible' | 'hidden'
): void {
  if (!statusBarItem) {
    return;
  }

  const icon = state === 'visible' ? '$(eye)' : '$(eye-closed)';
  const action = state === 'visible' ? 'Hide' : 'Show';

  statusBarItem.text = `Squiggles: ${icon}`;
  statusBarItem.tooltip = `${action} squiggles`;
}

/**
 * Internal wrapper that uses module-level statusBarItem
 */
function setStatusInternal(state: 'visible' | 'hidden'): void {
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
  newCustomizations: Record<string, string | undefined>;
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
  currentCustomizations: Record<string, string | undefined>,
  hideSquiggles: ToggleSquigglesConfig
): ToggleSquigglesResult {
  const storedColors = (() => {
    const storedJson = currentCustomizations["invisibleSquiggles.originalColors"];
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
      // Config keys use plural form: hideErrors, hideWarnings, etc.
      const hideKey = `hide${type}s` as keyof ToggleSquigglesConfig;
      return hideSquiggles[hideKey]
        ? Object.entries(TRANSPARENT_COLORS).filter(([key]) =>
            key.startsWith(`editor${type}`)
          )
        : [];
    })
  );

  // If no colors to apply, return current state unchanged
  if (Object.keys(transparentColorsToApply).length === 0) {
    return {
      newCustomizations: { ...currentCustomizations },
      isAlreadyTransparent: false,
      shouldShowMessage: false,
    };
  }

  const isAlreadyTransparent = Object.entries(transparentColorsToApply).every(
    ([key, value]) => currentCustomizations[key]?.toLowerCase() === value.toLowerCase()
  );

  const newCustomizations = { ...currentCustomizations };

  if (isAlreadyTransparent) {
    // First remove transparent colors
    Object.keys(transparentColorsToApply).forEach((key) => delete newCustomizations[key]);
    // Then restore previous colors (if any)
    if (Object.keys(storedColors).length > 0) {
      Object.assign(newCustomizations, storedColors);
    }
    delete newCustomizations["invisibleSquiggles.originalColors"];
  } else {
    // Save current state and apply transparency
    const savedColors = Object.fromEntries(
      Object.keys(transparentColorsToApply)
        .filter((key) => currentCustomizations[key])
        .map((key) => [key, currentCustomizations[key]!])
    );

    newCustomizations["invisibleSquiggles.originalColors"] = JSON.stringify(savedColors);
    Object.assign(newCustomizations, transparentColorsToApply);
  }

  return {
    newCustomizations,
    isAlreadyTransparent,
    shouldShowMessage: true, // Can be overridden by caller
  };
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
    config.get<Record<string, string | undefined>>("colorCustomizations") || {};

  const result = toggleSquigglesCore(currentCustomizations, hideSquiggles);
  setStatusInternal(result.isAlreadyTransparent ? 'visible' : 'hidden');

  try {
    await config.update(
      "colorCustomizations",
      result.newCustomizations,
      vscode.ConfigurationTarget.Global
    );
    const showStatusBarMessage = settings.get<boolean>("showStatusBarMessage", true);
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

  const currentCustomizations = vscode.workspace
    .getConfiguration("workbench")
    .get<{ [key: string]: string | undefined }>("colorCustomizations") || {};

  const isInitiallyTransparent = Object.entries(TRANSPARENT_COLORS).every(
    ([key, value]) =>
      (currentCustomizations[key]?.toLowerCase() || "") === value.toLowerCase()
  );

  setStatusInternal(isInitiallyTransparent ? 'hidden' : 'visible');

  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
