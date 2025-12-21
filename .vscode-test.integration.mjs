import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: ["out/test/integration/**/*.test.js"],
  version: "1.107.1",
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: "./test-workspace",
});
