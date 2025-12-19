import * as assert from "assert";
import { beforeEach, describe, it } from "mocha";
import * as vscode from "vscode";
import { setStatus } from "../../extension";
import { createMockStatusBarItem, MockStatusBarItem } from "../helpers/mockVSCode";

describe("setStatus", () => {
  let mockStatusBarItem: MockStatusBarItem;

  beforeEach(() => {
    mockStatusBarItem = createMockStatusBarItem();
  });

  it("should update status bar text and tooltip when state is 'visible'", () => {
    setStatus(mockStatusBarItem as unknown as vscode.StatusBarItem, "visible");

    assert.strictEqual(mockStatusBarItem.text, "Squiggles: $(eye)");
    assert.strictEqual(mockStatusBarItem.tooltip, "Hide squiggles");
  });

  it("should update status bar text and tooltip when state is 'hidden'", () => {
    setStatus(mockStatusBarItem as unknown as vscode.StatusBarItem, "hidden");

    assert.strictEqual(mockStatusBarItem.text, "Squiggles: $(eye-closed)");
    assert.strictEqual(mockStatusBarItem.tooltip, "Show squiggles");
  });

  it("should return early when statusBarItem is null", () => {
    setStatus(null, "visible");

    // Should not throw, just return early
    assert.ok(true);
  });

  it("should return early when statusBarItem is undefined", () => {
    setStatus(undefined, "visible");

    // Should not throw, just return early
    assert.ok(true);
  });

  it("should handle status bar item not initialized (edge case)", () => {
    // Test that function handles null/undefined gracefully
    const result = setStatus(null, "visible");
    assert.strictEqual(result, undefined);
  });
});
