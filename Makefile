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

# Common logic for preparing README for marketplace (strip untrusted SVG badges and Documentation section)
define PREPARE_DOCS
	set -e; \
    trap 'if [ -f README.md.bak ]; then mv README.md.bak README.md; fi; if [ -f CHANGELOG.md.bak ]; then mv CHANGELOG.md.bak CHANGELOG.md; fi' EXIT; \
    mv README.md README.md.bak; \
    cp CHANGELOG.md CHANGELOG.md.bak; \
    src/bin/prepare-readme.sh README.md.bak README.md; \
    perl -i -0777 -pe 's/<!--.*?-->//gs; s/^\n+//; s/\n\n\n+/\n\n/g; s/\n+$$/\n/' README.md CHANGELOG.md; \
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

.PHONY: build-vsix
build-vsix: install ## Build the extension as a VSIX file
	@$(PREPARE_DOCS); \
    npx vsce package

.PHONY: install-vsix
install-vsix: build-vsix ## Build and install VSIX locally for testing
	code --install-extension *.vsix

.PHONY: publish
publish: install ## Publish the extension to the VS Code Marketplace
	@$(PREPARE_DOCS); \
    npx vsce publish

.PHONY: update-unreleased
update-unreleased: ## Update the Unreleased section of CHANGELOG.md and commit
	@scripts/update-unreleased.sh --commit

.PHONY: release
release: ## Create a GitHub release (VERSION=vX.Y.Z)
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=vX.Y.Z"; exit 1; fi
	@git rev-parse --verify refs/tags/$(VERSION) >/dev/null 2>&1 || { echo "Error: Tag $(VERSION) does not exist"; exit 1; }
	gh release create $(VERSION) --generate-notes --discussion-category "Announcements"

.PHONY: check
check: install ## Run checks and tests
	npm run test
	scripts/test-prepare-readme.sh

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
