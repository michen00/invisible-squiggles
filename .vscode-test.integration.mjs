import { createRequire } from "module";
import { defineConfig } from "@vscode/test-cli";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");
const minVersion = pkg.engines.vscode.replace("^", "");

export default defineConfig({
  files: ["out/test/integration/**/*.test.js"],
  version: minVersion,
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: "./test-workspace",
});
