# MarkFlow

<div align="center">
  <img src="./app-icon.svg" alt="MarkFlow Logo" width="120" />
  <p>一个纯粹、现代、轻量且功能丰富的Markdown 编辑器，基于 Tauri、Vue 3 和 TypeScript 构建， 提供流畅的输入体验。</p>
  
  [English](./README.md) | **简体中文**
</div>

## ✨ 特性

- **📝 现代编辑器**: 基于 CodeMirror 6 构建，提供流畅的输入体验和语法高亮。
- **👀 实时预览**: 即时 Markdown 渲染，支持滚动同步和光标位置同步。
- **🌗 主题切换**: 原生支持明亮和暗黑模式。
- **📂 文件管理**: 
  - 集成文件树和大纲视图（可切换侧边栏部分）。
  - **右键菜单支持**: 在文件树中右键进行新建文件/文件夹、重命名、删除及在资源管理器中显示等操作。
  - 标签页式编辑界面。
  - 自动保存和会话持久化（启动时恢复打开的文件）。
  - 最近打开的文件历史记录。
  - 新文件“智能命名”（基于内容自动生成文件名）。
- **🖥️ 系统集成**:
  - **文件关联**: 直接打开 `.md`、`.markdown` 和 `.txt` 文件。
  - **上下文菜单**: 资源管理器中支持“使用 MarkFlow 打开”选项。
- **🛠️ 生产力工具**:
  - **专注模式**: 无干扰写作体验。
  - **交互式预览**: 预览窗口支持点击任务列表和链接。
  - **代码高亮**: 预览窗口支持代码块语法高亮。
  - **表情选择器**: 轻松在文档中插入表情符号。
  - **工具栏快捷键**: 快速插入表格、脚注、任务列表和代码块。
  - **状态栏**: 实时显示字数、行数和光标位置。
- **🌍 国际化**: 完整支持英语和简体中文。
- **📤 导出**: 将文档导出为带样式的 HTML 和 PDF 文件。

## ⌨️ 快捷键

| 快捷键 | 动作 |
|----------|--------|
| `Ctrl/Cmd + N` | 新建文件 |
| `Ctrl/Cmd + O` | 打开文件 |
| `Ctrl/Cmd + Alt + O` | 打开文件夹 |
| `Ctrl/Cmd + S` | 保存文件 |
| `Ctrl/Cmd + Alt + S` | 另存为 |
| `Ctrl/Cmd + P` | 切换预览 |
| `Ctrl/Cmd + Alt + P` | 导出 PDF |
| `Ctrl/Cmd + Alt + H` | 导出 HTML |
| `Ctrl/Cmd + B` | 切换侧边栏 |
| `Ctrl/Cmd + Alt + B` | 切换大纲 |
| `Ctrl/Cmd + E` | 表情选择器 |
| `Ctrl/Cmd + T` | 插入表格 |
| `Ctrl/Cmd + Alt + F` | 插入脚注 |
| `Ctrl/Cmd + L` | 插入任务列表 |
| `Ctrl/Cmd + Alt + C` | 插入代码块 |
| `Ctrl/Cmd + K` | 插入链接 |
| `Ctrl/Cmd + I` | 插入图片 |
| `F11` | 切换专注模式 |

## 🛠️ 技术栈

- **核心**: [Tauri v2](https://tauri.app/) (Rust + WebView)
- **前端**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **样式**: [UnoCSS](https://unocss.dev/) (Atomic CSS)
- **状态管理**: Vue Composition API + [VueUse](https://vueuse.org/)
- **编辑器引擎**: [CodeMirror](https://codemirror.net/)
- **Markdown 解析**: [markdown-it](https://github.com/markdown-it/markdown-it)

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/) (包管理器)
- [Rust](https://www.rust-lang.org/) (用于 Tauri 后端)

### 安装

1. 克隆仓库:
   ```bash
   git clone https://github.com/yourusername/MarkFlow.git
   cd MarkFlow
   ```

2. 安装依赖:
   ```bash
   pnpm install
   ```

### 开发

启动带有热重载的开发服务器:

```bash
pnpm tauri dev
```

### 构建

构建生产环境应用:

```bash
pnpm tauri build
```

可执行文件将位于 `src-tauri/target/release/bundle/` 目录下。

## 📂 项目结构

```
MarkFlow/
├── src/                 # 前端源代码
│   ├── components/      # Vue 组件 (编辑器, 预览, 侧边栏等)
│   ├── data/            # 静态数据 (Emojis 等)
│   ├── locales/         # i18n 翻译文件
│   ├── utils/           # 工具函数
│   ├── App.vue          # 主应用组件
│   └── main.ts          # 应用入口点
├── src-tauri/           # Rust 后端源代码
│   ├── src/             # Rust 源文件
│   ├── tauri.conf.json  # Tauri 配置
│   └── Cargo.toml       # Rust 依赖
└── uno.config.ts        # UnoCSS 配置
```

## 📄 许可证

[MIT](LICENSE)
