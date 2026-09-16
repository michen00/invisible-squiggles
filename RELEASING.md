<!-- omit in toc -->

# Releasing

<!-- omit in toc -->

## Table of contents

- [Creating a release](#creating-a-release)
- [Publishing](#publishing)
  - [Marketplace auth migration (before 2026-12-01)](#marketplace-auth-migration-before-2026-12-01)
- [Verifying a release](#verifying-a-release)

## Creating a release

1. Prepare the release branch: `make prep-release VERSION=vX.Y.Z`
   - Branches from main, bumps the version in `package.json` and `package-lock.json` via `npm version`, opens a dated changelog section, and runs `make check`.
   - It stops before committing, because the next step is prose.
2. Write the `vX.Y.Z` changelog entry. It starts empty and may stay empty on its own: `cliff.toml` skips `ci`, `build`, `docs`, `test`, `refactor` and `chore`, so a release made only of those generates no entries at all. Say so outright rather than shipping a bare version heading.
3. Optionally smoke-test the build: `make install-vsix`
4. Commit and open a PR:

   ```sh
   git commit -am "chore: release vX.Y.Z"
   git push -u origin release/vX.Y.Z
   gh pr create
   ```

5. Merge the PR into `main` (via GitHub).
6. Get the latest main: `git switch main && git pull`
7. Tag it: `make tag VERSION=vX.Y.Z`
   - Signs with SSH, verifies the signature against `.github/allowed_signers`, and pushes that one tag. It refuses if the version disagrees with `package.json` or with either version field in `package-lock.json`, if you are not on an up-to-date `main`, if the tree is dirty, or if the tag already exists; and it deletes the local tag if verification fails, so an unverifiable tag never reaches the remote.
   - Runs `make verify-reproducible` on the tagged tree before creating the tag, so a packaging break — a missing or LFS-pointer `icon.png`, README preparation, vsce — is caught while nothing has been pushed. `make check` covers none of that, and `prep-release.sh` only ever sees the pre-merge tree. It proves this tree packages and that two builds of it agree; it does not prove the bytes match CI's, since both builds share one `node_modules`.
   - Commits that landed after the release commit are allowed only when `cliff.toml` skips every one of them; git-cliff decides, so there is no second copy of its filtering to drift. A rider that would have earned a changelog entry is refused, because it would ship under notes written before it existed and no later release covers it — v0.2.1 shipped two that way. This check needs git-cliff on `PATH`, and only runs when the tag is not on the commit that bumped the manifest.
   - `SIGNERS_FILE` adds a second allowed-signers file to verify against. It cannot replace `.github/allowed_signers`, which is checked either way, because that is the file users have when they follow [SECURITY.md](SECURITY.md).
   - Use the target rather than tagging by hand. `tag.gpgsign` is deliberately unset here, so a hand-typed `git tag -a` without `-s` produces an unsigned tag that looks identical in `git tag -l`. `git push --follow-tags` is also wider than it appears — it pushes any reachable annotated tag missing from the remote, not just yours.
8. That push starts the `publish extension` workflow in **draft** mode: it builds one VSIX, proves it reproducible, attests it, and leaves a draft release carrying that exact file. Nothing reaches a registry on this path.
9. Review the draft. The generated notes and the attested artifact are both sitting there to be looked at, and a draft can still be deleted — nothing is committed to yet. Edit the notes in the web UI if they need it.
10. Publish it: `make release VERSION=vX.Y.Z`. **This is the irreversible step.** It freezes the release with its asset, starts the Announcements discussion, and fires the same workflow again, which ships that build to the VSCode Marketplace and Open VSX. Neither registry allows replacing a published version.

## Publishing

`.github/workflows/publish.yml` runs twice per release, once per half, and the split exists because of immutable releases: they freeze a release's assets the instant it is published, so the VSIX has to be attached before that, by the thing that builds it.

- **Tag push → draft.** Verifies the tag matches `package.json`, builds the VSIX once via `make package-vsix` (so marketplace README preparation happens exactly one way), proves the build reproducible, attests it, and drafts the release around it. `targets` is `none` here, so neither publish step can run — and the verification gate still executes, reporting both registries as not requested, which is what evidences that.
- **Release published → registries.** The same build, re-derived from the same tag and therefore byte-identical, goes to both registries independently. A failure in one does not withhold the other, and the gate at the end fails the job for any requested registry that did not publish.

Publishing the draft is what connects the two, and it is a human action by design: `make release` refuses to run unless a draft exists and carries a `.vsix`, since publishing a draft without one would freeze it empty.

Repository secrets required:

- `VSCE_PAT`: Azure DevOps personal access token for the VSCode Marketplace. Create it with **Organization: All accessible organizations** and scope **Marketplace → Manage**. Any narrower organization or scope fails with a 401.
- `OVSX_PAT`: Open VSX access token for the `michen00` namespace

### Marketplace auth migration (before 2026-12-01)

Azure DevOps retires global PATs on **2026-12-01**, and a global PAT — one scoped to all accessible organizations — is currently the only kind that can reach the Marketplace. After that date `VSCE_PAT` stops working.

The workflow already supports the replacement. Set two repository **variables** and it switches to Entra ID federated auth via `vsce publish --azure-credential`, storing no long-lived secret:

- `AZURE_CLIENT_ID`: the Entra app registration's client ID
- `AZURE_TENANT_ID`: the Entra tenant ID

Setup requires an Entra app registration, a GitHub federated credential scoped to this repository, and that identity added as a member of the `michen00` Marketplace publisher. Once a publish succeeds that way, delete the `VSCE_PAT` secret. Open VSX is unaffected.

To publish a tag manually — backfilling a release, or retrying after one registry fails — run the workflow via `workflow_dispatch` with a `tag` and a `targets` choice of `both`, `vscode`, or `openvsx`. Target a single registry when retrying, since republishing an already-published version fails.

Manual dispatch only works for **v0.4.0 and later**. `workflow_dispatch` takes the workflow definition from the ref you dispatch on but checks out the tag you name, and the build step calls `make verify-reproducible`. Tags from v0.3.1 back have neither that target nor `scripts/normalize-vsix.mjs`, so the job fails at the build step.

**Do not try to backfill an older version by hand.** `vsce` and `ovsx` take the version from the checked-out `package.json`, so a tree that mixes this tooling with an old tag publishes whichever version that tree happens to declare — not necessarily the one you meant. Both registries refuse to republish a version that already exists, so a wrong number cannot be corrected, only abandoned. If a registry is missing a version, release forward.

Retrying one registry is safe because the package is byte-reproducible. `make package-vsix` pins entry timestamps and Unix modes via `scripts/normalize-vsix.mjs`, and pins `SOURCE_DATE_EPOCH` so vsce also sorts entries, so rebuilding a tag yields identical bytes and both registries end up with the same artifact. Confirm with `make verify-reproducible`, which builds twice — under two different umasks — and compares.

Reproducibility is the only thing preventing that divergence. The attest step has no condition on it, so a retry mints a fresh attestation over whatever it just built; those bytes always pass `gh attestation verify`. Provenance cannot tell you that two registries disagree. Before the pinning, a retry left them holding different bytes, the release asset clobbered with the later build, and one tag carrying two independently valid attestations.

Local fallback (requires `VSCE_PAT` / `OVSX_PAT` in your environment):

```bash
make publish        # VSCode Marketplace only
make publish-ovsx   # Open VSX only
make publish-all    # one build, both registries
```

## Verifying a release

Two independent things are verifiable, and they cover different artifacts.

**The source** — the signed tag. A signed annotated tag commits to the exact source tree through git's hash chain, so it needs no separate signed archive. The trusted public key is committed to `.github/allowed_signers`, so this works offline from a clone:

```bash
git config gpg.ssh.allowedSignersFile .github/allowed_signers
make verify-tag VERSION=vX.Y.Z          # or: git verify-tag vX.Y.Z
```

**The artifact** — keyless build provenance. The publish workflow builds the VSIX once, attests that exact file with `actions/attest-build-provenance` (GitHub OIDC + sigstore, no signing secret), then publishes and attaches that same file:

```bash
gh release download vX.Y.Z --pattern '*.vsix'
gh attestation verify invisible-squiggles-<version>.vsix \
  --repo michen00/invisible-squiggles
```

Note the two are not substitutes. The VSIX ships only a minified `dist/` bundle and no source files, so provenance proves "this bundle was built by this repo's CI at this commit" while the signed tag proves "this is the source the maintainer released." One build is attested, published, and attached, so the attested bytes are the shipped bytes.

**Both together** — the package is byte-reproducible, so the two anchors can be joined. From a clone at a verified tag, rebuild and compare against the published artifact:

```bash
npm ci          # exact lockfile install, matching what CI does
make package-vsix
shasum -a 256 invisible-squiggles-<version>.vsix
# compare against the release asset downloaded above
```

That closes the gap the minified bundle would otherwise leave: the signed tag vouches for the source, and an independent rebuild shows that source really does produce the shipped bytes. Two things are pinned to make this hold across machines — entry timestamps (1980-01-01) and entry Unix modes — because vsce otherwise copies each file's mode from disk, which makes the digest depend on the rebuilder's umask. See `scripts/normalize-vsix.mjs`.

Use `npm ci`, not `npm install`. The bundle is whatever the pinned `esbuild` emits and the zip layout is whatever the pinned `vsce` writes, so a dependency tree that has drifted from `package-lock.json` can legitimately produce a different digest. `make verify-reproducible` checks the weaker, always-true property — that two builds of one tree agree — and is what guards the publish retry path.

Reproducibility is guaranteed _for a given toolchain_, not universally. `package-lock.json` pins `vsce` and `esbuild`, and the publish workflow pins Node exactly (`node-version: 22.23.2`) rather than floating on `22.x`, because the deflate streams come from Node's bundled zlib — which `scripts/normalize-vsix.mjs` never touches, since it does not re-compress. Without that pin a patch bump between the original publish and a `targets:`-scoped retry could change the artifact. Bumping the pin is a deliberate act: it invalidates digest comparison against releases published on the previous version. To reproduce a release locally, match the Node version it was built with, and treat a mismatch as a toolchain difference to investigate before reading it as tampering.
