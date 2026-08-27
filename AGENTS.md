# AGENTS.md

This file provides agent-focused instructions for working on this repository. Project-specific details are marked as examples.

For more context, see `README.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` (these documents should be consistent with each other).

## Project overview

**Example project**: VSCode extension that toggles error, warning, info, and hint squiggles by setting `workbench.colorCustomizations` colors to `#00000000`.

**Key behavior**:

- Command: `invisible-squiggles.toggle` via Command Palette and status bar (👁️)
- Squiggle types: Hint, Info, Warning, Error
- Persistence: global settings (`ConfigurationTarget.Global`)

## Development commands

Adapt commands to your project structure.

```bash
npm install          # Install dependencies
npm run compile      # Type-check + lint + build (dev)
npm run package      # Production build (optimized bundle)
npm run watch        # Watch mode (TypeScript + ESBuild)
npm run check-types  # Type check only
npm run lint         # Lint only
npm test             # Run all tests
```

**Note**: Unit tests (`npm run test:unit`) run without VSCode and work in CI. Integration and E2E tests require the VSCode runtime.

### Make Targets

```bash
make build-vsix      # Package vsix (strips SVG badges for marketplace)
make install-vsix    # Build + install locally
make develop         # Setup: npm install + pre-commit hooks
make check           # Run all tests + validation
```

**Important:** After installing a `.vsix`, run **Developer: Reload Window** to load the new version.

### Testing Infrastructure

**Example test types**:

- **Unit tests** (`npm run test:unit`): Fast (< 5s), mocked APIs, located in `src/test/unit/`
- **Integration tests** (`npm run test:integration`): Real APIs, located in `src/test/integration/`
- **E2E tests** (`npm run test:e2e`): Extension Development Host, located in `src/test/e2e/`
- **Coverage** (`npm run test:coverage`): Coverage reports with threshold warnings
- **Tooling suites** (`scripts/test-*.sh`, `scripts/test-*.cjs`, run by `make test`): cover repository
  tooling -- release guards, the PR-title checker, the CI gate contract -- not the extension. They need
  no VSCode host and live beside what they test, deliberately outside `src/test/`.

**Example structure**:

```tree
src/test/
├── unit/              # Unit tests (mocked APIs)
├── integration/       # Integration tests (real APIs)
├── e2e/               # End-to-end tests (Extension Host)
└── helpers/           # Test utilities and mocks
```

## Manual verification

Test changes before committing.

**Example (VSCode extension)**:

1. Press `F5` to launch Extension Development Host
2. Run "Toggle Squiggles" (Command Palette: `Ctrl/Cmd+Shift+P`)
3. Verify status bar icon (👁️) appears and toggling works
4. Reload with `Ctrl/Cmd+R` after code changes

## Architecture notes

Describe entry points, data flow, and key files.

**Example architecture**:

1. **Entry point**: `src/extension.ts`
2. Read current `workbench.colorCustomizations`
3. Store original colors in `invisibleSquiggles.originalColors` (JSON string)
4. Apply transparent colors (`#00000000`) to configured squiggle color keys
5. Restore original colors when toggled back

## Conventions

**Example**:

- **Language**: TypeScript (strict)
- **Build**: ESBuild bundles to `dist/` (CommonJS; `vscode` is external)

### Commit Guidelines

Follow project's commit standard.

**Example (Conventional Commits)**:

- Format: `<type>[optional scope]: <description>`
- Imperative mood, lowercase after colon, ≤50 char summary
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`
- Examples: `refactor!: consolidate redundant configurations`, `fix: restore colors after multiple toggles`, `docs(README.md): describe keyboard shortcuts`

## Guidance

- Use explicit, structured instructions with absolute file paths
- Cite code with line numbers when referencing existing code
- Keep instructions concise to preserve context window
