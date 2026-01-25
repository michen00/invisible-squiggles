---
applyTo: Makefile
---

# Makefile Context

## Key Targets

| Target              | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `make build-vsix`   | Package extension (strips SVG badges via `PREPARE_DOCS`) |
| `make install-vsix` | Build + install locally for testing                      |
| `make publish`      | Publish to VS Code Marketplace                           |
| `make develop`      | Setup dev environment (npm install + pre-commit hooks)   |
| `make check`        | Run all tests + prepare-readme validation                |

## PREPARE_DOCS Macro

The `PREPARE_DOCS` macro (lines 59-69) handles marketplace requirements:

1. Backs up README.md and CHANGELOG.md
2. Runs `scripts/prepare-readme.sh` to strip SVG badges (Zenodo)
3. Removes HTML comments and normalizes whitespace
4. Restores originals via trap on exit

## Environment Variables

- `DEBUG=true` - Enable debug output
- `VERBOSE=true` - Enable verbose output
- `WITH_HOOKS=false` - Skip pre-commit setup in `make develop`
