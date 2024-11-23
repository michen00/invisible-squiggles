import * as vscode from 'vscode';

async function toggleSquiggles() {
    const config = vscode.workspace.getConfiguration();
    const currentCustomizations = config.get<{ [key: string]: string | undefined }>("workbench.colorCustomizations") || {};

    const transparentColors: { [key: string]: string } = {
        "editorError.foreground": "#00000000",
        "editorWarning.foreground": "#00000000",
        "editorInfo.foreground": "#00000000"
    };

    // Retrieve stored original colors from settings
    const originalColors = currentCustomizations["invisibleSquiggles.originalColors"]
        ? JSON.parse(currentCustomizations["invisibleSquiggles.originalColors"]!)
        : {};

    const isTransparent = Object.entries(transparentColors).every(
        ([key, value]) => currentCustomizations[key]?.toLowerCase() === value.toLowerCase()
    );

    let newCustomizations: { [key: string]: string | undefined };

    if (isTransparent) {
        // Restore original settings
        newCustomizations = {
            ...currentCustomizations,
            ...originalColors
        };

        // Remove transparent settings and cleanup custom storage
        Object.keys(transparentColors).forEach((key) => {
            delete newCustomizations[key];
        });
        delete newCustomizations["invisibleSquiggles.originalColors"];
    } else {
        // Save current squiggle colors to custom storage
        const savedColors: { [key: string]: string } = {};
        Object.keys(transparentColors).forEach((key) => {
            if (currentCustomizations[key]) {
                savedColors[key] = currentCustomizations[key]!;
            }
        });

        // Persist the original colors in `workbench.colorCustomizations`
        newCustomizations = {
            ...currentCustomizations,
            "invisibleSquiggles.originalColors": JSON.stringify(savedColors),
            ...transparentColors
        };
    }

    // Apply the new customizations
    await config.update(
        "workbench.colorCustomizations",
        newCustomizations,
        vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage(
        isTransparent ? "Squiggles are now visible." : "Squiggles are now hidden."
    );
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('invisible-squiggles.toggle', toggleSquiggles);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
