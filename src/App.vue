<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Editor from './components/Editor.vue'
import Preview from './components/Preview.vue'
import StatusBar from './components/StatusBar.vue'
import TabBar from './components/TabBar.vue'
import FileTree from './components/FileTree.vue'
import Outline from './components/Outline.vue'
import { type MarkdownDocument } from './types/document'
import { open, save, message, ask } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { join, dirname, isAbsolute } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import markdownItFootnote from 'markdown-it-footnote'
// @ts-ignore
import markdownItTaskLists from 'markdown-it-task-lists'
import { useDark, useToggle, useStorage, useIntervalFn, onClickOutside } from '@vueuse/core'
// @ts-ignore
import html2pdf from 'html2pdf.js'
// @ts-ignore
import githubMarkdownCss from 'github-markdown-css/github-markdown.css?inline'
// @ts-ignore
import githubMarkdownLightCss from 'github-markdown-css/github-markdown-light.css?inline'
import SettingsModal from './components/SettingsModal.vue'
import SaveConfirmModal from './components/SaveConfirmModal.vue'
import EmojiPicker from './components/EmojiPicker.vue'
import { useI18n } from 'vue-i18n'
import { updateMenuLanguage } from './utils/menu'
// @ts-ignore
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
// @ts-ignore
import hljsGithubCss from 'highlight.js/styles/github.css?inline'
// @ts-ignore
import hljsGithubDarkCss from 'highlight.js/styles/github-dark.css?inline'

// i18n
const { t } = useI18n()

// Theme
const isDark = useDark()
const toggleDark = useToggle(isDark)

// Documents State
const documents = ref<MarkdownDocument[]>([])
const activeDocId = ref<string | null>(null)

// Computed Active Document
const activeDocument = computed(() => documents.value.find(d => d.id === activeDocId.value))

// UI State
const isFocusMode = ref(false)
const showPreview = ref(true)
const editorWidth = ref(50) // percentage
const currentFolder = useStorage<string | null>('current-folder', null)
const scrollToLine = ref<number | null>(null)
const showSidebar = ref(true)
const showOutline = ref(true)
const showFiles = ref(true)
const showSettings = ref(false)

const toggleOutline = () => {
  showOutline.value = !showOutline.value
  if (showOutline.value) {
    showSidebar.value = true
  }
}
const showEmojiPicker = ref(false)
const showRecentFiles = ref(false)
const recentFilesRef = ref(null)

// Save Confirm Dialog
const showSaveConfirm = ref(false)
const fileToCloseId = ref<string | null>(null)
const isAppClosing = ref(false)
const unlistenCloseRequest = ref<UnlistenFn | null>(null)
let unlistenFileChange: UnlistenFn | null = null

onClickOutside(recentFilesRef, () => {
  showRecentFiles.value = false
})

const editorRef = ref<any>(null)

// Markdown Insertion
const insertEmoji = (emoji: string) => {
  if (!editorRef.value) return
  editorRef.value.insertText(emoji)
  showEmojiPicker.value = false
}

const insertMarkdown = (type: 'table' | 'footnote' | 'tasklist' | 'codeblock') => {
  if (!editorRef.value) return

  let text = ''
  switch (type) {
    case 'table':
      text = '\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n'
      break
    case 'footnote':
      const content = activeDocument.value?.content || ''
      const matches = content.matchAll(/\[\^(\d+)\]/g)
      let maxNum = 0
      for (const match of matches) {
        const num = parseInt(match[1])
        if (!isNaN(num) && num > maxNum) {
          maxNum = num
        }
      }
      const nextNum = maxNum + 1
      text = `[^${nextNum}]\n\n[^${nextNum}]: Footnote text`
      break
    case 'tasklist':
      text = '- [ ] Task item'
      break
    case 'codeblock':
      text = '\n```language\ncode\n```\n'
      break
  }
  
  editorRef.value.insertText(text)
}

// Sidebar Resizing
const sidebarWidth = useStorage('sidebar-width', 250)
const isSidebarResizing = ref(false)
const sidebarStartX = ref(0)
const sidebarStartWidth = ref(0)

const startSidebarResize = (e: MouseEvent) => {
  isSidebarResizing.value = true
  sidebarStartX.value = e.clientX
  sidebarStartWidth.value = sidebarWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  
  window.addEventListener('mousemove', handleSidebarResize)
  window.addEventListener('mouseup', stopSidebarResize)
}

const handleSidebarResize = (e: MouseEvent) => {
  if (!isSidebarResizing.value) return
  const diff = e.clientX - sidebarStartX.value
  const newWidth = sidebarStartWidth.value + diff
  sidebarWidth.value = Math.min(Math.max(newWidth, 150), 600)
}

const stopSidebarResize = () => {
  isSidebarResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', handleSidebarResize)
  window.removeEventListener('mouseup', stopSidebarResize)
}

// Recent Files
const recentFiles = useStorage<string[]>('recent-files', [])
const persistedOpenFiles = useStorage<string[]>('open-files', [])
const lastActiveFilePath = useStorage<string | null>('last-active-file-path', null)

const updateRecentFiles = (path: string) => {
  const files = new Set([path, ...recentFiles.value])
  recentFiles.value = Array.from(files).slice(0, 10)
}

const wordCount = computed(() => {
  const content = activeDocument.value?.content || ''
  if (!content) return 0
  return content.trim().split(/\s+/).filter(w => w.length > 0).length
})

const lineCount = computed(() => {
  const content = activeDocument.value?.content || ''
  if (!content) return 0
  return content.split('\n').length
})

// Cursor Handler
const handleCursorChange = (line: number, col: number) => {
  if (activeDocument.value) {
    activeDocument.value.cursorLine = line
    activeDocument.value.cursorCol = col
  }
}

// Generate ID
const generateId = () => crypto.randomUUID()

// File Operations
const suggestFileName = (content: string): string => {
  if (!content) return 'Untitled'
  
  // Get first line
  const firstLine = content.split('\n')[0].trim()
  if (!firstLine) return 'Untitled'
  
  // Remove markdown syntax
  // Remove headers (#, ##, etc)
  let name = firstLine.replace(/^#+\s+/, '')
  // Remove bold/italic (*, _)
  name = name.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
  // Remove links [text](url) -> text
  name = name.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // Remove code `code` -> code
  name = name.replace(/`([^`]+)`/g, '$1')
  // Remove illegal file characters
  name = name.replace(/[<>:"/\\|?*]/g, '')
  
  return name.trim() || 'Untitled'
}

const newFile = async () => {
  const newDoc: MarkdownDocument = {
    id: generateId(),
    title: 'Untitled',
    content: '',
    filePath: null,
    isModified: false,
    cursorLine: 1,
    cursorCol: 1
  }
  documents.value.push(newDoc)
  activeDocId.value = newDoc.id
}

const loadFile = async (path: string, silent = false) => {
  try {
    // Check if already open
    const existingDoc = documents.value.find(d => d.filePath === path)
    if (existingDoc) {
      activeDocId.value = existingDoc.id
      updateRecentFiles(path)
      return
    }

    const fileContent = await readTextFile(path)
    const fileName = path.split(/[\\/]/).pop() || 'Untitled'
    
    const newDoc: MarkdownDocument = {
      id: generateId(),
      title: fileName,
      content: fileContent,
      filePath: path,
      isModified: false,
      cursorLine: 1,
      cursorCol: 1
    }
    
    documents.value.push(newDoc)
    
    activeDocId.value = newDoc.id
    updateRecentFiles(path)

    // Watch the new file
    await invoke('watch_file', { path }).catch(console.error)
  } catch (error) {
    console.error('Failed to open file:', error)
    if (!silent) {
      await message(`Failed to open file: ${error}`, { title: 'Error', kind: 'error' })
    }
  }
}

const handleLinkClick = async (href: string) => {
  try {
    // Decode URI component to handle spaces and special characters
    const decodedHref = decodeURIComponent(href)
    let targetPath = decodedHref
    
    // If not absolute, resolve relative to current file
    if (!await isAbsolute(decodedHref)) {
      if (activeDocument.value && activeDocument.value.filePath) {
        const dir = await dirname(activeDocument.value.filePath)
        targetPath = await join(dir, decodedHref)
      } else {
        // Cannot resolve relative path for untitled file
        return
      }
    }
    
    await loadFile(targetPath)
  } catch (error) {
    console.error('Failed to handle link click:', error)
  }
}

const openFile = async () => {
  try {
    const selected = await open({
      multiple: false, // Could support multiple later
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
    })
    
    if (selected) {
      await loadFile(selected as string)
    }
  } catch (error) {
    console.error('Failed to open file:', error)
    await message(`Failed to open file: ${error}`, { title: 'Error', kind: 'error' })
  }
}

const openFolder = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    
    if (selected) {
      currentFolder.value = selected as string
      // Optionally verify permissions or just assume it works with scope
    }
  } catch (error) {
    console.error('Failed to open folder:', error)
    await message(`Failed to open folder: ${error}`, { title: 'Error', kind: 'error' })
  }
}

const saveFile = async () => {
  if (!activeDocument.value) return

  if (activeDocument.value.filePath) {
    try {
      await writeTextFile(activeDocument.value.filePath, activeDocument.value.content)
      activeDocument.value.isModified = false
    } catch (error) {
      console.error('Failed to save file:', error)
      await message(`Failed to save file: ${error}`, { title: 'Error', kind: 'error' })
    }
  } else {
    await saveAsFile()
  }
}

const saveAsFile = async () => {
  if (!activeDocument.value) return

  // Determine default path name
  let defaultName = activeDocument.value.title
  if (!activeDocument.value.filePath && activeDocument.value.title === 'Untitled') {
      defaultName = suggestFileName(activeDocument.value.content)
  }

  try {
    const selected = await save({
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      defaultPath: defaultName
    })
    
    if (selected) {
      try {
        await writeTextFile(selected, activeDocument.value.content)
        activeDocument.value.filePath = selected
        activeDocument.value.title = selected.split(/[\\/]/).pop() || 'Untitled'
        activeDocument.value.isModified = false
        updateRecentFiles(selected)
      } catch (writeError) {
        console.error('Failed to write file:', writeError)
        await message(`Failed to write file: ${writeError}`, { title: 'Error', kind: 'error' })
      }
    }
  } catch (error) {
    console.error('Failed to save file as:', error)
    await message(`Failed to save file as: ${error}`, { title: 'Error', kind: 'error' })
  }
}

const closeFile = (id: string) => {
  const index = documents.value.findIndex(d => d.id === id)
  if (index === -1) return

  const doc = documents.value[index]
  if (doc.isModified) {
    fileToCloseId.value = id
    showSaveConfirm.value = true
    return
  }

  forceCloseFile(id)
}

const forceCloseFile = (id: string) => {
  const index = documents.value.findIndex(d => d.id === id)
  if (index === -1) return

  const doc = documents.value[index]
  if (doc.filePath) {
      invoke('unwatch_file', { path: doc.filePath }).catch(console.error)
  }

  documents.value.splice(index, 1)

  if (activeDocId.value === id) {
    if (documents.value.length > 0) {
      const newIndex = Math.min(index, documents.value.length - 1)
      activeDocId.value = documents.value[newIndex].id
    } else {
      activeDocId.value = null
    }
  }
}

const handleSaveConfirm = async () => {
  if (fileToCloseId.value) {
    const doc = documents.value.find(d => d.id === fileToCloseId.value)
    if (doc) {
      const originalActiveId = activeDocId.value
      activeDocId.value = doc.id
      
      await saveFile()
      
      if (doc.isModified) {
         showSaveConfirm.value = false
         isAppClosing.value = false 
         return 
      }
    }
    forceCloseFile(fileToCloseId.value)
  }
  resetConfirmState()
  checkAppClose()
}

const handleDiscardConfirm = () => {
  if (fileToCloseId.value) {
    forceCloseFile(fileToCloseId.value)
  }
  resetConfirmState()
  checkAppClose()
}

const handleCancelConfirm = () => {
  resetConfirmState()
  isAppClosing.value = false
}

const resetConfirmState = () => {
  showSaveConfirm.value = false
  fileToCloseId.value = null
}

const checkAppClose = () => {
  if (isAppClosing.value) {
    const nextModified = documents.value.find(d => d.isModified)
    if (nextModified) {
      fileToCloseId.value = nextModified.id
      showSaveConfirm.value = true
    } else {
      invoke('exit_app')
    }
  }
}

const quitApp = () => {
  const hasModified = documents.value.some(d => d.isModified)
  
  if (hasModified) {
    if (!isAppClosing.value) {
      isAppClosing.value = true
      checkAppClose()
    }
  } else {
    invoke('exit_app')
  }
}

const handleTabSelect = (id: string) => {
  activeDocId.value = id
}

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

// Export
const exportDocument = async (format?: 'pdf' | 'html') => {
  if (!activeDocument.value) return
  
  const title = activeDocument.value.title.replace(/\.(md|markdown)$/i, '') || 'Untitled'
  
  const filters = []
  if (format === 'pdf') {
    filters.push({ name: 'PDF', extensions: ['pdf'] })
  } else if (format === 'html') {
    filters.push({ name: 'HTML', extensions: ['html'] })
  } else {
    filters.push({ name: 'PDF', extensions: ['pdf'] })
    filters.push({ name: 'HTML', extensions: ['html'] })
  }

  try {
    const selected = await save({
      filters,
      defaultPath: title
    })
    
    if (selected) {
      if (selected.endsWith('.pdf')) {
        await exportToPdf(selected)
      } else if (selected.endsWith('.html')) {
        await exportToHtml(selected)
      }
    }
  } catch (error) {
    console.error('Export failed:', error)
    await message(`Export failed: ${error}`, { title: 'Error', kind: 'error' })
  }
}

const exportToHtml = async (path: string) => {
  if (!activeDocument.value) return
  
  const md = new MarkdownIt({
    html: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return '<pre class="hljs"><code>' +
                 hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                 '</code></pre>';
        } catch (__) {}
      }

      return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
  })
    .use(markdownItFootnote)
    .use(markdownItTaskLists)
  const htmlBody = md.render(activeDocument.value.content)
  const title = activeDocument.value.title
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
${githubMarkdownCss}

/* Highlight.js Styles */
${hljsGithubCss}

@media (prefers-color-scheme: dark) {
  ${hljsGithubDarkCss}
}

.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
  }
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #0d1117;
  }
}
</style>
</head>
<body class="markdown-body">
${htmlBody}
</body>
</html>`

  await writeTextFile(path, htmlContent)
}

const exportToPdf = async (path: string) => {
  if (!activeDocument.value) return
  
  const md = new MarkdownIt({
    html: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return '<pre class="hljs"><code>' +
                 hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                 '</code></pre>';
        } catch (__) {}
      }

      return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
  })
    .use(markdownItFootnote)
    .use(markdownItTaskLists)
  const htmlBody = md.render(activeDocument.value.content)
  const title = activeDocument.value.title
  
  // Create a temporary container for PDF generation
  const container = document.createElement('div')
  container.className = 'markdown-body'
  container.style.width = '100%'
  container.style.maxWidth = '800px' // A4 width approx
  container.style.margin = '0 auto'
  container.innerHTML = htmlBody
  
  // Create a wrapper to hold styles and container
  const wrapper = document.createElement('div')
  wrapper.appendChild(container)
  
  // Add styles
  const style = document.createElement('style')
  style.innerHTML = `
    ${githubMarkdownLightCss}
    
    /* Highlight.js Styles */
    ${hljsGithubCss.replace(/\.hljs/g, '.markdown-body .hljs')}
    
    /* Ensure text is visible on white background */
    .markdown-body { 
      color: #24292f; 
      background-color: #ffffff;
      font-size: 12px; 
      line-height: 1.5; 
    }
    h1 { page-break-before: always; }
    h1:first-child { page-break-before: avoid; }
    pre { page-break-inside: avoid; }
    blockquote { page-break-inside: avoid; }
    table { page-break-inside: avoid; }
    img { max-width: 100%; page-break-inside: avoid; }
  `
  wrapper.appendChild(style)
  
  // Options for html2pdf
  const opt = {
    margin: [15, 15, 15, 15], // mm
    filename: title + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  // Save current scroll position
  const scrollPos = window.scrollY

  // Mount to DOM
  wrapper.style.backgroundColor = '#ffffff'
  wrapper.style.width = '800px'
  wrapper.style.minHeight = '100vh'
  wrapper.style.margin = '0 auto' // Center it
  
  // Hide app content temporarily to avoid interference
  const appElement = document.getElementById('app')
  let originalDisplay = ''
  if (appElement) {
    originalDisplay = appElement.style.display
    appElement.style.display = 'none'
  }
  
  document.body.appendChild(wrapper)

  try {
    // Scroll to top
    window.scrollTo(0, 0)
    
    // Small delay to ensure rendering
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const worker = html2pdf().from(wrapper).set(opt).toPdf().get('pdf').then((pdf: any) => {
      const totalPages = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(10)
        pdf.setTextColor(150)
        
        // Header: Title
        pdf.text(title, 15, 10)
        
        // Footer: Page Number
        pdf.text(`Page ${i} of ${totalPages}`, 190, 287, { align: 'right' })
      }
    }).output('arraybuffer')
    
    const buffer = await worker
    await writeFile(path, new Uint8Array(buffer))
    
  } catch (err) {
    throw err
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper)
    }
    // Restore app visibility
    if (appElement) {
      appElement.style.display = originalDisplay
    }
    // Restore scroll position
    window.scrollTo(0, scrollPos)
  }
}

const printDoc = () => {
  window.print()
}

// Resizer Logic
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = editorWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  
  window.addEventListener('mousemove', handleResize)
  window.addEventListener('mouseup', stopResize)
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  const containerWidth = window.innerWidth
  const diff = e.clientX - startX.value
  const newWidth = startWidth.value + (diff / containerWidth) * 100
  editorWidth.value = Math.min(Math.max(newWidth, 20), 80)
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', handleResize)
  window.removeEventListener('mouseup', stopResize)
}

// Keyboard Shortcuts
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'n': e.preventDefault(); newFile(); break;
      case 'o': 
        e.preventDefault(); 
        if (e.shiftKey) openFolder();
        else openFile(); 
        break;
      case 's':
        e.preventDefault();
        if (e.shiftKey) saveAsFile();
        else saveFile();
        break;
      case 'p': e.preventDefault(); printDoc(); break;
      case 'e':
        if (e.shiftKey) {
          e.preventDefault();
          exportDocument();
        }
        break;
      case 'w': e.preventDefault(); if(activeDocId.value) closeFile(activeDocId.value); break;
    }
  }
}

let unlistenMenu: UnlistenFn | null = null

const showAbout = async () => {
    await message('MarkFlow v0.1.0\nA modern Markdown editor built with Tauri and Vue.', { title: 'About MarkFlow', kind: 'info' })
}

// Persistence Watchers
watch(() => documents.value.map(d => d.filePath), (paths) => {
  persistedOpenFiles.value = paths.filter(p => p !== null) as string[]
}, { deep: true })

watch(activeDocument, (doc) => {
  lastActiveFilePath.value = doc?.filePath || null
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  
  // Restore session
  let hasRestored = false
  const pathsToRestore = persistedOpenFiles.value
  
  if (pathsToRestore.length > 0) {
    for (const path of pathsToRestore) {
      if (path) await loadFile(path, true)
    
      // Watch restored files
      // Note: Currently we only watch the active file to save resources, but we could watch all open files if needed.
      // Let's stick to watching active file for now in the watcher logic above (loadFile handles it).
      // Actually loadFile calls watch_file, so if we loop here, we are good.
    }
    
    // Restore active file
    if (lastActiveFilePath.value) {
      const doc = documents.value.find(d => d.filePath === lastActiveFilePath.value)
      if (doc) activeDocId.value = doc.id
    }
    
    if (documents.value.length > 0) hasRestored = true
  }

  // Listen for file changes from backend
  unlistenFileChange = await listen('file-changed', async (event) => {
    const changedPath = event.payload as string
    console.log('File changed event received:', changedPath)
    
    // Normalize path for comparison (replace backslashes with slashes and lowercase)
    const normalize = (p: string) => p.replace(/[\\/]/g, '/').toLowerCase()
    const targetPath = normalize(changedPath)

    // Find document with this path
    const doc = documents.value.find(d => d.filePath && normalize(d.filePath) === targetPath)
    
    if (doc && doc.filePath) {
      // Reload content
      try {
        const content = await readTextFile(doc.filePath)
        
        // Only update if content is different
        if (content !== doc.content) {
            console.log('Reloading content for:', doc.filePath)
            
            // Check if we have unsaved changes
            if (doc.isModified) {
                // Check if dialog is already showing to prevent multiple dialogs
                if (doc.isReloadPromptShowing) return

                doc.isReloadPromptShowing = true
                // Ask user if they want to reload
                const shouldReload = await ask(
                  t('editor.fileChangedReloadMessage'),
                  { 
                    title: t('editor.fileChangedTitle'),
                    kind: 'warning',
                    okLabel: t('dialog.yes'),
                    cancelLabel: t('dialog.no')
                  }
                )
                doc.isReloadPromptShowing = false

                if (shouldReload) {
                  doc.content = content
                  doc.isModified = false 
                }
            } else {
                // If no unsaved changes, auto-update
                doc.content = content
                // It matches disk now
                doc.isModified = false 
            }
        }
      } catch (err) {
        console.error('Failed to reload file:', err)
      }
    }
  })

  if (!hasRestored && documents.value.length === 0) {
    newFile()
  }

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
        case 'help-about': showAbout(); break;
    }
  })

  // Update menu language
  updateMenuLanguage(t)

  // Listen for window close request
  unlistenCloseRequest.value = await getCurrentWindow().onCloseRequested((event) => {
    // Check if any document has modifications
    const hasModified = documents.value.some(d => d.isModified)
    
    if (hasModified) {
      event.preventDefault()
      
      if (!isAppClosing.value) {
        isAppClosing.value = true
        checkAppClose()
      }
    } else {
      // Force exit app
      event.preventDefault()
      invoke('exit_app')
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (unlistenMenu) unlistenMenu()
  if (unlistenCloseRequest.value) unlistenCloseRequest.value()
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e] text-black dark:text-white transition-colors duration-200">
    
    <!-- Toolbar -->
    <div v-if="!isFocusMode" class="h-10 bg-gray-50 dark:bg-[#333333] border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between shrink-0 select-none">
      <div class="flex items-center gap-2">
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.newFile')" @click="newFile">
          <div class="i-carbon-add text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.openFile')" @click="openFile">
          <div class="i-carbon-folder-open text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.openFolder')" @click="openFolder">
          <div class="i-carbon-folder-add text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.save')" @click="saveFile">
          <div class="i-carbon-save text-lg"></div>
        </button>
        
        <div class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertTable')" @click="insertMarkdown('table')">
          <div class="i-carbon-table text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertFootnote')" @click="insertMarkdown('footnote')">
          <div class="i-carbon-quotes text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertTaskList')" @click="insertMarkdown('tasklist')">
          <div class="i-carbon-checkbox-checked text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertCodeBlock')" @click="insertMarkdown('codeblock')">
          <div class="i-carbon-code text-lg"></div>
        </button>

        <div class="relative">
          <button 
            class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            :class="{ 'bg-gray-200 dark:bg-gray-700': showEmojiPicker }" 
            :title="t('toolbar.insertEmoji')" 
            @click="showEmojiPicker = !showEmojiPicker"
          >
            <div class="i-carbon-face-satisfied text-lg"></div>
          </button>
          <EmojiPicker 
            v-if="showEmojiPicker" 
            class="absolute top-full left-0 mt-1 z-50"
            @select="insertEmoji"
            @close="showEmojiPicker = false"
          />
        </div>

        <div class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

        <button 
          class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" 
          :class="{ 'bg-gray-200 dark:bg-gray-700': showSidebar }"
          :title="t('toolbar.toggleSidebar')" 
          @click="showSidebar = !showSidebar"
        >
          <div class="i-carbon-side-panel-open text-lg"></div>
        </button>
        
        <!-- Recent Files Dropdown Trigger -->
        <div class="relative" ref="recentFilesRef">
           <button 
             class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1" 
             :class="{ 'bg-gray-200 dark:bg-gray-700': showRecentFiles }"
             :title="t('toolbar.recentFiles')"
             @click="showRecentFiles = !showRecentFiles"
           >
            <div class="i-carbon-time text-lg"></div>
          </button>
          <div 
            v-if="showRecentFiles"
            class="absolute top-full left-0 mt-1 min-w-64 w-auto max-w-[80vw] bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50"
          >
            <div v-if="recentFiles.length === 0" class="p-2 text-sm text-gray-500">{{ t('toolbar.noRecentFiles') }}</div>
            <div 
              v-for="file in recentFiles" 
              :key="file"
              class="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer whitespace-nowrap"
              @click="loadFile(file); showRecentFiles = false"
            >
              {{ file }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
         <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="isDark ? t('toolbar.lightMode') : t('toolbar.darkMode')" @click="toggleDark()">
          <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" class="text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="showPreview ? t('toolbar.hidePreview') : t('toolbar.showPreview')" @click="showPreview = !showPreview">
          <div :class="showPreview ? 'i-carbon-open-panel-filled-right' : 'i-carbon-open-panel-right'" class="text-lg"></div>
        </button>
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :class="{ 'bg-gray-200 dark:bg-gray-700': showOutline }" :title="showOutline ? t('toolbar.hideOutline') : t('toolbar.showOutline')" @click="toggleOutline()">
          <div class="i-carbon-tree-view-alt text-lg"></div>
        </button>
         <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.focusMode')" @click="isFocusMode = true">
          <div class="i-carbon-center-to-fit text-lg"></div>
        </button>
      </div>
    </div>


    <TabBar 
      v-if="!isFocusMode && documents.length > 0"
      :documents="documents"
      :active-id="activeDocId"
      @select="handleTabSelect"
      @close="closeFile"
    />

    <!-- Main Area with Sidebars -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar (File Tree & Outline) -->
      <aside 
        v-if="!isFocusMode && showSidebar && (currentFolder || showOutline)" 
        class="border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-[#252526] shrink-0"
        :style="{ width: `${sidebarWidth}px` }"
      >
         <!-- Files Section -->
         <div 
           v-if="currentFolder" 
           class="flex flex-col min-h-0 transition-[flex-grow] duration-200" 
           :class="[showFiles ? 'flex-1' : 'flex-none']"
         >
            <div 
              class="flex items-center px-2 py-1.5 bg-gray-100 dark:bg-[#333333] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
              @click="showFiles = !showFiles"
            >
               <div class="i-carbon-chevron-right transform transition-transform text-gray-500" :class="{ 'rotate-90': showFiles }"></div>
               <span class="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex-1 truncate" :title="currentFolder">{{ currentFolder.split(/[\\/]/).pop() }}</span>
               <div class="flex items-center">
                 <button class="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded" @click.stop="currentFolder = null" :title="t('toolbar.closeFolder')">
                    <div class="i-carbon-close text-xs"></div>
                 </button>
               </div>
            </div>
            <div v-show="showFiles" class="flex-1 overflow-y-auto custom-scrollbar">
               <FileTree :path="currentFolder" @file-click="(path) => loadFile(path)" />
            </div>
         </div>

         <!-- Outline Section -->
         <div 
            class="flex flex-col min-h-0 border-t border-gray-200 dark:border-gray-700 transition-[flex-grow] duration-200" 
            :class="[showOutline ? 'flex-1' : 'flex-none']"
         >
            <div 
              class="flex items-center px-2 py-1.5 bg-gray-100 dark:bg-[#333333] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
              @click="showOutline = !showOutline"
            >
               <div class="i-carbon-chevron-right transform transition-transform text-gray-500" :class="{ 'rotate-90': showOutline }"></div>
               <span class="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{{ t('menu.toggleOutline') }}</span>
            </div>
            <div v-show="showOutline" class="flex-1 overflow-hidden">
               <Outline v-if="activeDocument" :content="activeDocument.content" @jump="(line) => scrollToLine = line" />
               <div v-else class="text-sm text-gray-400 p-4 text-center">{{ t('outline.noActiveFile') || 'No active file' }}</div>
            </div>
         </div>
      </aside>

      <!-- Sidebar Resizer -->
      <div 
        v-if="!isFocusMode && showSidebar && (currentFolder || showOutline)"
        class="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize z-20 shrink-0"
        @mousedown="startSidebarResize"
      ></div>

      <!-- Center Content -->
      <div class="flex-1 flex flex-col min-w-0 relative">
        <div v-if="activeDocument" class="flex-1 flex w-full h-full">
          <!-- Editor Pane -->
          <div 
            class="h-full flex flex-col"
            :style="{ width: showPreview ? `${editorWidth}%` : '100%' }"
          >
            <Editor 
              ref="editorRef"
              :key="activeDocument.id"
              :model-value="activeDocument.content"
              :scroll-to-line="scrollToLine ?? undefined"
              :initial-cursor-line="activeDocument.cursorLine"
              :initial-cursor-col="activeDocument.cursorCol"
              @update:model-value="(val) => { if(activeDocument) { activeDocument.content = val; activeDocument.isModified = true; } }"
              @cursor-change="handleCursorChange"
            />
          </div>
          
          <!-- Resizer Handle -->
          <div 
            v-if="showPreview"
            class="w-1 h-full bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
            @mousedown="startResize"
          ></div>
          
          <!-- Preview Pane -->
          <div 
            v-if="showPreview"
            class="h-full bg-white dark:bg-[#0d1117] overflow-hidden"
            :style="{ width: `${100 - editorWidth}%` }"
          >
            <Preview 
              :content="activeDocument.content" 
              :cursor-line="activeDocument.cursorLine"
              @link-click="handleLinkClick"
              @update:content="(newContent) => { if(activeDocument) { activeDocument.content = newContent; activeDocument.isModified = true; } }"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex-1 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <div class="i-carbon-document text-6xl mb-4 mx-auto"></div>
            <p>No open files</p>
            <div class="flex gap-4 mt-4 justify-center">
              <button class="text-blue-500 hover:underline" @click="newFile">New File</button>
              <button class="text-blue-500 hover:underline" @click="openFile">Open File</button>
              <button class="text-blue-500 hover:underline" @click="openFolder">Open Folder</button>
            </div>
          </div>
        </div>
        
        <!-- Focus Mode Exit Button (Floating) -->
        <button 
          v-if="isFocusMode"
          class="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full opacity-0 hover:opacity-100 transition-opacity shadow-lg z-50"
          title="Exit Focus Mode"
          @click="isFocusMode = false"
        >
          <div class="i-carbon-minimize text-lg"></div>
        </button>
      </div>
    </div>
    
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
