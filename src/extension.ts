import * as vscode from 'vscode';

async function toggleSquiggles() {
    const config = vscode.workspace.getConfiguration();
    const currentCustomizations = config.get<{ [key: string]: string | undefined }>("workbench.colorCustomizations") || {};

    const transparentColors: { [key: string]: string } = {
        "editorError.foreground": "#00000000",
        "editorWarning.foreground": "#00000000",
        "editorInfo.foreground": "#00000000"
    };

    let originalColors: { [key: string]: string } = {};
    try {
        originalColors = currentCustomizations["invisibleSquiggles.originalColors"]
            ? JSON.parse(currentCustomizations["invisibleSquiggles.originalColors"]!)
            : {};
    } catch (error) {
        console.error("Error parsing original colors:", error);
        vscode.window.showErrorMessage("Failed to parse original colors. Restoring defaults.");
    }

    const isTransparent = Object.entries(transparentColors).every(
        ([key, value]) => currentCustomizations[key]?.toLowerCase() === value.toLowerCase()
    );

    const newCustomizations: { [key: string]: string | undefined } = { ...currentCustomizations };

    if (isTransparent) {
        // Restore original settings
        Object.assign(newCustomizations, originalColors);

        // Remove transparent settings and cleanup custom storage
        Object.keys(transparentColors).forEach((key) => delete newCustomizations[key]);
        delete newCustomizations["invisibleSquiggles.originalColors"];
    } else {
        // Save current squiggle colors
        const savedColors: { [key: string]: string } = {};
        for (const key of Object.keys(transparentColors)) {
            if (currentCustomizations[key]) {
                savedColors[key] = currentCustomizations[key]!;
            }
        }

        newCustomizations["invisibleSquiggles.originalColors"] = JSON.stringify(savedColors);
        Object.assign(newCustomizations, transparentColors);
    }

    try {
        await config.update("workbench.colorCustomizations", newCustomizations, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(
            isTransparent ? "Squiggles are now visible." : "Squiggles are now hidden."
        );
    } catch (error) {
        console.error("Error updating configuration:", error);
        vscode.window.showErrorMessage("Failed to update squiggle settings.");
    }
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('invisible-squiggles.toggle', toggleSquiggles);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
