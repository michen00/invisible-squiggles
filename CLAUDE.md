# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VSCode extension that toggles error, warning, info, and hint squiggles for distraction-free coding. The extension manipulates VSCode's `workbench.colorCustomizations` to make diagnostic squiggles transparent by setting colors to `#00000000`.

## Essential Development Commands

### Build and Development

```bash
npm install              # Install dependencies (required after cloning)
npm run compile          # Type check + lint + build (development)
npm run package          # Type check + lint + optimized build (production)
npm run watch            # Start both TypeScript and ESBuild watchers
npm run check-types      # TypeScript type validation only
npm run lint             # ESLint validation only
npm test                 # Run all tests (unit + integration + E2E)
npm run test:unit        # Run unit tests only (fast, < 5 seconds)
npm run test:integration # Run integration tests (requires VSCode)
npm run test:e2e         # Run E2E tests (requires Extension Development Host)
npm run test:coverage    # Run all tests with coverage report
```

### Testing Infrastructure

**Test Types**:

- **Unit tests**: Located in `src/test/unit/`, use mocked VSCode APIs, execute in < 5 seconds
- **Integration tests**: Located in `src/test/integration/`, use real VSCode APIs
- **E2E tests**: Located in `src/test/e2e/`, run in Extension Development Host
- **Coverage**: Configured with c8, 80% threshold (warning only, doesn't fail build)

**Test Helpers**: `src/test/helpers/` contains mock VSCode APIs and test utilities

**Coverage**: Reports show line, branch, function, and statement coverage. Threshold is 80% with warnings only.

### VSCode Extension Testing

Press `F5` in VSCode to launch Extension Development Host, then:

- Test the "Toggle Squiggles" command via Command Palette (`Ctrl/Cmd+Shift+P`)
- Verify the eye icon (👁️) appears in the status bar
- Use `Ctrl/Cmd+R` to reload after making code changes

Note: Integration and E2E tests require VSCode runtime and will fail in headless/CI environments. Unit tests can run without VSCode.

## Architecture

### Core Mechanism

The extension works by:

1. Reading current `workbench.colorCustomizations` settings
2. Storing original squiggle colors in a JSON string within settings (`invisibleSquiggles.originalColors`)
3. Applying transparent colors (`#00000000`) to configured squiggle types
4. Restoring original colors when toggled back

### Key Components

**Main Entry Point**: `src/extension.ts` (136 lines)

- `activate()`: Registers command, creates status bar item, sets initial state
- `toggleSquiggles()`: Core logic that applies/restores color customizations
- `setStatus()`: Updates status bar icon and tooltip based on squiggle visibility state

**Squiggle Types Managed**: Hint, Info, Error, Warning

For each type, the extension manages three color properties:

- `editor{Type}.background`
- `editor{Type}.border`
- `editor{Type}.foreground`

**Configuration Settings** (`package.json` contributions):

- `invisibleSquiggles.hideErrors` (default: true)
- `invisibleSquiggles.hideWarnings` (default: true)
- `invisibleSquiggles.hideInfo` (default: true)
- `invisibleSquiggles.hideHint` (default: true)
- `invisibleSquiggles.showStatusBarMessage` (default: false) - Shows temporary status message on toggle

**Command Registration**: `invisible-squiggles.toggle` - Accessible via Command Palette and status bar button

### Build System

**ESBuild** (`esbuild.js`):

- Entry point: `src/extension.ts`
- Output: `dist/extension.js` (single bundled file)
- Format: CommonJS
- External: `vscode` module
- Production mode: Minified, no sourcemaps
- Development mode: Sourcemaps enabled

**TypeScript** (`tsconfig.json`):

- Target: ES2023
- Module: Node16
- Strict mode enabled
- Output for tests: `out/` directory

### State Management

The extension maintains state through:

1. **Global Settings**: `workbench.colorCustomizations` persisted by VSCode
2. **Hidden State**: Original colors stored as JSON string in `invisibleSquiggles.originalColors`
3. **Status Bar**: Visual indicator of current squiggle visibility

Important: All color updates use `ConfigurationTarget.Global` to affect all workspaces.

## Commit Guidelines

Use Conventional Commits format:

```text
<type>[optional scope]: <description>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`

Examples:

- `feat: add command for selective squiggle type toggling`
- `fix: restore original colors correctly after multiple toggles`
- `docs: update README with keyboard shortcut instructions`

## Release Process

1. Update `CHANGELOG.md` (use `git cliff --unreleased`)
2. Update version in `package.json`
3. Run `npm run release`
4. Commit changes
5. Create signed tag: `git tag -a v<version> -m v<version> -s`
6. Push with tags: `git push --follow-tags`
7. Update GitHub release message when pipeline completes

## Git Hooks

The repository supports both custom git hooks (`.githooks/`) and pre-commit hooks (`.pre-commit-config.yaml`):

- `make enable-pre-commit-only` - Enable pre-commit hooks (requires pre-commit installed)
- `make enable-commit-hooks-only` - Enable custom commit hooks only
- `make disable-git-hooks` - Disable all hooks

Pre-commit hooks include: gitleaks, prettier, markdownlint, typos, codespell, shellcheck, and format validators.

## Codebase Context

**Total Source Files**: 2 TypeScript files

- `src/extension.ts` - Main extension logic
- `src/test/extension.test.ts` - Test suite

**Node Modules**: ~97MB, 11 dev dependencies

**Build Output Directories**:

- `dist/` - ESBuild production bundle
- `out/` - TypeScript test compilation

This is a focused single-purpose extension with minimal complexity. All core logic resides in one file.
