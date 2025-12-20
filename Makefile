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

# Terminal formatting (tput with fallbacks)
_COLOR  := $(shell tput sgr0 2>/dev/null || echo "\033[0m")
BOLD    := $(shell tput bold 2>/dev/null || echo "\033[1m")
CYAN    := $(shell tput setaf 6 2>/dev/null || echo "\033[36m")
GREEN   := $(shell tput setaf 2 2>/dev/null || echo "\033[32m")
RED     := $(shell tput setaf 1 2>/dev/null || echo "\033[31m")
YELLOW  := $(shell tput setaf 3 2>/dev/null || echo "\033[33m")

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

.PHONY: build
build: ## Build the extension
	npm run package

.PHONY: build-vsix
build-vsix: ## Build the extension as a VSIX file
	@set -e; \
	cp .vscodeignore .vscodeignore.bak.vsix && \
	cp README.md README.md.bak.vsix && \
	trap 'if [ -f .vscodeignore.bak.vsix ]; then mv .vscodeignore.bak.vsix .vscodeignore; fi; if [ -f README.md.bak.vsix ]; then mv README.md.bak.vsix README.md; fi; rm -f .vscodeignore.bak.vsix README.md.bak.vsix README.md.tmp' EXIT; \
	echo "*.md" >> .vscodeignore; \
	sed -E 's|\[!\[Ask DeepWiki\]\(https://deepwiki\.com/badge\.svg\)\]\(https://deepwiki\.com/michen00/invisible-squiggles\)|<!-- [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/michen00/invisible-squiggles) -->|' README.md > README.md.tmp && mv README.md.tmp README.md; \
	npx @vscode/vsce package

###############
## Git hooks ##
###############

.PHONY: enable-git-hooks
enable-git-hooks: check-pre-commit configure-git-hooks ## Enable Git hooks
	@set -e; \
        mv .gitconfig .gitconfig.bak && \
        trap 'mv .gitconfig.bak .gitconfig' EXIT; \
        pre-commit install && \
        mv .git/hooks/pre-commit .githooks/pre-commit && \
        echo "pre-commit hooks moved to .githooks/pre-commit"

.PHONY: enable-pre-commit-only
enable-pre-commit-only: check-pre-commit ## Enable pre-commit hooks without enabling commit hooks
	@git config --local --unset include.path > /dev/null 2>&1 || true
	@$(RM) -f .githooks/pre-commit && pre-commit install

.PHONY: enable-commit-hooks-only
enable-commit-hooks-only: configure-git-hooks ## Enable commit hooks without enabling pre-commit hooks
	@$(RM) -f .githooks/pre-commit
	@echo "Enabled commit hooks only"

.PHONY: configure-git-hooks
configure-git-hooks: ## Configure Git to use the hooksPath defined in .gitconfig
	@git config --local include.path ../.gitconfig
	@echo "Configured Git to use hooksPath defined in .gitconfig"

.PHONY: disable-commit-hooks-only
disable-commit-hooks-only: disable-git-hooks enable-commit-hooks-only ## Disable commit hooks and enable pre-commit hooks
	@echo "Disabled commit hooks and enabled pre-commit hooks"

.PHONY: disable-pre-commit-only
disable-pre-commit-only: disable-git-hooks enable-pre-commit-only ## Disable pre-commit hooks and enable commit hooks
	@echo "Disabled pre-commit hooks and enabled commit hooks"

.PHONY: disable-git-hooks
disable-git-hooks: ## Disable the use of Git hooks locally
	@git config --local --unset include.path > /dev/null 2>&1 || true
	@git config --local --unset-all core.hooksPath > /dev/null 2>&1 || true
	@$(RM) -f .git/hooks/pre-commit
	@echo "Disabled Git hooks"

.PHONY: check-pre-commit
check-pre-commit: ## Check if pre-commit is installed
	@command -v pre-commit > /dev/null || (echo "pre-commit is not installed."; exit 1)
