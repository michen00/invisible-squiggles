import * as vscode from "vscode";

async function getAIErrorFix(codeSnippet: string, errorMessage: string): Promise<string> {
    const url = "https://api-inference.huggingface.co/models/Salesforce/codet5-base"; // No API key needed

    const payload = {
        inputs: `Fix the following TypeScript error:\n\nCode:\n${codeSnippet}\n\nError: "${errorMessage}".\nProvide the corrected code:`
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0 && "generated_text" in data[0]) {
            return data[0].generated_text || "No AI fix available.";
        } else if ("error" in data) {
            return `API Error: ${data.error}`;
        } else {
            return "Unexpected response format from API.";
        }

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error fetching AI fix:", errorMessage);
        return `Failed to fetch AI fix: ${errorMessage}`;
    }
}


export function activate(context: vscode.ExtensionContext) {
    console.log("Invisible Squiggles AI Fix extension activated.");

    const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file', language: 'typescript' }, {
        async provideHover(document, position) {
            const diagnostics = vscode.languages.getDiagnostics(document.uri);
            for (const diagnostic of diagnostics) {
                if (diagnostic.range.contains(position)) {
                    const codeSnippet = document.getText(diagnostic.range);
                    const aiFix = await getAIErrorFix(codeSnippet, diagnostic.message);
                    return new vscode.Hover(`💡 **AI Suggested Fix:**\n\n${aiFix}`);
                }
            }
            return null;
        }
    });

    context.subscriptions.push(hoverProvider);
}

export function deactivate() {
    console.log("Invisible Squiggles AI Fix extension deactivated.");
}
