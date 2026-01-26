# CLAUDE.md

Guidance for Claude Code. For full details, see `AGENTS.md`.

## Quick Reference

```bash
npm run compile      # Build (type-check + lint + bundle)
npm run test:unit    # Fast tests (<5s, no VSCode needed)
npm run package      # Production build
make build-vsix      # Package vsix (strips SVG badges)
make install-vsix    # Build + install locally
```

## What This Extension Does

VSCode extension that toggles diagnostic squiggles (errors, warnings, info, hints) by setting `workbench.colorCustomizations` colors to `#00000000` (transparent).

## Architecture (Single File)

**Entry point**: `src/extension.ts` — all logic is here.

**Core flow**:

1. `activate()` → registers command + status bar item
2. `toggleSquiggles()` → stores original colors in `invisibleSquiggles.originalColors`, applies transparent colors
3. `setStatus()` → updates status bar icon (👁️)

**Color keys managed** (for each type: Error, Warning, Info, Hint):

- `editor{Type}.background`
- `editor{Type}.border`
- `editor{Type}.foreground`

**Critical**: All updates use `ConfigurationTarget.Global`.

## Testing

- **Unit tests** (`src/test/unit/`): Mocked VSCode APIs, run anywhere
- **Integration/E2E**: Require VSCode runtime, skip in CI
- Press `F5` in VSCode to test manually

## Commits

Conventional Commits format. Imperative mood, lowercase after colon, ≤50 char summary.

```text
feat|fix|docs|refactor|test|chore: description
```

## Don't

- Don't add new dependencies without good reason
- Don't create new files for small changes — this is a single-file extension
- Don't run integration/E2E tests in CI (they need VSCode)
