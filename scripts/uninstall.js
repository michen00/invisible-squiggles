#!/usr/bin/env node
/**
 * Uninstall script for invisible-squiggles extension.
 * Cleans up settings that were modified by the extension.
 *
 * This script runs outside of VSCode context, so it must directly
 * modify settings.json files on disk.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Get the path to VSCode's user settings.json based on platform
 */
function getSettingsPath() {
  const home = os.homedir();

  switch (process.platform) {
    case "win32":
      return path.join(
        process.env.APPDATA || path.join(home, "AppData", "Roaming"),
        "Code",
        "User",
        "settings.json",
      );
    case "darwin":
      return path.join(
        home,
        "Library",
        "Application Support",
        "Code",
        "User",
        "settings.json",
      );
    case "linux":
      return path.join(home, ".config", "Code", "User", "settings.json");
    default:
      return null;
  }
}

/**
 * Safely parse JSON, returning null on failure
 */
function safeParseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    // Handle JSON with comments (JSONC) by stripping comments
    try {
      const stripped = content
        .replace(/\/\/.*$/gm, "") // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }
}

/**
 * Clean up extension settings from the settings object
 */
function cleanupSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return { settings, changed: false };
  }

  let changed = false;

  // Remove problems.visibility if it was set to false (hidden state)
  if (settings["problems.visibility"] === false) {
    delete settings["problems.visibility"];
    changed = true;
    console.log("Restored problems.visibility (removed false value)");
  }

  // Clean up workbench.colorCustomizations
  const colorCustomizations = settings["workbench.colorCustomizations"];
  if (colorCustomizations && typeof colorCustomizations === "object") {
    // Try to restore original colors if saved
    const savedColorsJson = colorCustomizations["invisibleSquiggles.originalColors"];
    if (savedColorsJson && typeof savedColorsJson === "string") {
      try {
        const savedColors = JSON.parse(savedColorsJson);
        // Restore saved colors
        for (const [key, value] of Object.entries(savedColors)) {
          if (typeof value === "string") {
            colorCustomizations[key] = value;
            changed = true;
          }
        }
        console.log("Restored original squiggle colors from saved state");
      } catch {
        console.log("Could not parse saved colors, skipping restoration");
      }
    }

    // Remove extension-specific keys
    delete colorCustomizations["invisibleSquiggles.originalColors"];

    // Remove transparent colors that may have been left behind
    const transparentColor = "#00000000";
    const squiggleKeys = [
      "editorError.background",
      "editorError.border",
      "editorError.foreground",
      "editorWarning.background",
      "editorWarning.border",
      "editorWarning.foreground",
      "editorInfo.background",
      "editorInfo.border",
      "editorInfo.foreground",
      "editorHint.border",
      "editorHint.foreground",
    ];

    for (const key of squiggleKeys) {
      if (
        colorCustomizations[key] &&
        colorCustomizations[key].toLowerCase() === transparentColor
      ) {
        delete colorCustomizations[key];
        changed = true;
      }
    }

    // Remove colorCustomizations entirely if empty
    if (Object.keys(colorCustomizations).length === 0) {
      delete settings["workbench.colorCustomizations"];
    }
  }

  // Remove all invisibleSquiggles.* settings
  const keysToRemove = Object.keys(settings).filter((key) =>
    key.startsWith("invisibleSquiggles."),
  );
  for (const key of keysToRemove) {
    delete settings[key];
    changed = true;
  }

  if (keysToRemove.length > 0) {
    console.log(`Removed ${keysToRemove.length} invisibleSquiggles.* settings`);
  }

  return { settings, changed };
}

/**
 * Main uninstall routine
 */
function main() {
  console.log("invisible-squiggles: Running uninstall cleanup...");

  const settingsPath = getSettingsPath();
  if (!settingsPath) {
    console.log("Could not determine settings path for this platform");
    return;
  }

  if (!fs.existsSync(settingsPath)) {
    console.log("Settings file not found, nothing to clean up");
    return;
  }

  try {
    const content = fs.readFileSync(settingsPath, "utf8");
    const settings = safeParseJson(content);

    if (!settings) {
      console.log("Could not parse settings.json, skipping cleanup");
      return;
    }

    const { settings: cleanedSettings, changed } = cleanupSettings(settings);

    if (changed) {
      // Write back with pretty formatting
      fs.writeFileSync(
        settingsPath,
        JSON.stringify(cleanedSettings, null, 2) + "\n",
        "utf8",
      );
      console.log("Settings cleaned up successfully");
    } else {
      console.log("No cleanup needed");
    }
  } catch (error) {
    console.error("Error during cleanup:", error.message);
  }
}

main();
