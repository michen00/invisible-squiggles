import * as vscode from "vscode";

const TRANSPARENT_COLORS: { [key: string]: string } = {
  "editorInfo.border": "#00000000",
  "editorInfo.background": "#00000000",
  "editorInfo.foreground": "#00000000",
  "editorError.border": "#00000000",
  "editorError.background": "#00000000",
  "editorError.foreground": "#00000000",
  "editorWarning.border": "#00000000",
  "editorWarning.background": "#00000000",
  "editorWarning.foreground": "#00000000",
};

let statusBarItem: vscode.StatusBarItem;

async function toggleSquiggles(): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

  const hideErrors = settings.get<boolean>("hideErrors", true);
  const hideWarnings = settings.get<boolean>("hideWarnings", true);
  const hideInfo = settings.get<boolean>("hideInfo", true);

  const currentCustomizations =
    config.get<{ [key: string]: string | undefined }>("colorCustomizations") ||
    {};

  let originalColors: { [key: string]: string } = {};
  try {
    originalColors = JSON.parse(
      currentCustomizations["invisibleSquiggles.originalColors"] || "{}"
    );
  } catch (parseError) {
    console.error("Error parsing saved colors:", parseError);
  }

  try {
    const transparentColorsToApply = {
      ...(hideErrors
        ? {
            "editorError.border": TRANSPARENT_COLORS["editorError.border"],
            "editorError.background":
              TRANSPARENT_COLORS["editorError.background"],
            "editorError.foreground":
              TRANSPARENT_COLORS["editorError.foreground"],
          }
        : {}),
      ...(hideWarnings
        ? {
            "editorWarning.border": TRANSPARENT_COLORS["editorWarning.border"],
            "editorWarning.background":
              TRANSPARENT_COLORS["editorWarning.background"],
            "editorWarning.foreground":
              TRANSPARENT_COLORS["editorWarning.foreground"],
          }
        : {}),
      ...(hideInfo
        ? {
            "editorInfo.border": TRANSPARENT_COLORS["editorInfo.border"],
            "editorInfo.background":
              TRANSPARENT_COLORS["editorInfo.background"],
            "editorInfo.foreground":
              TRANSPARENT_COLORS["editorInfo.foreground"],
          }
        : {}),
    };

    const isTransparent = Object.entries(transparentColorsToApply).every(
      ([key, value]) =>
        (currentCustomizations[key]?.toLowerCase() || "") ===
        value.toLowerCase()
    );

    const newCustomizations = { ...currentCustomizations };
    if (isTransparent) {
      // Restore saved colors
      Object.assign(newCustomizations, originalColors);
      Object.keys(TRANSPARENT_COLORS).forEach(
        (key) => delete newCustomizations[key]
      );
      delete newCustomizations["invisibleSquiggles.originalColors"];

      statusBarItem.text = "$(eye) Show Squiggles";
    } else {
      // Save current state and apply transparency
      const savedColors = Object.keys(transparentColorsToApply).reduce(
        (acc, key) => {
          if (currentCustomizations[key]) {
            acc[key] = currentCustomizations[key]!;
          }
          return acc;
        },
        {} as { [key: string]: string }
      );

      newCustomizations["invisibleSquiggles.originalColors"] =
        JSON.stringify(savedColors);
      Object.assign(newCustomizations, transparentColorsToApply);

      statusBarItem.text = "$(eye-closed) Hide Squiggles";
    }

    await config.update(
      "colorCustomizations",
      newCustomizations,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.setStatusBarMessage(
      isTransparent
        ? "Squiggles restored to previous visibility."
        : "Selected squiggles are now transparent.",
      2500
    );
  } catch (error) {
    console.error("Error toggling squiggle visibility. Current state:", {
      currentCustomizations,
      error,
    });
    vscode.window.showErrorMessage(
      "An error occurred while toggling squiggle settings."
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "invisible-squiggles.toggle",
    toggleSquiggles
  );
  context.subscriptions.push(disposable);

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(eye) Toggle Squiggles";
  statusBarItem.tooltip = "Click to toggle squiggles";
  statusBarItem.command = "invisible-squiggles.toggle";
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
}

export function deactivate() { }
