import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  // Only include integration and E2E tests here (exclude unit tests).
  // Unit tests run against a mocked VS Code API and are executed separately with `npm run test:unit`.
  // Integration/E2E tests run in the real VS Code test environment via @vscode/test-cli.
  files: ["out/test/integration/**/*.test.js", "out/test/e2e/**/*.test.js"],
  version: "1.107.1",
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: "./test-workspace",
});
