/**
 * Unit test setup - mocks VSCode module before any test imports
 *
 * This file is loaded via mocha's --require flag for unit tests only.
 * The VSCode mock is intentionally global for the entire unit test run,
 * allowing tests to import from extension.ts without the real VSCode runtime.
 *
 * Integration and E2E tests use the real VSCode API via @vscode/test-cli
 * and do NOT load this setup file.
 */
import * as Module from "module";

// Mock vscode module - persists for all unit tests in this process
const originalRequire = Module.prototype.require;

// Section-specific configuration storage for realistic mocking
const configStore: Record<string, Record<string, unknown>> = {
  workbench: {},
  invisibleSquiggles: {},
};

/**
 * Resets the mock configuration store to empty state.
 * Note: Current unit tests don't rely on config state (they test pure functions),
 * but this is available if future tests need isolated config state.
 */
function resetMockConfigStore(): void {
  configStore.workbench = {};
  configStore.invisibleSquiggles = {};
}

// Mocha root hooks - automatically run before each test
export const mochaHooks = {
  beforeEach() {
    resetMockConfigStore();
  },
};

function createMockConfig(section: string) {
  return {
    get: (key: string, defaultValue?: unknown) => {
      const sectionConfig = configStore[section] || {};
      return key in sectionConfig ? sectionConfig[key] : defaultValue;
    },
    update: () => Promise.resolve(),
  };
}

Module.prototype.require = function (id: string) {
  if (id === "vscode") {
    return {
      workspace: {
        getConfiguration: (section?: string) => createMockConfig(section || ""),
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

// Restore original require on process exit (defensive cleanup)
process.on("exit", () => {
  Module.prototype.require = originalRequire;
});
