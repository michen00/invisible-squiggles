.ONESHELL:

DEBUG    ?= false
VERBOSE  ?= false

ifeq ($(DEBUG),true)
    MAKEFLAGS += --debug=v
    RM_FLAGS = -v
else
    ifeq ($(VERBOSE),true)
        MAKEFLAGS += --verbose
        RM_FLAGS := -v
    else
        MAKEFLAGS += --silent
    endif
endif

RM_FLAGS := -rf$(if $(or $(DEBUG),$(VERBOSE)),v,)
RM := rm $(RM_FLAGS)
PROJECT_NAME ?= invisible-squiggles
SIGNERS_FILE ?= .github/allowed_signers

# Recursively expanded so `node` only runs for the recipes that package a VSIX,
# not on every make invocation.
VSIX_NAME = $(PROJECT_NAME)-$(shell node -p "require('./package.json').version").vsix

# 1980-01-01T00:00:00Z, matching the DOS epoch scripts/normalize-vsix.mjs pins.
# Passed to vsce because it gates entry SORTING, not just mtimes: unset, vsce
# emits files in glob/readdir order, which differs across filesystems (APFS
# returns sorted names, ext4 returns hash order) and would break reproducibility
# across machines. Assigned with := so an inherited environment value cannot
# change the digest.
VSIX_EPOCH := 315532800

PRECOMMIT ?= pre-commit
ifneq ($(shell command -v prek >/dev/null 2>&1 && echo y),)
    PRECOMMIT := prek
    ifneq ($(filter true,$(DEBUG) $(VERBOSE)),)
        $(info Using prek for pre-commit checks)
        ifeq ($(DEBUG),true)
            PRECOMMIT := $(PRECOMMIT) -v
        endif
    endif
endif

# Terminal formatting (tput with fallbacks to ANSI codes)
_COLOR  := $(shell tput sgr0 2>/dev/null || printf '\033[0m')
BOLD    := $(shell tput bold 2>/dev/null || printf '\033[1m')
CYAN    := $(shell tput setaf 6 2>/dev/null || printf '\033[0;36m')
YELLOW  := $(shell tput setaf 3 2>/dev/null || printf '\033[0;33m')
RED     := $(shell tput setaf 1 2>/dev/null || printf '\033[0;31m')

.DEFAULT_GOAL := help
.PHONY: help
help: ## Show this help message
	@echo "$(BOLD)Available targets:$(_COLOR)"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
        awk 'BEGIN {FS = ":.*?## "; max = 0} \
            {if (length($$1) > max) max = length($$1)} \
            {targets[NR] = $$0} \
            END {for (i = 1; i <= NR; i++) { \
                split(targets[i], arr, FS); \
                printf "$(CYAN)%-*s$(_COLOR) %s\n", max + 2, arr[1], arr[2]}}'
	@echo
	@echo "$(BOLD)Environment variables:$(_COLOR)"
	@echo "  $(YELLOW)DEBUG$(_COLOR) = true|false    Set to true to enable debug output (default: false)"
	@echo "  $(YELLOW)VERBOSE$(_COLOR) = true|false  Set to true to enable verbose output (default: false)"

#######################
## Build and install ##
#######################

# Common logic for preparing README for marketplace: strip untrusted SVG badges and the
# repository-only Documentation section, make every remaining link absolute, and refuse
# to package a listing that points at anything its reader could not reach.
define PREPARE_DOCS
	set -e; \
    trap 'for f in README.md CHANGELOG.md; do [ -f "$$f.bak" ] && mv "$$f.bak" "$$f"; done' EXIT; \
    mv README.md README.md.bak; \
    cp CHANGELOG.md CHANGELOG.md.bak; \
    scripts/prepare-readme.sh README.md.bak README.md; \
    for f in README.md CHANGELOG.md; do \
        perl -0777 -pe 's/<!--.*?-->//gs; s/^\n+//; s/\n\n\n+/\n\n/g; s/\n+$$/\n/' "$$f" > "$$f.tmp" && mv "$$f.tmp" "$$f"; \
    done; \
    rm -f dist/*.map
endef

.PHONY: install
install: ## Install npm dependencies
	npm install

.PHONY: develop
WITH_HOOKS ?= true
develop: install ## Install the project for development (WITH_HOOKS={true|false}, default=true)
	@git config --local blame.ignoreRevsFile .git-blame-ignore-revs
	@set -e; \
    if command -v git-lfs >/dev/null 2>&1; then \
        git lfs install --local --skip-repo || true; \
    fi; \
    current_branch=$$(git branch --show-current); \
    stash_was_needed=0; \
    cleanup() { \
        exit_code=$$?; \
        if [ "$$current_branch" != "$$(git branch --show-current)" ]; then \
            echo "$(YELLOW)Warning: Still on $$(git branch --show-current). Attempting to return to $$current_branch...$(_COLOR)"; \
            if git switch "$$current_branch" 2>/dev/null; then \
                echo "Successfully returned to $$current_branch"; \
            else \
                echo "$(YELLOW)Could not return to $$current_branch. You are on $$(git branch --show-current).$(_COLOR)"; \
            fi; \
        fi; \
        if [ $$stash_was_needed -eq 1 ] && git stash list | head -1 | grep -q "Auto stash before switching to main"; then \
            echo "$(YELLOW)Note: Your stashed changes are still available. Run 'git stash pop' to restore them.$(_COLOR)"; \
        fi; \
        exit $$exit_code; \
    }; \
    trap cleanup EXIT; \
    if ! git diff --quiet || ! git diff --cached --quiet; then \
        git stash push -m "Auto stash before switching to main"; \
        stash_was_needed=1; \
    fi; \
    git switch main && git pull; \
    if command -v git-lfs >/dev/null 2>&1; then \
        git lfs pull || true; \
    fi; \
    git switch "$$current_branch"; \
    if [ $$stash_was_needed -eq 1 ]; then \
        if git stash apply; then \
            git stash drop; \
        else \
            echo "$(RED)Error: Stash apply had conflicts. Resolve them, then run: git stash drop$(_COLOR)"; \
        fi; \
    fi; \
    trap - EXIT
	@if [ "$(WITH_HOOKS)" = "true" ]; then \
        $(MAKE) enable-pre-commit; \
    fi

.PHONY: uninstall
uninstall: ## Uninstall extension from VSCode
	code --uninstall-extension michen00.invisible-squiggles

.PHONY: build
build: install ## Build the extension
	npm run package

.PHONY: rebuild
rebuild: clean build ## Clean and build from scratch

# vsce packages a Git LFS pointer silently, shipping an extension whose icon is
# ASCII text, so fail loudly instead. Absence is checked separately: `head` on a
# missing file fails inside the pipe, and grep then reports "no match", so a
# pointer-only test would succeed on a missing icon and fail open.
.PHONY: check-assets
check-assets: ## Verify packaged assets exist and are not LFS pointers
	@if [ ! -r icon.png ]; then \
	    echo "$(RED)Error: icon.png is missing or unreadable.$(_COLOR)"; \
	    exit 1; \
	fi
	@if head -c 45 icon.png | grep -q 'git-lfs.github.com'; then \
	    echo "$(RED)Error: icon.png is a Git LFS pointer, not a PNG.$(_COLOR)"; \
	    echo "Run 'git lfs install && git lfs pull' to materialise it."; \
	    exit 1; \
	fi

# Split so CI can package without a second dependency install: it already runs
# `npm ci`, and routing through build-vsix would re-run `npm install` on top.
#
# The normalise step pins entry timestamps so the output is byte-reproducible;
# without it a rebuild of the same commit differs, and a partial publish retry
# would ship bytes the provenance attestation does not cover. See
# scripts/normalize-vsix.mjs and `make verify-reproducible`.
.PHONY: package-vsix
package-vsix: check-assets ## Package the VSIX (assumes dependencies installed)
	@$(PREPARE_DOCS); \
    SOURCE_DATE_EPOCH=$(VSIX_EPOCH) npx vsce package; \
    node scripts/normalize-vsix.mjs "$(VSIX_NAME)"

.PHONY: build-vsix
build-vsix: install ## Install dependencies and package the VSIX
	@$(MAKE) package-vsix

.PHONY: install-vsix
install-vsix: build-vsix ## Build and install VSIX locally for testing
	code --install-extension *.vsix

# All three publish paths ship the normalised artifact. A bare `vsce publish` /
# `ovsx publish` packages internally, which skips both the timestamp/mode pinning
# and the pinned SOURCE_DATE_EPOCH -- so a local publish would push bytes that
# differ from what CI builds and attests for the same commit.
.PHONY: publish
publish: build-vsix ## Publish the extension to the VS Code Marketplace
	@npx vsce publish --packagePath "$(VSIX_NAME)"

.PHONY: publish-ovsx
publish-ovsx: build-vsix ## Publish the extension to Open VSX
	@npx ovsx publish "$(VSIX_NAME)"

# Publishes one build to both registries so they receive identical bytes.
.PHONY: publish-all
publish-all: build-vsix ## Publish the built VSIX to both registries
	@set -e; \
    vsix="$(VSIX_NAME)"; \
    if [ ! -f "$$vsix" ]; then echo "Error: $$vsix not found"; exit 1; fi; \
    npx vsce publish --packagePath "$$vsix"; \
    npx ovsx publish "$$vsix"

# Guards the retry path in .github/workflows/publish.yml: publishing one registry
# on a re-dispatch rebuilds the VSIX, so a rebuild that differs would leave the
# two registries hosting bytes that disagree with each other and with the
# attestation. Two builds of one tree must be byte-identical.
#
# The two builds run under *different umasks* on purpose. vsce copies each
# on-disk file's mode into the zip, so a naive same-shell double build shares one
# umask and is blind to mode variance -- the exact failure that makes a third
# party's rebuild of a signed tag mismatch the published artifact. dist is
# removed between builds because esbuild overwriting an existing file keeps that
# file's old mode, which would mask the difference.
#
# Deliberately does not depend on `install`, matching package-vsix: CI already
# runs `npm ci`, and adding the prerequisite would re-run `npm install` on top.
# Run `make install verify-reproducible` from a fresh clone.
.PHONY: verify-reproducible
verify-reproducible: ## Verify two builds produce identical bytes (assumes dependencies installed)
	@set -e; \
    vsix="$(VSIX_NAME)"; \
    first=$$(mktemp); \
    trap 'rm -f "$$first"' EXIT; \
    for mask in 022 077; do \
        $(RM) dist; \
        ( umask $$mask; $(MAKE) package-vsix ); \
        if [ "$$mask" = "022" ]; then cp "$$vsix" "$$first"; fi; \
    done; \
    if cmp -s "$$first" "$$vsix"; then \
        echo "$(CYAN)Reproducible: builds under umask 022 and 077 are byte-identical.$(_COLOR)"; \
    else \
        echo "$(RED)Error: builds under umask 022 and 077 differ ($$vsix).$(_COLOR)"; \
        exit 1; \
    fi

.PHONY: update-unreleased
update-unreleased: ## Update the Unreleased section of CHANGELOG.md and commit
	@scripts/update-unreleased.sh --commit

# The two mechanical halves of cutting a release. Between them they replace the
# steps that were hand-typed, and only those: deciding what the changelog says,
# reviewing the draft, and publishing it stay manual on purpose.
#
# VERSION is quoted on the way through so the value reaches the script as one
# argument whatever it contains. Unquoted, `VERSION="v1.0.0 x"` arrives as two
# arguments and the script reports a wrong argument count instead of a malformed
# version -- the guard still holds, but it names the wrong problem.
.PHONY: prep-release
prep-release: ## Branch, bump the version, open a changelog section, check (VERSION=vX.Y.Z)
	@if [ -z "$(VERSION)" ]; then echo "Usage: make prep-release VERSION=vX.Y.Z"; exit 1; fi
	@scripts/prep-release.sh "$(VERSION)"

.PHONY: tag
tag: ## Sign, verify, and push a release tag, drafting the release (VERSION=vX.Y.Z)
	@if [ -z "$(VERSION)" ]; then echo "Usage: make tag VERSION=vX.Y.Z"; exit 1; fi
	@SIGNERS_FILE="$(SIGNERS_FILE)" scripts/release-tag.sh "$(VERSION)"

# Verifies a release tag against the committed public key in
# .github/allowed_signers. The signed tag is the source-authenticity anchor;
# built artifacts carry keyless provenance instead (see CONTRIBUTING.md).
.PHONY: verify-tag
verify-tag: ## Verify a release tag's signature (VERSION=vX.Y.Z)
	@if [ -z "$(VERSION)" ]; then echo "Usage: make verify-tag VERSION=vX.Y.Z"; exit 1; fi
	@git -c gpg.ssh.allowedSignersFile=$(SIGNERS_FILE) verify-tag $(VERSION)

# Publishes the draft that pushing the tag already created; it does not create a
# release. The publish workflow owns the artifact end to end -- it builds the VSIX
# once, attests that exact file, and attaches it to the draft -- because building
# or uploading here too would mean the attested bytes are not the shipped bytes.
#
# This is still the release gate, and still the irreversible step: publishing the
# draft freezes it and fires the workflow that pushes to both registries, neither
# of which allows replacing a published version. What changed is that the draft
# now exists first, so the gate can be walked up to and looked at.
.PHONY: release
release: ## Publish the drafted release (VERSION=vX.Y.Z)
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=vX.Y.Z"; exit 1; fi
	@git rev-parse --verify refs/tags/$(VERSION) >/dev/null 2>&1 || { echo "Error: Tag $(VERSION) does not exist"; exit 1; }
	@gh release view $(VERSION) --json isDraft --jq .isDraft 2>/dev/null | grep -qx true || { \
		echo "Error: no draft release for $(VERSION)."; \
		echo "Push the tag and let the publish workflow draft it:"; \
		echo "  git push origin refs/tags/$(VERSION)"; \
		echo "Already published? Then it is done, or retry a registry with:"; \
		echo "  gh workflow run publish.yml -f tag=$(VERSION) -f targets=both"; \
		exit 1; }
	@gh release view $(VERSION) --json assets --jq '.assets[].name' | grep -q '\.vsix$$' || { \
		echo "Error: the $(VERSION) draft carries no VSIX."; \
		echo "Publishing now would freeze it that way -- assets cannot be added"; \
		echo "to a published release, though a draft still accepts them."; \
		echo "Re-trigger the draft build (same tag object, same signature):"; \
		echo "  git push --delete origin $(VERSION) && git push origin $(VERSION)"; \
		exit 1; }
	gh release edit $(VERSION) --draft=false --discussion-category "Announcements"
	@echo "Published $(VERSION). The publish workflow now ships it to both registries."

.PHONY: test
# Chained under one `set -e`. This file sets .ONESHELL, so the whole recipe goes
# to a single shell and make checks only the LAST line's status -- as separate
# lines, a failing test above the final one exits 0 on GNU Make 4.x (ubuntu-latest,
# Homebrew gmake). macOS ships make 3.81, which predates .ONESHELL and runs each
# line separately, so the masking is invisible locally. `make check` depends on
# this target and is the documented pre-release gate.
test: install ## Run tests
	@set -e; \
    npm run pretest; \
    npm run test; \
    scripts/test-prepare-readme.sh; \
    scripts/test-normalize-vsix.sh; \
    scripts/test-check-pr-title.sh; \
    scripts/test-release-tag.sh

.PHONY: lint
lint: install ## Run linters
	npm run lint

.PHONY: format
format: lint run-pre-commit ## Run code formatters

.PHONY: check
check: format test ## Run checks and tests
	npm run check-types

.PHONY: clean
TO_REMOVE := \
    .vscode-test \
    *.vsix \
    coverage \
    dist \
    node_modules \
    out \
    README.md.bak
clean: ## Remove build artifacts and temporary files
	@echo $(TO_REMOVE) | xargs -n 1 -P 4 $(RM)

######################
## Pre-commit hooks ##
######################

.PHONY: enable-pre-commit
enable-pre-commit: ## Enable pre-commit hooks (along with commit-msg and pre-push hooks)
	@if command -v pre-commit >/dev/null 2>&1; then \
        pre-commit install --hook-type commit-msg --hook-type pre-commit --hook-type pre-push --hook-type prepare-commit-msg ; \
    else \
        echo "$(YELLOW)Warning: pre-commit is not installed. Skipping hook installation.$(_COLOR)"; \
        echo "Install it with: pip install pre-commit (or brew install pre-commit on macOS)"; \
    fi

.PHONY: run-pre-commit
run-pre-commit: ## Run the pre-commit checks
	$(PRECOMMIT) run --all-files
