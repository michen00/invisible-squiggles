---
applyTo: .github/workflows/*.yml
---

# CI Workflow Context

## Test Matrix

- **Unit tests**: Run on Node 20/22, no VSCode runtime needed
- **E2E tests**: Require VSCode Extension Host (ubuntu/macos, VSCode stable+minimum)

## Key Commands

- `npm run test:unit` - Fast tests (<5s), mocked VSCode APIs
- `npm run test:e2e` - Requires VSCode runtime
- `npm run compile` - Type check + lint + bundle

## Packaging

Use `make build-vsix` (not raw `npx vsce package`) to strip SVG badges that violate marketplace policy.

## Pre-commit

Workflows use `pre-commit run --all-files`. The `prek` alias is supported if installed.
