import { save, message } from '@tauri-apps/plugin-dialog'
import { useDocuments } from './useDocuments'
import { exportToHtml } from '../utils/export/html'
import { exportToPdf } from '../utils/export/pdf'

export function useExport() {
  const { activeDocument } = useDocuments()

  const exportDocument = async (format?: 'pdf' | 'html') => {
    if (!activeDocument.value) return
    
    const title = activeDocument.value.title.replace(/\.(md|markdown)$/i, '') || 'Untitled'
    const content = activeDocument.value.content
    
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
          await exportToPdf(content, title, selected)
        } else if (selected.endsWith('.html')) {
          await exportToHtml(content, title, selected)
        }
      }
    } catch (error) {
      console.error('Export failed:', error)
      await message(`Export failed: ${error}`, { title: 'Error', kind: 'error' })
    }
  }

  const printDoc = () => {
    window.print()
  }

  return {
    exportDocument,
    printDoc
  }
}
