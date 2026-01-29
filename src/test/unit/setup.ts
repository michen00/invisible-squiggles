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
import * as Module from 'module';

// Mock vscode module - persists for all unit tests in this process
const originalRequire = Module.prototype.require;

// Section-specific configuration storage for realistic mocking
const configStore: Record<string, Record<string, unknown>> = {
  workbench: {},
  invisibleSquiggles: {},
};

// Track config update calls for verification in tests
interface ConfigUpdateCall {
  section: string;
  key: string;
  value: unknown;
  target: number;
}
const configUpdateCalls: ConfigUpdateCall[] = [];

// Track registered commands for testing
const registeredCommands: Map<string, () => Promise<void>> = new Map();

/**
 * Resets the mock configuration store to empty state.
 * Note: Current unit tests don't rely on config state (they test pure functions),
 * but this is available if future tests need isolated config state.
 */
function resetMockConfigStore(): void {
  configStore.workbench = {};
  configStore.invisibleSquiggles = {};
  configUpdateCalls.length = 0;
  registeredCommands.clear();
}

/**
 * Sets a value in the mock config store.
 * Use this to set up initial state before testing functions that read config.
 */
export function setMockConfig(section: string, key: string, value: unknown): void {
  if (!configStore[section]) {
    configStore[section] = {};
  }
  configStore[section]![key] = value;
}

/**
 * Gets a value from the mock config store.
 * Use this to verify config state after testing functions that write config.
 */
export function getMockConfig(section: string, key: string): unknown {
  return configStore[section]?.[key];
}

/**
 * Gets all config update calls made during the test.
 * Use this to verify that config.update was called with expected arguments.
 */
export function getConfigUpdateCalls(): ReadonlyArray<ConfigUpdateCall> {
  return configUpdateCalls;
}

/**
 * Clears config update call history.
 */
export function clearConfigUpdateCalls(): void {
  configUpdateCalls.length = 0;
}

/**
 * Gets a registered command handler by command ID.
 * Use this to test command execution in unit tests.
 */
export function getRegisteredCommand(
  commandId: string,
): (() => Promise<void>) | undefined {
  return registeredCommands.get(commandId);
}

/**
 * Clears registered commands.
 */
export function clearRegisteredCommands(): void {
  registeredCommands.clear();
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
    update: (key: string, value: unknown, target: number) => {
      // Track the update call
      configUpdateCalls.push({ section, key, value, target });
      // Actually update the store so subsequent reads see the new value
      if (!configStore[section]) {
        configStore[section] = {};
      }
      configStore[section]![key] = value;
      return Promise.resolve();
    },
  };
}

// Create the vscode mock object once - this will be cached by Node's module system
const vscodeMock = {
  workspace: {
    getConfiguration: (section?: string) => createMockConfig(section || ''),
  },
  window: {
    createStatusBarItem: () => ({
      text: '',
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
    registerCommand: (commandId: string, handler: () => Promise<void>) => {
      registeredCommands.set(commandId, handler);
      return {
        dispose: () => {
          registeredCommands.delete(commandId);
        },
      };
    },
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

Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    // Always return the same vscodeMock object
    // This ensures all require('vscode') calls return the same instance,
    // allowing stubs in tests to affect the same object that extension.ts uses
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments as any);
};

// Restore original require on process exit (defensive cleanup)
process.on('exit', () => {
  Module.prototype.require = originalRequire;
});
