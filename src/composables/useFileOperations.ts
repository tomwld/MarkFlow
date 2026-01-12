import { open, save, message } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { join, dirname, isAbsolute } from '@tauri-apps/api/path'
import { useStorage } from '@vueuse/core'
import { useDocuments } from './useDocuments'

export function useFileOperations() {
  const { 
    documents, 
    activeDocument, 
    createDocument, 
    addDocument, 
    getDocumentByPath, 
    removeDocument,
    setActiveDocument 
  } = useDocuments()

  // Persisted State
  const recentFiles = useStorage<string[]>('recent-files', [])
  const currentFolder = useStorage<string | null>('current-folder', null)
  const persistedOpenFiles = useStorage<string[]>('open-files', [])
  const lastActiveFilePath = useStorage<string | null>('last-active-file-path', null)

  const updateRecentFiles = (path: string) => {
    const files = new Set([path, ...recentFiles.value])
    recentFiles.value = Array.from(files).slice(0, 10)
  }

  const suggestFileName = (content: string): string => {
    if (!content) return 'Untitled'
    const firstLine = content.split('\n')[0].trim()
    if (!firstLine) return 'Untitled'
    let name = firstLine.replace(/^#+\s+/, '')
    name = name.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    name = name.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    name = name.replace(/`([^`]+)`/g, '$1')
    name = name.replace(/[<>:"/\\|?*]/g, '')
    return name.trim() || 'Untitled'
  }

  const newFile = async () => {
    const newDoc = createDocument()
    addDocument(newDoc)
  }

  const loadFile = async (path: string, silent = false) => {
    try {
      const existingDoc = getDocumentByPath(path)
      if (existingDoc) {
        setActiveDocument(existingDoc.id)
        updateRecentFiles(path)
        return
      }

      const fileContent = await readTextFile(path)
      const fileName = path.split(/[\\/]/).pop() || 'Untitled'
      
      const newDoc = createDocument(fileName, fileContent, path)
      addDocument(newDoc)
      updateRecentFiles(path)

      await invoke('watch_file', { path }).catch(console.error)
    } catch (error) {
      console.error('Failed to open file:', error)
      if (!silent) {
        await message(`Failed to open file: ${error}`, { title: 'Error', kind: 'error' })
      }
    }
  }

  const openFile = async () => {
    try {
      const selected = await open({
        multiple: false,
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
      }
    } catch (error) {
      console.error('Failed to open folder:', error)
      await message(`Failed to open folder: ${error}`, { title: 'Error', kind: 'error' })
    }
  }

  const saveAsFile = async (doc = activeDocument.value) => {
    if (!doc) return

    let defaultName = doc.title
    if (!doc.filePath && doc.title === 'Untitled') {
        defaultName = suggestFileName(doc.content)
    }

    try {
      const selected = await save({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
        defaultPath: defaultName
      })
      
      if (selected) {
        try {
          await writeTextFile(selected, doc.content)
          doc.filePath = selected
          doc.title = selected.split(/[\\/]/).pop() || 'Untitled'
          doc.isModified = false
          updateRecentFiles(selected)
          
          // Start watching the new file
          await invoke('watch_file', { path: selected }).catch(console.error)
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

  const saveFile = async (doc = activeDocument.value) => {
    if (!doc) return

    if (doc.filePath) {
      try {
        await writeTextFile(doc.filePath, doc.content)
        doc.isModified = false
      } catch (error) {
        console.error('Failed to save file:', error)
        await message(`Failed to save file: ${error}`, { title: 'Error', kind: 'error' })
      }
    } else {
      await saveAsFile(doc)
    }
  }

  const closeFile = (id: string) => {
    const doc = documents.value.find(d => d.id === id)
    if (doc && doc.filePath) {
        invoke('unwatch_file', { path: doc.filePath }).catch(console.error)
    }
    removeDocument(id)
  }

  const handleLinkClick = async (href: string) => {
    try {
      const decodedHref = decodeURIComponent(href)
      let targetPath = decodedHref
      
      if (!await isAbsolute(decodedHref)) {
        if (activeDocument.value && activeDocument.value.filePath) {
          const dir = await dirname(activeDocument.value.filePath)
          targetPath = await join(dir, decodedHref)
        } else {
          return
        }
      }
      
      await loadFile(targetPath)
    } catch (error) {
      console.error('Failed to handle link click:', error)
    }
  }

  return {
    recentFiles,
    currentFolder,
    persistedOpenFiles,
    lastActiveFilePath,
    newFile,
    loadFile,
    openFile,
    openFolder,
    saveFile,
    saveAsFile,
    closeFile,
    handleLinkClick
  }
}
