import * as vscode from "vscode";

const TRANSPARENT_COLOR = "#00000000";
const SQUIGGLE_TYPES = ["Error", "Warning", "Info"] as const;

const TRANSPARENT_COLORS = Object.fromEntries(
  SQUIGGLE_TYPES.flatMap((type) => [
    [`editor${type}.border`, TRANSPARENT_COLOR],
    [`editor${type}.background`, TRANSPARENT_COLOR],
    [`editor${type}.foreground`, TRANSPARENT_COLOR],
  ])
);

async function toggleSquiggles(): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const settings = vscode.workspace.getConfiguration("invisibleSquiggles");

  const hideSquiggles = {
    Error: settings.get<boolean>("hideErrors", true),
    Warning: settings.get<boolean>("hideWarnings", true),
    Info: settings.get<boolean>("hideInfo", true),
  };

  const currentCustomizations =
    config.get<{ [key: string]: string | undefined }>("colorCustomizations") ||
    {};

  const storedColors = safelyParseJson(
    currentCustomizations["invisibleSquiggles.originalColors"]
  );

  const transparentColorsToApply = Object.fromEntries(
    SQUIGGLE_TYPES.flatMap((type) =>
      hideSquiggles[type]
        ? [
            [`editor${type}.border`, TRANSPARENT_COLOR],
            [`editor${type}.background`, TRANSPARENT_COLOR],
            [`editor${type}.foreground`, TRANSPARENT_COLOR],
          ]
        : []
    )
  );

  const isAlreadyTransparent = Object.entries(transparentColorsToApply).every(
    ([key, value]) => currentCustomizations[key]?.toLowerCase() === value
  );

  const newCustomizations = { ...currentCustomizations };

  if (isAlreadyTransparent) {
    // Restore previous colors
    Object.assign(newCustomizations, storedColors);
    Object.keys(TRANSPARENT_COLORS).forEach((key) => delete newCustomizations[key]);
    delete newCustomizations["invisibleSquiggles.originalColors"];
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

    newCustomizations["invisibleSquiggles.originalColors"] = JSON.stringify(savedColors);
    Object.assign(newCustomizations, transparentColorsToApply);
  }

  try {
    await config.update(
      "colorCustomizations",
      newCustomizations,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.setStatusBarMessage(
      isAlreadyTransparent
        ? "Squiggles restored to previous visibility."
        : "Selected squiggles are now transparent.",
      2500
    );
  } catch (error) {
    console.error("Error toggling squiggle visibility:", error);
    vscode.window.showErrorMessage(
      "An error occurred while toggling squiggle settings. Check logs for details."
    );
  }
}

function safelyParseJson(jsonString?: string): { [key: string]: string } {
  try {
    return jsonString ? JSON.parse(jsonString) : {};
  } catch (error) {
    console.error("Error parsing saved colors JSON:", error);
    return {};
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("invisible-squiggles.toggle", toggleSquiggles)
  );
}

export function deactivate() {}
