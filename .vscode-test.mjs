import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  // Only include integration and E2E tests (exclude unit tests)
  // Unit tests use Mocha describe/it and run separately with npm run test:unit
  // Integration/E2E tests use VSCode's suite/test framework
  files: ["out/test/integration/**/*.test.js", "out/test/e2e/**/*.test.js"],
  version: "1.97.0",
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: "./test-workspace",
});
