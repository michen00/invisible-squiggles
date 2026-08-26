# Security policy

## Reporting a vulnerability

Report it privately: **[open a draft security advisory](https://github.com/michen00/invisible-squiggles/security/advisories/new)**. Private vulnerability reporting is enabled on this repository, so the report stays between you and the maintainer until there is a fix to publish.

Please don't open a public issue for a suspected vulnerability.

Include whatever you would want if you were the one fixing it: the extension version, your editor and its version, and the smallest reproduction you can manage.

## Supported versions

Fixes go into the next release. Older versions are not patched, because both registries refuse to replace a version that already exists — the only way to ship a fix is to release forward.

## What this extension can reach

Worth stating plainly, since the extension's whole job is editing your settings.

It writes to your **global** `settings.json`, and only one key within it: `workbench.colorCustomizations`, where it sets diagnostic squiggle colours to transparent and restores them. It reads two: the rest of that same key, solely to preserve customizations that aren't its own, and `invisibleSquiggles.*`, its own configuration, which it never writes.

It makes no network requests, spawns no processes, and reads no files. It has no runtime dependencies at all — `dependencies` in [package.json](package.json) is empty, and the packaged extension contains only a bundled `dist/`, so nothing from `node_modules` reaches your machine.

The consequence worth knowing is in the README: while squiggles are hidden, manual edits to those specific colour keys get overwritten on the next toggle.

## Verifying a release

Two independent checks that prove different things.

**The source.** Release tags from v0.2.0 onward are signed. A signed annotated tag commits to the exact source tree through git's hash chain, and the trusted public key is committed to [.github/allowed_signers](.github/allowed_signers), so this works offline from a clone:

```sh
git config gpg.ssh.allowedSignersFile .github/allowed_signers
git verify-tag vX.Y.Z
```

**The artifact.** Releases from v0.4.0 onward are built once in GitHub Actions and attested with [`actions/attest-build-provenance`](https://github.com/actions/attest-build-provenance) — GitHub OIDC plus sigstore, no signing secret anywhere. Earlier tags predate that workflow and have no attestation to check. Run this against a `.vsix` taken from either registry, or from the release page for v0.4.1 and later, where the workflow attaches the attested file to the draft before publishing freezes it:

```sh
gh attestation verify invisible-squiggles-<version>.vsix --repo michen00/invisible-squiggles
```

Neither substitutes for the other. The VSIX ships a minified bundle and no source, so provenance proves _this bundle was built by this repository's CI at this commit_, while the signed tag proves _this is the source the maintainer released_. Bridging them is the build being reproducible: `make verify-reproducible` packages twice under different umasks and fails if the bytes differ, so the same tag rebuilt elsewhere yields the artifact that was attested.

See [CONTRIBUTING.md](CONTRIBUTING.md#creating-a-release) for how releases are cut.
