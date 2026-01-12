# MarkFlow

<div align="center">
  <img src="./app-icon.svg" alt="MarkFlow Logo" width="120" />
  <p>A modern, lightweight, and feature-rich Markdown editor built with Tauri, Vue 3, and TypeScript.</p>

  **English** | [简体中文](./README_zh-CN.md)
</div>

## ✨ Features

- **📝 Modern Editor**: Built on CodeMirror 6, offering a smooth typing experience with syntax highlighting.
- **👀 Real-time Preview**: Instant Markdown rendering with synchronized scrolling and cursor positioning.
- **🌗 Themeable**: Native support for Light and Dark modes.
- **📂 File Management**: 
  - Integrated File Tree and Outline view (Toggleable sidebar sections).
  - **Context Menu Support**: Right-click in the file tree to create new files/folders, rename, delete, and reveal in explorer.
  - Tabbed editing interface.
  - Auto-save and session persistence (restores open files on launch).
  - Recent files history.
  - "Smart Naming" for new files based on content.
- **🖥️ System Integration**:
  - **File Associations**: Directly open `.md`, `.markdown`, and `.txt` files.
  - **Context Menu**: "Open with MarkFlow" option in File Explorer.
- **🛠️ Productivity Tools**:
  - **Focus Mode**: Distraction-free writing.
  - **Interactive Preview**: Clickable task lists and links in the preview window.
  - **Code Highlighting**: Syntax highlighting for code blocks in both editor and preview.
  - **Emoji Picker**: Easily insert emojis into your documents.
  - **Toolbar Shortcuts**: Quick access to tables, footnotes, task lists, and code blocks.
  - **Status Bar**: Real-time word count, line count, and cursor position.
- **🌍 Internationalization**: Full support for English and Simplified Chinese (简体中文).
- **📤 Export**: Export documents to styled HTML and PDF.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New File |
| `Ctrl/Cmd + O` | Open File |
| `Ctrl/Cmd + Alt + O` | Open Folder |
| `Ctrl/Cmd + S` | Save File |
| `Ctrl/Cmd + Alt + S` | Save As |
| `Ctrl/Cmd + P` | Toggle Preview |
| `Ctrl/Cmd + Alt + P` | Export to PDF |
| `Ctrl/Cmd + Alt + H` | Export to HTML |
| `Ctrl/Cmd + B` | Toggle Sidebar |
| `Ctrl/Cmd + Alt + B` | Toggle Outline |
| `Ctrl/Cmd + E` | Open Emoji Picker |
| `Ctrl/Cmd + T` | Insert Table |
| `Ctrl/Cmd + Alt + F` | Insert Footnote |
| `Ctrl/Cmd + L` | Insert Task List |
| `Ctrl/Cmd + Alt + C` | Insert Code Block |
| `Ctrl/Cmd + K` | Insert Link |
| `Ctrl/Cmd + I` | Insert Image |
| `F11` | Toggle Focus Mode |

## 🛠️ Tech Stack

- **Core**: [Tauri v2](https://tauri.app/) (Rust + WebView)
- **Frontend**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [UnoCSS](https://unocss.dev/) (Atomic CSS)
- **State Management**: Vue Composition API + [VueUse](https://vueuse.org/)
- **Editor Engine**: [CodeMirror](https://codemirror.net/)
- **Markdown Parsing**: [markdown-it](https://github.com/markdown-it/markdown-it)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/) (Package Manager)
- [Rust](https://www.rust-lang.org/) (for Tauri backend)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MarkFlow.git
   cd MarkFlow
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

Start the development server with hot-reload:

```bash
pnpm tauri dev
```

### Build

Build the application for production:

```bash
pnpm tauri build
```

The executable will be located in `src-tauri/target/release/bundle/`.

## 📂 Project Structure

```
MarkFlow/
├── src/                 # Frontend source code
│   ├── components/      # Vue components (Editor, Preview, Sidebar, etc.)
│   ├── data/            # Static data (Emojis, etc.)
│   ├── locales/         # i18n translation files
│   ├── utils/           # Utility functions
│   ├── App.vue          # Main application component
│   └── main.ts          # Application entry point
├── src-tauri/           # Rust backend source code
│   ├── src/             # Rust source files
│   ├── tauri.conf.json  # Tauri configuration
│   └── Cargo.toml       # Rust dependencies
└── uno.config.ts        # UnoCSS configuration
```

## 📄 License

[MIT](LICENSE)
