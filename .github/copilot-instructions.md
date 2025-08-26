# Copilot Instructions for invisible-squiggles

## Repository Overview

**invisible-squiggles** is a VSCode extension that allows users to toggle error, warning, info, and hint squiggles for a distraction-free coding experience. The extension provides both a status bar button (👁️) and command palette integration to control squiggle visibility.

### Project Details
- **Type**: VSCode Extension
- **Language**: TypeScript
- **Size**: Small focused project (~21 root files, 136 lines in main extension file)
- **Runtime**: Node.js 20.x, VSCode ^1.97.0
- **Build System**: npm + ESBuild + TypeScript
- **Package Manager**: npm
- **Dependencies**: 11 dev dependencies, ~97MB node_modules
- **Build Time**: ~2.5 seconds for full compile/package

## Build & Development Instructions

### Prerequisites
- Node.js 20.x
- npm (comes with Node.js)
- VSCode (for testing extension)

### Essential Commands (Always run in this order)

#### 1. Initial Setup
```bash
npm install
```
**Always run this first after cloning or when package.json changes.**

#### 2. Development Build
```bash
npm run compile
```
**This runs type checking, linting, and builds the extension. Use for development.**

#### 3. Production Build
```bash
npm run package
```
**Creates optimized build for distribution. Use before publishing.**

#### 4. Type Checking
```bash
npm run check-types
```
**TypeScript type validation. Always passes currently.**

#### 5. Linting
```bash
npm run lint
```
**ESLint validation. Always passes currently.**

#### 6. Testing
```bash
npm test
```
**Note: Tests require VSCode runtime and will fail in headless environments. This is expected behavior.**

### Watch Mode Development
```bash
npm run watch
```
**Starts both TypeScript and ESBuild watchers for continuous compilation during development.**

### VSCode Extension Development
1. Press `F5` in VSCode to launch Extension Development Host
2. Run "Toggle Squiggles" command in the new window to test
3. Check status bar for eye icon (👁️)
4. Use `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to reload after changes

## Project Architecture

### Key Files & Directories

#### Source Code
- `src/extension.ts` (136 lines) - Main extension implementation
- `src/test/extension.test.ts` - Basic test suite

#### Configuration Files
- `package.json` - Extension manifest, scripts, and dependencies
- `tsconfig.json` - TypeScript compiler configuration
- `eslint.config.mjs` - ESLint rules and configuration
- `esbuild.js` - Build bundling configuration

#### VSCode Integration
- `.vscode/launch.json` - Debug configuration for extension development
- `.vscode/tasks.json` - Build and watch tasks
- `.vscode/extensions.json` - Recommended extensions for development
- `.vscodeignore` - Files excluded from extension package

#### Build Output
- `dist/` - ESBuild output (production bundle)
- `out/` - TypeScript compiler output (tests)

### Extension Architecture
The extension uses VSCode's `workbench.colorCustomizations` setting to make squiggles transparent by setting editor colors to `#00000000`. It maintains original colors in a JSON string within the settings for restoration.

**Key Components:**
- Command registration: `invisible-squiggles.toggle`
- Status bar item with eye icon
- Configuration settings for each squiggle type (Error, Warning, Info, Hint)
- Color customization persistence

## Validation Pipeline

### Pre-commit Hooks
The repository uses extensive pre-commit hooks (see `.pre-commit-config.yaml`):
- **Security**: gitleaks for secret detection
- **Formatting**: prettier, markdownlint, shfmt
- **Linting**: typos, codespell, shellcheck
- **Validation**: JSON/YAML/TOML syntax checking

**Note**: Pre-commit requires separate installation. To enable if pre-commit is available:
```bash
make enable-pre-commit-only
```

**Alternative Git Hooks**: Custom commit hooks are available in `.githooks/` (commit-msg, prepare-commit-msg).

### GitHub Workflows
- `greet-new-contributors.yml` - Welcomes new contributors (no CI pipeline yet)

### Manual Validation Steps
1. **Build validation**: `npm run compile` must pass
2. **Type checking**: `npm run check-types` must pass  
3. **Linting**: `npm run lint` must pass
4. **Extension testing**: Use F5 to test in Extension Development Host

## Common Issues & Solutions


### Build Issues
- **Missing dependencies**: Run `npm install` (takes ~3-15 seconds with normal network)
- **Type errors**: Check `tsconfig.json` and run `npm run check-types`
- **ESLint errors**: Run `npm run lint` and fix reported issues
- **Build failures**: Clean and rebuild with `rm -rf dist/ out/ && npm run compile`
- **Dependency warnings**: npm shows deprecated package warnings - these are expected and don't affect functionality

### Extension Development
- **Extension not loading**: Check `package.json` activation events and main entry point
- **Commands not working**: Verify command registration in both `package.json` and `extension.ts`
- **Watch mode not updating**: Restart watch task or reload VSCode window with `Ctrl/Cmd+R`
- **Status bar not showing**: Extension activates on startup (`onStartupFinished`)

### Testing Issues
- **Tests fail in CI**: Expected behavior - tests require VSCode runtime
- **Extension Test Runner not finding tests**: Ensure watch task is running via "Tasks: Run Task" menu

## Development Workflow

### Making Changes
1. Start watch mode: `npm run watch`
2. Make changes to `src/extension.ts`
3. Press `F5` to launch Extension Development Host
4. Test changes in the new VSCode window
5. Use `Ctrl/Cmd+R` to reload after code changes

### Before Committing
1. Run `npm run compile` to ensure everything builds
2. Test extension functionality manually
3. Pre-commit hooks will run automatically if enabled

### Release Process
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run `npm run package` for production build
4. Test extension thoroughly
5. Publish to VSCode Marketplace

## File Structure Overview

```
├── .github/           # GitHub configuration
├── .vscode/           # VSCode workspace configuration  
├── src/
│   ├── extension.ts   # Main extension code (136 lines)
│   └── test/          # Test files
├── dist/              # Build output (production)
├── out/               # TypeScript output (tests)
├── package.json       # Project manifest and scripts
├── tsconfig.json      # TypeScript configuration
├── eslint.config.mjs  # Linting rules
├── esbuild.js         # Build configuration
└── Makefile           # Git hooks management
```

## Trust These Instructions

These instructions are comprehensive and tested. Only search for additional information if:
- Commands documented here fail unexpectedly
- You encounter errors not covered in the "Common Issues" section  
- You need to understand specific implementation details not covered here

The build system is stable and all documented commands work correctly as of the latest repository state.