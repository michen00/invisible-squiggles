import * as vscode from "vscode";

const TRANSPARENT_COLOR = "#00000000";
const SQUIGGLE_TYPES = ["Error", "Warning", "Info", "Hint"] as const;

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

  const hideSquiggles = Object.fromEntries(
    SQUIGGLE_TYPES.map((type) => [
      type,
      settings.get<boolean>(`hide${type}s`, true),
    ])
  ) as Record<typeof SQUIGGLE_TYPES[number], boolean>;

  const currentCustomizations =
    config.get<{ [key: string]: string | undefined }>("colorCustomizations") || {};

  const storedColors = (() => {
    const storedJson = currentCustomizations["invisibleSquiggles.originalColors"];
    if (!storedJson || typeof storedJson !== "string") return {};
    try {
      return JSON.parse(storedJson);
    } catch (error) {
      console.error("Error parsing saved colors JSON:", error);
      return {};
    }
  })();

  const transparentColorsToApply = Object.fromEntries(
    SQUIGGLE_TYPES.flatMap((type) =>
      hideSquiggles[type]
        ? Object.entries(TRANSPARENT_COLORS).filter(([key]) =>
            key.startsWith(`editor${type}`)
          )
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
    
    if (Object.keys(storedColors).length === 0) {
      delete newCustomizations["invisibleSquiggles.originalColors"];
    }
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

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("invisible-squiggles.toggle", toggleSquiggles)
  );
}

export function deactivate() {}
