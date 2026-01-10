# AGENTS.md

This file contains **agent-focused** instructions for working on this repository (build/test/dev workflow, conventions, and key architecture notes).

For more context, see `README.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` (these documents should be consistent with each other).

## Project overview

**invisible-squiggles** is a VSCode extension that toggles **error, warning, info, and hint** squiggles for distraction-free coding.

It works by manipulating VSCode’s `workbench.colorCustomizations` setting to make diagnostic squiggles transparent by setting colors to `#00000000`.

## Key user-facing behavior

- **Command**: `invisible-squiggles.toggle` (“Toggle Squiggles”) via Command Palette and status bar button (👁️)
- **Squiggle types**: Hint, Info, Warning, Error
- **Persistence**: updates are written to **global** settings (`ConfigurationTarget.Global`)

## Development commands

Install dependencies:

```bash
npm install
```

Type-check + lint + build (development):

```bash
npm run compile
```

Production build (optimized bundle):

```bash
npm run package
```

Watch mode (TypeScript + ESBuild watchers):

```bash
npm run watch
```

Type check only:

```bash
npm run check-types
```

Lint only:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

**Note**: Unit tests (`npm run test:unit`) run without VSCode and work in CI. Integration and E2E tests require the VSCode runtime.

### Testing Infrastructure

The project includes comprehensive testing infrastructure:

**Test Types**:

- **Unit tests** (`npm run test:unit`): Fast tests (< 5 seconds) with mocked VSCode APIs, located in `src/test/unit/`
- **Integration tests** (`npm run test:integration`): Tests with real VSCode APIs, located in `src/test/integration/`
- **E2E tests** (`npm run test:e2e`): Full Extension Development Host tests, located in `src/test/e2e/`
- **Coverage** (`npm run test:coverage`): Generates coverage reports with per-metric threshold warnings

**Test Structure**:

```tree
src/test/
├── unit/              # Unit tests (mocked APIs)
├── integration/       # Integration tests (real APIs)
├── e2e/               # End-to-end tests (Extension Host)
└── helpers/           # Test utilities and mocks
```

**Running Tests**:

- `npm run test:unit` - Run unit tests only (fast, no VSCode required)
- `npm run test:integration` - Run integration tests (requires VSCode)
- `npm run test:e2e` - Run E2E tests (requires Extension Development Host)
- `npm run test:coverage` - Run all tests with coverage report

## Manual verification (recommended after changes)

- Press `F5` in VSCode to launch an Extension Development Host
- Run “Toggle Squiggles” (Command Palette: `Ctrl/Cmd+Shift+P`)
- Verify:
  - The status bar eye (👁️) appears
  - Toggling hides/shows configured squiggle types
- Reload with `Ctrl/Cmd+R` after code changes

## Architecture notes (how it works)

- **Main entry point**: `src/extension.ts`
- The extension:
  - Reads current `workbench.colorCustomizations`
  - Stores original squiggle colors in `invisibleSquiggles.originalColors` (JSON string)
  - Applies transparent colors (`#00000000`) to configured squiggle color keys
  - Restores original colors when toggled back

## Conventions

- **Language**: TypeScript (strict)
- **Build**: ESBuild bundles to `dist/` (CommonJS; `vscode` is external)

### Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

- **Imperative mood**: "add feature" (not "added feature" or "adds feature")
- **Lowercase after colon**: first word is typically lowercase
- **Summary line**: ≤ 50 characters
- If the body is included:
  - **Single blank line**: Leave a single blank line between the summary and the body
  - **Body lines**: ≤ 72 characters

**Format**: `<type>[optional scope]: <description>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`

**Examples**:

- `refactor!: consolidate redundant configurations`
- `fix: restore colors after multiple toggles`
- `docs(README.md): describe keyboard shortcuts`
