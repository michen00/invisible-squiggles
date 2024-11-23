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

async function toggleSquiggles(): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
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
    const isTransparent = Object.entries(TRANSPARENT_COLORS).every(
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
    } else {
      // Save current state and apply transparency
      const savedColors = Object.keys(TRANSPARENT_COLORS).reduce((acc, key) => {
        if (currentCustomizations[key]) {
          acc[key] = currentCustomizations[key]!;
        }
        return acc;
      }, {} as { [key: string]: string });

      newCustomizations["invisibleSquiggles.originalColors"] =
        JSON.stringify(savedColors);
      Object.assign(newCustomizations, TRANSPARENT_COLORS);
    }

    await config.update(
      "colorCustomizations",
      newCustomizations,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.setStatusBarMessage(
      isTransparent
        ? "Squiggles restored to previous visibility."
        : "Squiggles are now transparent.",
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
}

export function deactivate() {}
