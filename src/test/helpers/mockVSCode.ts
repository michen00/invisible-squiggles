import * as sinon from 'sinon';
import * as vscode from 'vscode';

/**
 * Mock VSCode API helpers for unit testing
 */

export interface MockStatusBarItem {
  text: string;
  tooltip: string | undefined;
  command: string | vscode.Command | undefined;
  show: sinon.SinonStub;
  hide: sinon.SinonStub;
  dispose: sinon.SinonStub;
}

/**
 * Creates a mock status bar item
 */
export function createMockStatusBarItem(): MockStatusBarItem {
  return {
    text: '',
    tooltip: undefined,
    command: undefined,
    show: sinon.stub(),
    hide: sinon.stub(),
    dispose: sinon.stub(),
  };
}
