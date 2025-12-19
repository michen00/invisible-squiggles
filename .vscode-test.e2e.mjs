import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: ["out/test/e2e/**/*.test.js"],
  version: "1.97.0",
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: "./test-workspace",
});
