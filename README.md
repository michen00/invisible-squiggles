# invisible-squiggles

The **Invisible Squiggles** VSCode extension allows you to **toggle error, warning, info, and hint squiggles** for a distraction-free coding experience.

![demo](https://github.com/user-attachments/assets/50bce932-ee6a-4422-88d1-a500b81eac57)

<!-- TODO: Add a new demo with the 👁️ status icon. -->

## 🔹 Features

- ✅ **Toggle squiggles on/off** from the **status bar** or **command palette**
- ✅ **Two modes**: Native (simple) or Legacy (per-squiggle-type control)

---

## 🔹 Quickstart

1. [Install the extension](https://marketplace.visualstudio.com/items?itemName=michen00.invisible-squiggles) from the VSCode marketplace.
1. **Toggle squiggles** using one of these methods:

### **Option 1: Using the Status Bar Button**

Click the **👁️ Toggle Squiggles** button at the **bottom right**.

### **Option 2: Using the Command Palette**

1. Press **`Ctrl/Cmd + Shift + P`**.
1. Type **`Toggle Squiggles`**.
1. Select the command to hide/show squiggles.

---

## 🔹 Modes

### Native Mode (Default)

Uses VS Code's built-in `problems.visibility` setting. This is the **recommended** mode for most users.

- ✅ Simple and reliable
- ✅ Toggles all squiggles at once
- ✅ No settings pollution

### Legacy Mode

Uses color customizations to make squiggles transparent. Enable this mode if you need **per-squiggle-type control**.

To enable legacy mode, add to your `settings.json`:

```json
{
  "invisibleSquiggles.mode": "legacy"
}
```

In legacy mode, you can customize which squiggle types to hide:

| Setting                           | Default | Description              |
| --------------------------------- | ------- | ------------------------ |
| `invisibleSquiggles.hideErrors`   | `true`  | Toggle error squiggles   |
| `invisibleSquiggles.hideWarnings` | `true`  | Toggle warning squiggles |
| `invisibleSquiggles.hideInfo`     | `true`  | Toggle info squiggles    |
| `invisibleSquiggles.hideHint`     | `true`  | Toggle hint squiggles    |

## 🔹 Documentation

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/michen00/invisible-squiggles)
