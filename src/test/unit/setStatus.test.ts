import * as assert from 'assert';
import { beforeEach, describe, it } from 'mocha';
import * as vscode from 'vscode';
import { setStatus } from '../../extension';
import { createMockStatusBarItem, MockStatusBarItem } from '../helpers/mockVSCode';

describe('setStatus', () => {
  let mockStatusBarItem: MockStatusBarItem;

  beforeEach(() => {
    mockStatusBarItem = createMockStatusBarItem();
  });

  it("should update status bar text and tooltip when state is 'visible'", () => {
    setStatus(mockStatusBarItem as unknown as vscode.StatusBarItem, 'visible');

    assert.strictEqual(mockStatusBarItem.text, 'Squiggles: $(eye)');
    assert.strictEqual(mockStatusBarItem.tooltip, 'Hide squiggles');
  });

  it("should update status bar text and tooltip when state is 'hidden'", () => {
    setStatus(mockStatusBarItem as unknown as vscode.StatusBarItem, 'hidden');

    assert.strictEqual(mockStatusBarItem.text, 'Squiggles: $(eye-closed)');
    assert.strictEqual(mockStatusBarItem.tooltip, 'Show squiggles');
  });

  it('should handle null/undefined status bar item gracefully', () => {
    // Test that function handles null/undefined gracefully by not throwing
    assert.doesNotThrow(() => setStatus(null, 'visible'));
    assert.doesNotThrow(() => setStatus(undefined, 'visible'));
  });
});
