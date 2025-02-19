"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const TRANSPARENT_COLORS = {
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
async function toggleSquiggles() {
    const config = vscode.workspace.getConfiguration("workbench");
    const settings = vscode.workspace.getConfiguration("invisibleSquiggles");
    const hideErrors = settings.get("hideErrors", true);
    const hideWarnings = settings.get("hideWarnings", true);
    const hideInfo = settings.get("hideInfo", true);
    const currentCustomizations = config.get("colorCustomizations") ||
        {};
    let originalColors = {};
    try {
        originalColors = JSON.parse(currentCustomizations["invisibleSquiggles.originalColors"] || "{}");
    }
    catch (parseError) {
        console.error("Error parsing saved colors:", parseError);
    }
    try {
        const transparentColorsToApply = {
            ...(hideErrors
                ? {
                    "editorError.border": TRANSPARENT_COLORS["editorError.border"],
                    "editorError.background": TRANSPARENT_COLORS["editorError.background"],
                    "editorError.foreground": TRANSPARENT_COLORS["editorError.foreground"],
                }
                : {}),
            ...(hideWarnings
                ? {
                    "editorWarning.border": TRANSPARENT_COLORS["editorWarning.border"],
                    "editorWarning.background": TRANSPARENT_COLORS["editorWarning.background"],
                    "editorWarning.foreground": TRANSPARENT_COLORS["editorWarning.foreground"],
                }
                : {}),
            ...(hideInfo
                ? {
                    "editorInfo.border": TRANSPARENT_COLORS["editorInfo.border"],
                    "editorInfo.background": TRANSPARENT_COLORS["editorInfo.background"],
                    "editorInfo.foreground": TRANSPARENT_COLORS["editorInfo.foreground"],
                }
                : {}),
        };
        const isTransparent = Object.entries(transparentColorsToApply).every(([key, value]) => (currentCustomizations[key]?.toLowerCase() || "") ===
            value.toLowerCase());
        const newCustomizations = { ...currentCustomizations };
        if (isTransparent) {
            // Restore saved colors
            Object.assign(newCustomizations, originalColors);
            Object.keys(TRANSPARENT_COLORS).forEach((key) => delete newCustomizations[key]);
            delete newCustomizations["invisibleSquiggles.originalColors"];
        }
        else {
            // Save current state and apply transparency
            const savedColors = Object.keys(transparentColorsToApply).reduce((acc, key) => {
                if (currentCustomizations[key]) {
                    acc[key] = currentCustomizations[key];
                }
                return acc;
            }, {});
            newCustomizations["invisibleSquiggles.originalColors"] =
                JSON.stringify(savedColors);
            Object.assign(newCustomizations, transparentColorsToApply);
        }
        await config.update("colorCustomizations", newCustomizations, vscode.ConfigurationTarget.Global);
        vscode.window.setStatusBarMessage(isTransparent
            ? "Squiggles restored to previous visibility."
            : "Selected squiggles are now transparent.", 2500);
    }
    catch (error) {
        console.error("Error toggling squiggle visibility. Current state:", {
            currentCustomizations,
            error,
        });
        vscode.window.showErrorMessage("An error occurred while toggling squiggle settings.");
    }
}
function activate(context) {
    const disposable = vscode.commands.registerCommand("invisible-squiggles.toggle", toggleSquiggles);
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map