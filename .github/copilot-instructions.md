# Copilot Instructions for invisible-squiggles

> **Note**: For a concise agent-focused guide, see `AGENTS.md` at the repository root. This file provides more detailed context and troubleshooting information.

## Repository Overview

**invisible-squiggles** is a VSCode extension that allows users to toggle error, warning, info, and hint squiggles for a distraction-free coding experience. The extension provides both a status bar button (👁️) and command palette integration to control squiggle visibility.

The extension supports two modes:

- **Native mode** (default): Uses VS Code's built-in `problems.visibility` setting - simple and clean
- **Legacy mode**: Manipulates `workbench.colorCustomizations` to make squiggles transparent - allows per-squiggle-type control

### Project Details

- **Type**: VSCode Extension
- **Language**: TypeScript
- **Size**: Small focused project
- **Runtime**: Node.js 20.x or 22.x, VSCode ^1.100.0
- **Build System**: npm + ESBuild + TypeScript
- **Package Manager**: npm
- **Dependencies**: 16 dev dependencies
- **Build Time**: ~2.5 seconds for full compile/package

## Build & Development Instructions

### Prerequisites

- Node.js 20.x or 22.x
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
npm test                 # Run all tests (unit + integration + E2E)
npm run test:unit        # Run unit tests only (fast, < 5 seconds, no VSCode required)
npm run test:integration # Run integration tests (requires VSCode runtime)
npm run test:e2e         # Run E2E tests (requires Extension Development Host)
npm run test:coverage    # Run all tests with coverage report
```

**Test Infrastructure**:

- **Unit tests**: `src/test/unit/` - Fast tests with mocked VSCode APIs, execute in < 5 seconds
- **Integration tests**: `src/test/integration/` - Tests with real VSCode APIs
- **E2E tests**: `src/test/e2e/` - Full Extension Development Host tests
- **Test helpers**: `src/test/helpers/` - Mock VSCode APIs and test utilities
- **Coverage**: Configured with c8, shows line/branch/function/statement coverage with per-metric thresholds (warning only)

**Note**: Integration and E2E tests require VSCode runtime and will fail in headless/CI environments. Unit tests can run without VSCode.

### Watch Mode Development

```bash
npm run watch
```

**Starts both TypeScript and ESBuild watchers for continuous compilation during development.**

### Makefile Targets

The Makefile provides convenient automation. Run `make help` to see all targets:

```bash
make install      # Install dependencies (npm install)
make build        # Production build (npm run package)
make rebuild      # Clean and rebuild
make check        # Run type checking, lint, and tests
make build-vsix   # Build VSIX package for distribution
make install-vsix # Build and install VSIX locally for testing
make uninstall    # Uninstall extension from VSCode
make clean        # Remove build artifacts (dist/, out/, *.vsix)
```

### VSCode Extension Development

1. Press `F5` in VSCode to launch Extension Development Host
2. Run "Toggle Squiggles" command in the new window to test
3. Check status bar for eye icon (👁️)
4. Use `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to reload after changes

## Project Architecture

### Key Files & Directories

#### Source Code

- `src/extension.ts` - Main extension implementation
- `src/test/` - Comprehensive test suite
  - `unit/` - Unit tests with mocked VSCode APIs
  - `integration/` - Integration tests with real VSCode APIs
  - `e2e/` - End-to-end tests in Extension Development Host
  - `helpers/` - Test utilities and mock helpers

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

#### VSIX Packaging

The VSIX package is built using `make build-vsix` (or `make install-vsix` to build and install locally).

**What happens during `make build-vsix`:**

1. Renames `README.md` to `README.md.hidden` (prevents vsce from auto-including it)
2. Removes any stale sourcemaps (`dist/*.map`)
3. Runs `npx vsce package` to create the `.vsix` file
4. Restores `README.md` via `trap` (even on failure)

**Why exclude README.md and CHANGELOG.md from VSIX?**

- The VSIX is what users download/install — it should be minimal
- The VS Code Marketplace reads these files directly during `npx vsce publish`, not from the VSIX
- Both files remain fully visible on the Marketplace listing
- This reduces VSIX download size without affecting the user experience

**Note**: The `.vscodeignore` uses an allowlist pattern (`**` excludes all, then `!` negates specific files to include). The README.md rename is needed because vsce auto-includes README.md regardless of `.vscodeignore`.

### Extension Architecture

The extension dispatches to different toggle implementations based on the `invisibleSquiggles.mode` setting:

**Native mode** (default):

- Toggles VS Code's `problems.visibility` setting between `true` and `false`
- Simple, no state management needed

**Legacy mode**:

- Uses VSCode's `workbench.colorCustomizations` setting to make squiggles transparent by setting editor colors to `#00000000`
- Maintains original colors in a JSON string within the settings for restoration
- Allows per-squiggle-type control via `hideErrors`, `hideWarnings`, `hideInfo`, `hideHint` settings

**Key Components:**

- Command registration: `invisible-squiggles.toggle`
- Status bar item with eye icon
- `toggleSquiggles()`: Dispatches to native or legacy toggle based on mode setting
- `toggleSquigglesNative()`: Native mode implementation
- `toggleSquigglesLegacy()`: Legacy mode implementation with color customization persistence
- Configuration settings: `mode` (native/legacy) and per-squiggle-type flags (legacy mode only)

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

- `ci.yml` - CI pipeline: unit tests (Node 20.x/22.x) and E2E tests (VSCode 1.100.0/stable)
- `greet-new-contributors.yml` - Welcomes new contributors

### Manual Validation Steps

1. **Build validation**: `npm run compile` must pass
2. **Type checking**: `npm run check-types` must pass
3. **Linting**: `npm run lint` must pass
4. **Extension testing**: Use F5 to test in Extension Development Host

## Common Issues & Solutions

### Build Issues

- **Missing dependencies**: Run `npm install` or `make install`
- **Type errors**: Check `tsconfig.json` and run `npm run check-types`
- **ESLint errors**: Run `npm run lint` and fix reported issues
- **Build failures**: Clean and rebuild with `make rebuild` (or `make clean && make build`)
- **Dependency warnings**: npm shows deprecated package warnings - these are expected and don't affect functionality
- **VSIX contains unexpected files**: Check `.vscodeignore` allowlist pattern

### Extension Development

- **Extension not loading**: Check `package.json` activation events and main entry point
- **Commands not working**: Verify command registration in both `package.json` and `extension.ts`
- **Watch mode not updating**: Restart watch task or reload VSCode window with `Ctrl/Cmd+R`
- **Status bar not showing**: Extension activates on startup (`onStartupFinished`)

### Testing Issues

- **Tests fail in CI**: Expected behavior for integration/E2E tests - they require VSCode runtime. Unit tests can run in CI.
- **Unit tests fail**: Check that `src/test/unit/setup.ts` is properly mocking VSCode APIs
- **Integration/E2E tests fail**: Ensure VSCode test framework is properly configured in `.vscode-test.mjs`
- **Coverage shows 0%**: Ensure `src/extension.ts` is included in coverage configuration
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

### Commit Message Guidelines

**Use Conventional Commit format for all commits:**

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Common types:**

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, missing semi-colons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependency updates
- `build:` - Build system changes
- `ci:` - CI/CD configuration changes

**Examples:**

- `feat: add toggle command for hiding all squiggles`
- `fix: resolve status bar icon not updating correctly`
- `docs: update README with new installation instructions`
- `build: add comprehensive Copilot coding agent instructions`

**For coding agents:** Always use conventional commit format when making changes to maintain consistency with the project's commit history.

### Release Process

1. Update `CHANGELOG.md` (use `git cliff --unreleased` to generate entries)
2. Update version in `package.json`
3. Build and test: `make rebuild && make check`
4. Test locally: `make install-vsix`
5. Commit changes: `git commit -am "chore: release v<version>"`
6. Create signed tag: `git tag -a v<version> -m v<version> -s`
7. Push with tags: `git push --follow-tags`
8. Publish to Marketplace: `npx vsce publish`
9. Create GitHub release from the tag

## File Structure Overview

```text
├── .github/           # GitHub configuration
├── .vscode/           # VSCode workspace configuration
├── src/
│   ├── extension.ts   # Main extension code
│   └── test/          # Test files
├── dist/              # Build output (production)
├── out/               # TypeScript output (tests)
├── package.json       # Project manifest and scripts
├── tsconfig.json      # TypeScript configuration
├── eslint.config.mjs  # Linting rules
├── esbuild.js         # Build configuration
└── Makefile           # Build automation, VSIX packaging, git hooks
```

## Documentation Maintenance

### Keeping README.md Accurate

The `README.md` file is user-facing and should remain stable. However, if any information in `README.md` becomes inaccurate (e.g., features change, commands are renamed, or installation steps are updated), **update `README.md` immediately** to reflect the current state of the project.

When updating `README.md`:

- Keep the user-focused tone and simplicity
- Ensure feature descriptions match actual functionality
- Verify all links and installation instructions work
- Update version numbers or compatibility requirements if they change

### Documentation Consistency

This repository maintains multiple documentation files for different audiences:

- `README.md` - User-facing quickstart and features (keep stable, update if inaccurate)
- `AGENTS.md` - Concise agent-focused workflow guide
- `CLAUDE.md` - Detailed guidance for Claude Code
- `.github/copilot-instructions.md` - Comprehensive Copilot context (this file)

All documentation should be kept consistent. When making changes:

1. Update the relevant documentation file(s)
2. Cross-check that information aligns across all docs
3. Ensure command examples and architecture descriptions match

## Trust These Instructions

These instructions are comprehensive and tested. Only search for additional information if:

- Commands documented here fail unexpectedly
- You encounter errors not covered in the "Common Issues" section
- You need to understand specific implementation details not covered here

The build system is stable and all documented commands work correctly as of the latest repository state.
