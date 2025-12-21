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

# Terminal formatting (tput with fallbacks)
_COLOR  := $(shell tput sgr0 2>/dev/null || echo "\033[0m")
BOLD    := $(shell tput bold 2>/dev/null || echo "\033[1m")
CYAN    := $(shell tput setaf 6 2>/dev/null || echo "\033[36m")
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

#######################
## Build and install ##
#######################

.PHONY: install
WITH_PRECOMMIT ?= true
install: ## Install npm dependencies
	npm install
	@if [ "$(WITH_PRECOMMIT)" = "true" ]; then \
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
	@set -e; \
        trap 'if [ -f README.md.hidden ]; then mv README.md.hidden README.md; fi' EXIT; \
        mv README.md README.md.hidden; \
        rm -f dist/*.map; \
        npx vsce package

.PHONY: install-vsix
install-vsix: build-vsix ## Build and install VSIX locally for testing
	code --install-extension *.vsix

.PHONY: check
check: install ## Run checks and tests
	npm run test

.PHONY: clean
TO_REMOVE := \
    .vscode-test \
    *.vsix \
    coverage \
    dist \
    node_modules \
    out \
    README.md.hidden
clean: ## Remove build artifacts and temporary files
	@echo $(TO_REMOVE) | xargs -n 1 -P 4 $(RM)

######################
## Pre-commit hooks ##
######################

.PHONY: enable-pre-commit
enable-pre-commit: ## Enable pre-commit hooks (along with commit-msg and pre-push hooks)
	@pre-commit install --hook-type commit-msg --hook-type pre-commit --hook-type pre-push

.PHONY: run-pre-commit
run-pre-commit: ## Run the pre-commit checks
	$(PRECOMMIT) run --all-files
