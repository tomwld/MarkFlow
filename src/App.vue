<script setup lang="ts">
import { onMounted, onUnmounted, watch, provide } from 'vue'
import StatusBar from './components/StatusBar.vue'
import TabBar from './components/TabBar.vue'
import Toolbar from './components/Toolbar.vue'
import SettingsModal from './components/SettingsModal.vue'
import SaveConfirmModal from './components/SaveConfirmModal.vue'
import Workspace from './components/Workspace.vue'
import { useI18n } from 'vue-i18n'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { message } from '@tauri-apps/plugin-dialog'
import { useDark, useToggle, useIntervalFn } from '@vueuse/core'
import { writeTextFile } from '@tauri-apps/plugin-fs'

import { useDocuments } from './composables/useDocuments'
import { useFileOperations } from './composables/useFileOperations'
import { useLayout } from './composables/useLayout'
import { useExport } from './composables/useExport'
import { useFileWatcher } from './composables/useFileWatcher'
import { useAppLifecycle } from './composables/useAppLifecycle'
import { useEditor } from './composables/useEditor'
import { useShortcuts } from './composables/useShortcuts'
import { updateMenuLanguage } from './utils/menu'
// @ts-ignore
import markdownHelpEn from './assets/markdown-en.md?raw'
// @ts-ignore
import markdownHelpZh from './assets/markdown-zh.md?raw'

// Composables
const { t, locale } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)

const { insertMarkdown } = useEditor()
// const showEmojiPickerFromMenu = ref(false)

const { 
  documents, 
  activeDocId, 
  activeDocument, 
  wordCount, 
  lineCount,
  setActiveDocument
} = useDocuments()

const { 
  newFile, 
  loadFile, 
  openFile, 
  openFolder, 
  saveFile, 
  saveAsFile, 
  persistedOpenFiles,
  lastActiveFilePath
} = useFileOperations()

const { 
  isFocusMode, 
  showSidebar, 
  showPreview, 
  showSettings, 
  showEmojiPicker,
  toggleOutline
} = useLayout()

const { exportDocument } = useExport()
const { startFileWatcher, stopFileWatcher } = useFileWatcher()

const {
  showSaveConfirm,
  fileToCloseId,
  closeFile,
  handleSaveConfirm,
  handleDiscardConfirm,
  handleCancelConfirm,
  quitApp,
  initCloseRequestListener
} = useAppLifecycle()

const { registerShortcuts, unregisterShortcuts } = useShortcuts()

// Provide emoji picker control to children
provide('showEmojiPickerFromMenu', showEmojiPicker)

let unlistenMenu: UnlistenFn | null = null
let unlistenCloseRequest: UnlistenFn | null = null

const showAbout = async () => {
    await message('MarkFlow v0.1.0\nA modern Markdown editor built with Tauri and Vue.', { title: 'About MarkFlow', kind: 'info' })
}

const openMarkdownSyntax = () => {
    newFile()
    if (activeDocument.value) {
        const title = locale.value === 'zh-CN' ? 'Markdown 语法' : 'Markdown Syntax'
        const content = locale.value === 'zh-CN' ? markdownHelpZh : markdownHelpEn
        
        activeDocument.value.title = title
        activeDocument.value.content = content
        activeDocument.value.isModified = false
    }
}

// Watchers
watch(() => documents.value.map(d => d.filePath), (paths) => {
  persistedOpenFiles.value = paths.filter(p => p !== null) as string[]
}, { deep: true })

watch(activeDocument, (doc) => {
  lastActiveFilePath.value = doc?.filePath || null
})

// Auto Save (Every 5 mins)
useIntervalFn(() => {
  documents.value.forEach(async (doc) => {
    if (doc.filePath && doc.isModified) {
      try {
        await writeTextFile(doc.filePath, doc.content)
        doc.isModified = false
      } catch (e) {
        console.error('Auto-save failed for', doc.filePath, e)
      }
    }
  })
}, 5 * 60 * 1000)

onMounted(async () => {
  registerShortcuts()
  
  // Restore session
  let hasRestored = false
  const pathsToRestore = persistedOpenFiles.value
  
  if (pathsToRestore.length > 0) {
    for (const path of pathsToRestore) {
      if (path) await loadFile(path, true)
    }
    
    // Restore active file
    if (lastActiveFilePath.value) {
      const doc = documents.value.find(d => d.filePath === lastActiveFilePath.value)
      if (doc) setActiveDocument(doc.id)
    }
    
    if (documents.value.length > 0) hasRestored = true
  }

  if (!hasRestored && documents.value.length === 0) {
    newFile()
  }

  // Start File Watcher
  await startFileWatcher(t)

  // Check for startup file (from file association or command line)
  const startupFile = await invoke<string | null>('get_startup_file')
  if (startupFile) {
    await loadFile(startupFile)
  }

  // Listen for Menu Events
  unlistenMenu = await listen('menu-event', (event) => {
    switch (event.payload) {
        case 'file-new': newFile(); break;
        case 'file-open': openFile(); break;
        case 'file-open-folder': openFolder(); break;
        case 'file-save': saveFile(); break;
        case 'file-save-as': saveAsFile(); break;
        case 'file-quit': quitApp(); break;
        case 'file-export-pdf': exportDocument('pdf'); break;
        case 'file-export-html': exportDocument('html'); break;
        case 'file-close': if (activeDocId.value) closeFile(activeDocId.value); break;
        case 'view-toggle-sidebar': showSidebar.value = !showSidebar.value; break;
        case 'view-toggle-outline': toggleOutline(); break;
        case 'view-toggle-preview': showPreview.value = !showPreview.value; break;
        case 'view-toggle-theme': toggleDark(); break; 
        case 'view-toggle-focus': isFocusMode.value = !isFocusMode.value; break;
        case 'view-settings': showSettings.value = true; break;
        case 'insert-table': insertMarkdown('table'); break;
        case 'insert-footnote': insertMarkdown('footnote'); break;
        case 'insert-tasklist': insertMarkdown('tasklist'); break;
        case 'insert-codeblock': insertMarkdown('codeblock'); break;
        case 'insert-link': insertMarkdown('link'); break;
        case 'insert-image': insertMarkdown('image'); break;
        case 'insert-emoji': showEmojiPicker.value = true; break;
        case 'help-markdown-syntax': openMarkdownSyntax(); break;
        case 'help-about': showAbout(); break;
    }
  })

  updateMenuLanguage(t)

  unlistenCloseRequest = await initCloseRequestListener()
})

onUnmounted(() => {
  unregisterShortcuts()
  if (unlistenMenu) unlistenMenu()
  if (unlistenCloseRequest) unlistenCloseRequest()
  stopFileWatcher()
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e] text-black dark:text-white transition-colors duration-200">
    
    <Toolbar />

    <TabBar 
      v-if="!isFocusMode && documents.length > 0"
      :documents="documents"
      :active-id="activeDocId"
      @select="setActiveDocument"
      @close="closeFile"
    />

    <!-- Main Workspace -->
    <Workspace />
    
    <!-- Status Bar -->
    <StatusBar 
      v-if="!isFocusMode"
      :word-count="wordCount"
      :line-count="lineCount"
      :cursor-line="activeDocument?.cursorLine"
      :cursor-col="activeDocument?.cursorCol"
      :file-path="activeDocument?.filePath"
    />
    
    <SettingsModal 
      :show="showSettings" 
      @close="showSettings = false"
    />
    
    <SaveConfirmModal 
      :show="showSaveConfirm"
      :file-name="documents.find(d => d.id === fileToCloseId)?.title || 'Untitled'"
      @save="handleSaveConfirm"
      @discard="handleDiscardConfirm"
      @cancel="handleCancelConfirm"
    />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Dark Theme for Highlight.js */
.dark .hljs { color: #c9d1d9; background: #0d1117 }
.dark .hljs-doctag, .dark .hljs-keyword, .dark .hljs-meta .hljs-keyword, .dark .hljs-template-tag, .dark .hljs-template-variable, .dark .hljs-type, .dark .hljs-variable.language_ { color: #ff7b72 }
.dark .hljs-title, .dark .hljs-title.class_, .dark .hljs-title.class_.inherited__, .dark .hljs-title.function_ { color: #d2a8ff }
.dark .hljs-attr, .dark .hljs-attribute, .dark .hljs-literal, .dark .hljs-meta, .dark .hljs-number, .dark .hljs-operator, .dark .hljs-variable, .dark .hljs-selector-attr, .dark .hljs-selector-class, .dark .hljs-selector-id { color: #79c0ff }
.dark .hljs-regexp, .dark .hljs-string, .dark .hljs-meta .hljs-string { color: #a5d6ff }
.dark .hljs-built_in, .dark .hljs-symbol { color: #ffa657 }
.dark .hljs-comment, .dark .hljs-code, .dark .hljs-formula { color: #8b949e }
.dark .hljs-name, .dark .hljs-quote, .dark .hljs-selector-tag, .dark .hljs-selector-pseudo { color: #7ee787 }
.dark .hljs-subst { color: #c9d1d9 }
.dark .hljs-section { color: #1f6feb; font-weight: bold }
.dark .hljs-bullet { color: #f2cc60 }
.dark .hljs-emphasis { color: #c9d1d9; font-style: italic }
.dark .hljs-strong { color: #c9d1d9; font-weight: bold }
.dark .hljs-addition { color: #aff5b4; background-color: #033a16 }
.dark .hljs-deletion { color: #ffdcd7; background-color: #67060c }

@media print {
  .flex-col {
    display: block;
  }
  .h-10, .w-1, .absolute, .h-6, .flex-1.flex.items-center.justify-center { /* Hide toolbar, resizer, floating buttons, status bar, empty state */
    display: none !important;
  }
  /* Hide TabBar */
  .bg-gray-100.dark\:bg-\[\#252526\].border-b {
    display: none !important;
  }
  
  /* Hide Editor, show Preview full width */
  div[style*="width"] {
     width: 100% !important;
  }
  
  /* We need to specifically target the editor container to hide it */
  .flex-1 > div > div:first-child {
    display: none;
  }
  
  /* And show the preview container */
  .flex-1 > div > div:last-child {
    display: block;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }
}
</style>
