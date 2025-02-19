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
    config.get<{ [key: string]: string | undefined }>("colorCustomizations") ||
    {};

  let transparentColorsToApply: { [key: string]: string } = {};

  if (hideErrors) {
    transparentColorsToApply = {
      ...transparentColorsToApply,
      "editorError.border": TRANSPARENT_COLORS["editorError.border"],
      "editorError.background": TRANSPARENT_COLORS["editorError.background"],
      "editorError.foreground": TRANSPARENT_COLORS["editorError.foreground"],
    };
  }
  if (hideWarnings) {
    transparentColorsToApply = {
      ...transparentColorsToApply,
      "editorWarning.border": TRANSPARENT_COLORS["editorWarning.border"],
      "editorWarning.background": TRANSPARENT_COLORS["editorWarning.background"],
      "editorWarning.foreground": TRANSPARENT_COLORS["editorWarning.foreground"],
    };
  }
  if (hideInfo) {
    transparentColorsToApply = {
      ...transparentColorsToApply,
      "editorInfo.border": TRANSPARENT_COLORS["editorInfo.border"],
      "editorInfo.background": TRANSPARENT_COLORS["editorInfo.background"],
      "editorInfo.foreground": TRANSPARENT_COLORS["editorInfo.foreground"],
    };
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

  vscode.window.setStatusBarMessage("Squiggle settings updated.", 2500);
}

// Webview for configuration UI
async function openSettingsPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "invisibleSquigglesSettings",
    "Invisible Squiggles Settings",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  const settings = vscode.workspace.getConfiguration("invisibleSquiggles");
  const hideErrors = settings.get<boolean>("hideErrors", true);
  const hideWarnings = settings.get<boolean>("hideWarnings", true);
  const hideInfo = settings.get<boolean>("hideInfo", true);

  panel.webview.html = getWebviewContent(hideErrors, hideWarnings, hideInfo);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "updateSettings") {
        await settings.update("hideErrors", message.hideErrors, vscode.ConfigurationTarget.Global);
        await settings.update("hideWarnings", message.hideWarnings, vscode.ConfigurationTarget.Global);
        await settings.update("hideInfo", message.hideInfo, vscode.ConfigurationTarget.Global);

        await applySquiggleSettings();
      }
    },
    undefined,
    context.subscriptions
  );
}

// Webview HTML content
function getWebviewContent(hideErrors: boolean, hideWarnings: boolean, hideInfo: boolean): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invisible Squiggles Settings</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        label { display: block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h2>Invisible Squiggles Settings</h2>
      <label>
        <input type="checkbox" id="hideErrors" ${hideErrors ? "checked" : ""}>
        Hide Error Squiggles
      </label>
      <label>
        <input type="checkbox" id="hideWarnings" ${hideWarnings ? "checked" : ""}>
        Hide Warning Squiggles
      </label>
      <label>
        <input type="checkbox" id="hideInfo" ${hideInfo ? "checked" : ""}>
        Hide Info Squiggles
      </label>
      <button onclick="saveSettings()">Save</button>

      <script>
        function saveSettings() {
          const hideErrors = document.getElementById('hideErrors').checked;
          const hideWarnings = document.getElementById('hideWarnings').checked;
          const hideInfo = document.getElementById('hideInfo').checked;

          vscode.postMessage({
            command: 'updateSettings',
            hideErrors,
            hideWarnings,
            hideInfo
          });
        }

        const vscode = acquireVsCodeApi();
      </script>
    </body>
    </html>
  `;
}

export function activate(context: vscode.ExtensionContext) {
  const toggleDisposable = vscode.commands.registerCommand(
    "invisible-squiggles.toggle",
    applySquiggleSettings
  );

  const settingsDisposable = vscode.commands.registerCommand(
    "invisible-squiggles.settings",
    () => openSettingsPanel(context)
  );

  context.subscriptions.push(toggleDisposable, settingsDisposable);
}

export function deactivate() {}
