import * as sinon from "sinon";
import * as vscode from "vscode";

/**
 * Mock VSCode API helpers for unit testing
 * Provides stubbed implementations of VSCode APIs that can be used in unit tests
 */

export interface MockWorkspaceConfiguration {
  get: sinon.SinonStub;
  update: sinon.SinonStub;
  has: sinon.SinonStub;
  inspect: sinon.SinonStub;
}

export interface MockStatusBarItem {
  text: string;
  tooltip: string | undefined;
  command: string | vscode.Command | undefined;
  show: sinon.SinonStub;
  hide: sinon.SinonStub;
  dispose: sinon.SinonStub;
}

export interface MockWindow {
  createStatusBarItem: sinon.SinonStub;
  showInformationMessage: sinon.SinonStub;
  showErrorMessage: sinon.SinonStub;
  showWarningMessage: sinon.SinonStub;
  setStatusBarMessage: sinon.SinonStub;
}

export interface MockWorkspace {
  getConfiguration: sinon.SinonStub;
  workspaceFolders: vscode.WorkspaceFolder[] | undefined;
  name: string | undefined;
}

export interface MockVSCode {
  workspace: MockWorkspace;
  window: MockWindow;
  commands: {
    registerCommand: sinon.SinonStub;
    executeCommand: sinon.SinonStub;
  };
  StatusBarAlignment: typeof vscode.StatusBarAlignment;
  ConfigurationTarget: typeof vscode.ConfigurationTarget;
}

/**
 * Creates a mock VSCode workspace configuration
 */
export function createMockConfiguration(
  initialValues: Record<string, any> = {}
): MockWorkspaceConfiguration {
  const config: Record<string, any> = { ...initialValues };

  return {
    get: sinon.stub().callsFake((key: string, defaultValue?: any) => {
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
    update: sinon.stub().resolves(),
    has: sinon.stub().callsFake((key: string) => key in config),
    inspect: sinon.stub().returns(undefined),
  };
}

/**
 * Creates a mock status bar item
 */
export function createMockStatusBarItem(): MockStatusBarItem {
  return {
    text: "",
    tooltip: undefined,
    command: undefined,
    show: sinon.stub(),
    hide: sinon.stub(),
    dispose: sinon.stub(),
  };
}

/**
 * Creates a mock VSCode window API
 */
export function createMockWindow(): MockWindow {
  const statusBarItem = createMockStatusBarItem();

  return {
    createStatusBarItem: sinon.stub().returns(statusBarItem),
    showInformationMessage: sinon.stub().resolves(undefined),
    showErrorMessage: sinon.stub().resolves(undefined),
    showWarningMessage: sinon.stub().resolves(undefined),
    setStatusBarMessage: sinon.stub().returns({
      dispose: sinon.stub(),
    }),
  };
}

/**
 * Creates a mock VSCode workspace API
 */
export function createMockWorkspace(
  initialConfig: Record<string, any> = {}
): MockWorkspace {
  const workbenchConfig = createMockConfiguration(initialConfig);
  const invisibleSquigglesConfig = createMockConfiguration();

  return {
    getConfiguration: sinon.stub().callsFake((section?: string) => {
      if (section === "workbench") {
        return workbenchConfig;
      }
      if (section === "invisibleSquiggles") {
        return invisibleSquigglesConfig;
      }
      return workbenchConfig;
    }),
    workspaceFolders: undefined,
    name: undefined,
  };
}

/**
 * Creates a complete mock VSCode API
 */
export function createMockVSCode(
  initialConfig: Record<string, any> = {}
): MockVSCode {
  const workspace = createMockWorkspace(initialConfig);
  const window = createMockWindow();

  return {
    workspace,
    window,
    commands: {
      registerCommand: sinon.stub().returns({
        dispose: sinon.stub(),
      }),
      executeCommand: sinon.stub().resolves(undefined),
    },
    StatusBarAlignment: vscode.StatusBarAlignment,
    ConfigurationTarget: vscode.ConfigurationTarget,
  };
}

/**
 * Resets all stubs in a mock VSCode instance
 */
export function resetMockVSCode(mock: MockVSCode): void {
  mock.workspace.getConfiguration.resetHistory();
  mock.window.createStatusBarItem.resetHistory();
  mock.commands.registerCommand.resetHistory();
  mock.commands.executeCommand.resetHistory();
}
