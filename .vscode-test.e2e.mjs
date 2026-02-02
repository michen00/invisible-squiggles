import { defineConfig } from '@vscode/test-cli';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const minVersion = pkg.engines.vscode.replace('^', '');

export default defineConfig({
  files: ['out/test/e2e/**/*.test.js'],
  version: minVersion,
  mocha: {
    timeout: 30000,
  },
  workspaceFolder: './test-workspace',
});
