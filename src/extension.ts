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

function setStatusVisible() {
  statusBarItem.text = "Squiggles: $(eye)";
  statusBarItem.tooltip = "Hide squiggles";
}

function setStatusHidden() {
  statusBarItem.text = "Squiggles: $(eye-closed)";
  statusBarItem.tooltip = "Show squiggles";
}

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

      setStatusVisible();
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

      setStatusHidden();
    }

    await config.update(
      "colorCustomizations",
      newCustomizations,
      vscode.ConfigurationTarget.Global
    );

    if (
      vscode.workspace
        .getConfiguration("invisibleSquiggles")
        .get<boolean>("showStatusBarMessage", true)
    ) {
      vscode.window.setStatusBarMessage(
        isTransparent
          ? "Squiggles restored to previous visibility."
          : "Selected squiggles are now transparent.",
        2500
      );
    }
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

const COMMAND_TOGGLE_SQUIGGLES = "invisible-squiggles.toggle";
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    COMMAND_TOGGLE_SQUIGGLES,
    toggleSquiggles
  );
  context.subscriptions.push(disposable);

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  const config = vscode.workspace.getConfiguration("workbench");
  const currentCustomizations =
    config.get<{ [key: string]: string | undefined }>("colorCustomizations") ||
    {};
  const isInitiallyTransparent = Object.entries(TRANSPARENT_COLORS).every(
    ([key, value]) =>
      (currentCustomizations[key]?.toLowerCase() || "") === value.toLowerCase()
  );
  if (isInitiallyTransparent) {
    setStatusHidden();
  } else {
    setStatusVisible();
  }

  statusBarItem.command = COMMAND_TOGGLE_SQUIGGLES;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
