# invisible-squiggles

[vsmarketplace]: https://marketplace.visualstudio.com/items?itemName=michen00.invisible-squiggles

[![VS Marketplace Version](https://vsmarketplacebadges.dev/version-short/michen00.invisible-squiggles.svg?style=plastic)][vsmarketplace]
[![VS Marketplace Installs](https://vsmarketplacebadges.dev/installs-short/michen00.invisible-squiggles.svg?style=plastic)][vsmarketplace]
[![VS Marketplace Rating](https://vsmarketplacebadges.dev/rating-star/michen00.invisible-squiggles.svg?style=plastic)][vsmarketplace]
[![Build Status](https://img.shields.io/github/actions/workflow/status/michen00/invisible-squiggles/ci.yml?style=plastic)](https://github.com/michen00/invisible-squiggles/actions)
[![Coverage](https://img.shields.io/codecov/c/github/michen00/invisible-squiggles?style=plastic)](https://codecov.io/gh/michen00/invisible-squiggles)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=plastic)](CONTRIBUTING.md)
[![License](https://img.shields.io/github/license/michen00/invisible-squiggles?style=plastic)](LICENSE)
[![Open VSX Version](https://img.shields.io/open-vsx/v/michen00/invisible-squiggles?style=plastic)](https://open-vsx.org/extension/michen00/invisible-squiggles)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/michen00/invisible-squiggles?style=plastic)](https://open-vsx.org/extension/michen00/invisible-squiggles)

<!-- [![Maturity](https://img.shields.io/badge/maturity-stable-green?style=plastic)](CHANGELOG.md) -->
<!-- [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.YOUR_ZENODO_ID.svg?style=plastic)](https://doi.org/10.5281/zenodo.YOUR_ZENODO_ID) -->

The **Invisible Squiggles** VSCode extension allows you to **selectively toggle _error_, _warning_, _info_, and _hint_ squiggles** for a distraction-free coding experience.

## 🔹 Features

- ✅ **Toggle squiggles on/off globally or by type** from the **status bar** or **command palette**
- ✅ **Independently control hint, info, warning, and error squiggles**
- ✅ When squiggles are hidden, problem icons in the Problems panel are also made less visible for a fully distraction-free experience.

![demo](https://github.com/user-attachments/assets/50bce932-ee6a-4422-88d1-a500b81eac57)

<!-- TODO: Add a new demo with the 👁️ status icon. -->

### Why not use the built-in "Problems: Visibility" setting?

VS Code's [built-in setting](https://code.visualstudio.com/updates/v1_85#_hide-problem-decorations) (`problems.visibility`) hides all problem decorations when turned off—but it always shows a **warning in the status bar** while they’re hidden. Invisible Squiggles gives you:

- **No forced status bar clutter** — The status bar indicator is optional and can be disabled.
- **Choose subsets** — Hide only errors, only warnings, only info, only hints, or any combination. The built-in option is all-or-nothing.

---

## 🔹 Quickstart

1. Install the extension from the [VSCode marketplace](https://marketplace.visualstudio.com/items?itemName=michen00.invisible-squiggles), or from [Open VSX](https://open-vsx.org/extension/michen00/invisible-squiggles) if you use Cursor, Windsurf, VSCodium, or Gitpod.
1. **Toggle squiggles** using one of these methods:

### **Option 1: Using the Status Bar Button**

Click the **👁️ Toggle Squiggles** button at the **bottom right**.

### **Option 2: Using the Command Palette**

1. Press **`Ctrl/Cmd + Shift + P`**.
1. Type **`Toggle Squiggles`**.
1. Select the command to hide/show squiggles.

### **Option 3: Using a Keyboard Shortcut**

There is no default shortcut, so pick one that suits you:

1. Press **`Ctrl/Cmd + K`** then **`Ctrl/Cmd + S`** to open Keyboard Shortcuts.
1. Search for **`Toggle Squiggles`**.
1. Click the **+** beside it and press your key combination.

Or add it to `keybindings.json` yourself:

```json
{ "key": "ctrl+alt+s", "command": "invisible-squiggles.toggle" }
```

## 🔹 Settings

Everything lives under `invisibleSquiggles` and applies globally.

| Setting                | Default | Effect                                           |
| ---------------------- | ------- | ------------------------------------------------ |
| `hideErrors`           | `true`  | Hide error squiggles when toggling.              |
| `hideWarnings`         | `true`  | Hide warning squiggles when toggling.            |
| `hideInfo`             | `true`  | Hide info squiggles when toggling.               |
| `hideHint`             | `true`  | Hide hint squiggles when toggling.               |
| `showStatusBarMessage` | `false` | Show a brief status bar message on each toggle.  |
| `startHidden`          | `false` | Hide squiggles automatically when VSCode starts. |

The four `hide*` settings choose which squiggle types the toggle acts on — this is the "independently control" part. Set `hideErrors` to `false` and errors stay visible while warnings, info, and hints disappear. Turn all four off and the toggle has nothing to act on.

## ⚠️ Important Notes

- **Manual edits will be overwritten**: When squiggles are hidden, the extension stores your original color customizations and applies transparent colors. Toggling squiggles will overwrite any manual changes you make to these colors while they're hidden.
- **Customizations stored in settings**: Your original color customizations are saved in VS Code's `settings.json`. If this file becomes corrupted, your saved customizations may be lost.
- Users who upgrade while squiggles are hidden may need to toggle twice to reset state.

## 🔹 Documentation [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/michen00/invisible-squiggles)

- [CONTRIBUTING.md](CONTRIBUTING.md) — development setup, the release process, and the dependency-override policy
- [SECURITY.md](SECURITY.md) — reporting a vulnerability, what the extension can touch, and how to verify a release you installed
- [CHANGELOG.md](CHANGELOG.md) — release history
