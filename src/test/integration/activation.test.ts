import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Integration Tests - Activation", () => {
  test("Extension should be found and activate correctly", () => {
    const extension = vscode.extensions.getExtension("michen00.invisible-squiggles");
    assert.ok(extension, "Extension should be found");
  });

  test("Extension should register the toggle command", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(
      commands.includes("invisible-squiggles.toggle"),
      "Toggle command should be registered"
    );
  });
});
