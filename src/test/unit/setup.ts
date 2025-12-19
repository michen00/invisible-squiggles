/**
 * Unit test setup - mocks VSCode module before any test imports
 */
import * as Module from "module";

// Mock vscode module
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "vscode") {
    return {
      workspace: {
        getConfiguration: () => ({
          get: () => undefined,
          update: () => Promise.resolve(),
        }),
      },
      window: {
        createStatusBarItem: () => ({
          text: "",
          tooltip: undefined,
          command: undefined,
          show: () => {},
          hide: () => {},
          dispose: () => {},
        }),
        showInformationMessage: () => Promise.resolve(undefined),
        showErrorMessage: () => Promise.resolve(undefined),
        setStatusBarMessage: () => ({
          dispose: () => {},
        }),
      },
      commands: {
        registerCommand: () => ({
          dispose: () => {},
        }),
      },
      StatusBarAlignment: {
        Right: 1,
        Left: 0,
      },
      ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
      },
    };
  }
  return originalRequire.apply(this, arguments as any);
};
