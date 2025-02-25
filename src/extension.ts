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

async function applySquiggleSettings(): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

  const hideErrors = settings.get<boolean>("hideErrors", true);
  const hideWarnings = settings.get<boolean>("hideWarnings", true);
  const hideInfo = settings.get<boolean>("hideInfo", true);

  const currentCustomizations =
    config.get<{ [key: string]: string | undefined }>("colorCustomizations") || {};

  let transparentColorsToApply: { [key: string]: string } = {};

  if (hideErrors) {
    Object.assign(transparentColorsToApply, {
      "editorError.border": TRANSPARENT_COLORS["editorError.border"],
      "editorError.background": TRANSPARENT_COLORS["editorError.background"],
      "editorError.foreground": TRANSPARENT_COLORS["editorError.foreground"],
    });
  }
  if (hideWarnings) {
    Object.assign(transparentColorsToApply, {
      "editorWarning.border": TRANSPARENT_COLORS["editorWarning.border"],
      "editorWarning.background": TRANSPARENT_COLORS["editorWarning.background"],
      "editorWarning.foreground": TRANSPARENT_COLORS["editorWarning.foreground"],
    });
  }
  if (hideInfo) {
    Object.assign(transparentColorsToApply, {
      "editorInfo.border": TRANSPARENT_COLORS["editorInfo.border"],
      "editorInfo.background": TRANSPARENT_COLORS["editorInfo.background"],
      "editorInfo.foreground": TRANSPARENT_COLORS["editorInfo.foreground"],
    });
  }

  const newCustomizations = {
    ...currentCustomizations,
    ...transparentColorsToApply,
  };

  await config.update(
    "colorCustomizations",
    newCustomizations,
    vscode.ConfigurationTarget.Global
  );

  vscode.window.setStatusBarMessage("Squiggle settings applied.", 2500);
}

export function activate(context: vscode.ExtensionContext) {
  const toggleDisposable = vscode.commands.registerCommand(
    "invisible-squiggles.toggle",
    applySquiggleSettings
  );

  context.subscriptions.push(toggleDisposable);
}

export function deactivate() {}
