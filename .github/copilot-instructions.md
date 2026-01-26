# Copilot Instructions for invisible-squiggles

> Keep this concise for Copilot; richer context lives in `AGENTS.md`.

## Fast Facts

- VSCode extension toggles error/warning/info/hint squiggles transparent.
- Command: `invisible-squiggles.toggle`, status bar eye (👁️), global settings only.
- Runtime: Node 20.x/22.x; VSCode (min version from package.json)/stable; ESBuild bundles to `dist/`.
- Main code: `src/extension.ts`. Tests: `src/test/{unit,integration,e2e,helpers}/`.

## Core Commands (preferred order)

```bash
npm install          # setup
npm run compile      # typecheck + lint + bundle (dev)
npm run package      # production bundle
npm run check-types  # type check only
npm run lint         # eslint only
npm test             # all tests (unit+integration+e2e)
npm run test:unit    # fast, mocked VSCode, CI-safe
npm run test:integration # needs VSCode
npm run test:e2e         # needs Extension Dev Host
npm run test:coverage    # coverage (warning thresholds)
npm run watch        # TS + ESBuild watchers
```

Make targets mirror these (`make help`). Use `make build-vsix` / `make install-vsix` for packaging; it temporarily renames `README.md` to avoid vsce auto-include, cleans `dist/*.map`, then restores it.

## Development Flow

- Edit `src/extension.ts`; prefer single-file changes.
- Run `npm run watch` while coding; reload VSCode window (`Cmd/Ctrl+R`) in the Extension Dev Host (F5) to test "Toggle Squiggles".
- After installing a `.vsix` (via `make install-vsix`), run **Developer: Reload Window** (`Cmd/Ctrl+Shift+P`) to load the new version.
- Before commit: `npm run compile`; manual sanity check via F5 is recommended.

## Behavior / Architecture

- Reads `workbench.colorCustomizations`, saves originals in `invisibleSquiggles.originalColors` (JSON string), applies `#00000000` to editor {Error|Warning|Info|Hint} {background|border|foreground}, restores on toggle.
- All writes use `ConfigurationTarget.Global`.

## Validation & CI

- CI runs `npm run test:unit` on Node 20/22 and E2E on VSCode (min version from package.json)/stable.
- Integration/E2E need VSCode runtime; they will fail headless—expected.
- Pre-commit hooks (optional): gitleaks, prettier, markdownlint, shfmt, typos, codespell, shellcheck, JSON/YAML/TOML checks (`make enable-pre-commit-only` to install).

## Common Fixes

- Missing deps → `npm install` (or `make install`).
- Type or lint failures → `npm run compile` / `npm run lint`.
- Stale artifacts → `make rebuild` or `make clean && npm run package`.
- VSIX includes extras → check `.vscodeignore`; README rename handled by `make build-vsix`.
- Command/status bar missing → confirm activation events and command registration in `package.json` + `src/extension.ts`.

## Commit & Release

- Conventional Commits, imperative, ≤50 chars: `feat: add toggle`, `fix: restore colors`, etc.
- Release sketch: update `CHANGELOG.md` + `package.json`, `make rebuild && make check`, `make install-vsix`, then tag/publish (`npx vsce publish`).

## Documentation Hygiene

- Keep `README.md`, `AGENTS.md`, `CLAUDE.md`, and this file consistent. Update README immediately if behavior/commands change.

## When to look elsewhere

- Only search beyond this doc if commands here fail unexpectedly or you hit an unlisted issue. Build system is stable as documented.
