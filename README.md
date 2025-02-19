# Invisible Squiggles Extension

The **Invisible Squiggles** extension for Visual Studio Code lets you toggle the visibility of editor squiggles (errors, warnings, and informational messages). In addition, it leverages AI-powered suggestions to help you fix TypeScript errors using Hugging Face's **CodeT5** model.

## Features

### Toggle Squiggles
- **Hide** or **restore** error, warning, and info squiggles (underlines) in your editor with a simple command.
- Squiggles are made transparent instead of being completely hidden, making it easier to focus on code while still having visual cues.

### AI-Powered Fix Suggestions
- **AI fixes** are suggested for TypeScript errors using **Salesforce's CodeT5 model** hosted on Hugging Face.
- Once a TypeScript error is detected, the extension fetches an AI-powered suggestion to help fix the issue.
- Suggestions are shown as information messages in VSCode.

## Installation

1. **Install the Extension:**
   - Open VSCode.
   - Go to the **Extensions** view by clicking on the Extensions icon in the Activity Bar.
   - Search for "**Invisible Squiggles**" and click **Install**.

2. **Manual Installation:**
   - Clone this repository to your local machine.
   - Open the extension folder in VSCode.
   - Press `F5` to launch a new VSCode window with the extension loaded.

## Usage

1. **Toggle Squiggles:**
   - Press `Ctrl+Shift+P` to open the command palette.
   - Search for `Invisible Squiggles: Toggle Squiggles`.
   - This will toggle the squiggles' visibility on/off (transparent or restored).

2. **AI Fix Suggestions:**
   - Errors in TypeScript files will trigger an automatic AI suggestion, which will be displayed as an information message.
   - The AI suggestion can help fix issues detected in your code by providing recommended changes.

## 🔄 Similar Extensions
This extension is similar to [Disable Error and Warning Squiggles](https://marketplace.visualstudio.com/items?itemName=modan.disable-error-squiggles) ([repo](https://github.com/danMoksh/disable-error-and-warning-squiggles)), but it **also hides info squiggles** in addition to errors and warnings and includes AI-powered fix suggestions.

## 🖥️ Demo
![Invisible Squiggles Demo](https://github.com/user-attachments/assets/50bce932-ee6a-4422-88d1-a500b81eac57)

## 🛠️ Contributing
Contributions are welcome! To contribute:
1. **Fork** this repository.
2. **Create a new branch** for your feature or fix.
3. **Make your changes** and test them.
4. **Submit a Pull Request (PR)** with a description of your changes.

## 📜 License
This project is licensed under the **MIT License**.

---
Give it a ⭐ on [GitHub](https://github.com/michen00/invisible-squiggles) if you find it useful!
