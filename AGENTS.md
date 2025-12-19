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

**Note**: tests require the VSCode runtime and are expected to fail in headless/CI environments.

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
- **Commits**: Conventional Commits (examples: `feat: ...`, `fix: ...`, `docs: ...`)
