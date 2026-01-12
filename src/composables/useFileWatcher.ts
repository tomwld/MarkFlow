import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { ask } from '@tauri-apps/plugin-dialog'
import { useDocuments } from './useDocuments'

let unlistenFileChange: UnlistenFn | null = null

export function useFileWatcher() {
  const { documents } = useDocuments()

  const startFileWatcher = async (t: any) => {
    if (unlistenFileChange) return

    unlistenFileChange = await listen('file-changed', async (event) => {
      const changedPath = event.payload as string
      console.log('File changed event received:', changedPath)
      
      // Normalize path
      const normalize = (p: string) => p.replace(/[\\/]/g, '/').toLowerCase()
      const targetPath = normalize(changedPath)

      // Find document
      const doc = documents.value.find(d => d.filePath && normalize(d.filePath) === targetPath)
      
      if (doc && doc.filePath) {
        try {
          const content = await readTextFile(doc.filePath)
          
          if (content !== doc.content) {
              console.log('Reloading content for:', doc.filePath)
              
              if (doc.isModified) {
                  // @ts-ignore
                  if (doc.isReloadPromptShowing) return

                  // @ts-ignore
                  doc.isReloadPromptShowing = true
                  
                  const shouldReload = await ask(
                    t('editor.fileChangedReloadMessage'),
                    { 
                      title: t('editor.fileChangedTitle'),
                      kind: 'warning',
                      okLabel: t('dialog.yes'),
                      cancelLabel: t('dialog.no')
                    }
                  )
                  // @ts-ignore
                  doc.isReloadPromptShowing = false

                  if (shouldReload) {
                    doc.content = content
                    doc.isModified = false 
                  }
              } else {
                  doc.content = content
                  doc.isModified = false 
              }
          }
        } catch (err) {
          // Ignore error if file no longer exists (e.g. deleted)
          const errStr = String(err)
          if (errStr.includes('os error 2') || errStr.includes('no such file')) {
            return
          }
          console.error('Failed to reload file:', err)
        }
      }
    })
  }

  const stopFileWatcher = () => {
    if (unlistenFileChange) {
      unlistenFileChange()
      unlistenFileChange = null
    }
  }

  return {
    startFileWatcher,
    stopFileWatcher
  }
}
