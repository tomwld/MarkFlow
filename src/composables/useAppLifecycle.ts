import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useDocuments } from './useDocuments'
import { useFileOperations } from './useFileOperations'

// Singleton state
const showSaveConfirm = ref(false)
const fileToCloseId = ref<string | null>(null)
const isAppClosing = ref(false)

export function useAppLifecycle() {
  const { documents, activeDocId, setActiveDocument } = useDocuments()
  const { saveFile, closeFile: forceCloseFileOp } = useFileOperations()

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

  const handleSaveConfirm = async () => {
    if (fileToCloseId.value) {
      const doc = documents.value.find(d => d.id === fileToCloseId.value)
      if (doc) {
        setActiveDocument(doc.id)
        await saveFile(doc)
        
        if (doc.isModified) {
           showSaveConfirm.value = false
           isAppClosing.value = false 
           return 
        }
      }
      forceCloseFileOp(fileToCloseId.value)
    }
    resetConfirmState()
    checkAppClose()
  }

  const handleDiscardConfirm = () => {
    if (fileToCloseId.value) {
      forceCloseFileOp(fileToCloseId.value)
    }
    resetConfirmState()
    checkAppClose()
  }

  const handleCancelConfirm = () => {
    resetConfirmState()
    isAppClosing.value = false
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

    forceCloseFileOp(id)
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

  const initCloseRequestListener = async () => {
    return await getCurrentWindow().onCloseRequested((event) => {
      const hasModified = documents.value.some(d => d.isModified)
      
      if (hasModified) {
        event.preventDefault()
        if (!isAppClosing.value) {
          isAppClosing.value = true
          checkAppClose()
        }
      } else {
        // Let it close, but we usually want to ensure backend exits cleanly
        // event.preventDefault() // If we want to use exit_app
        // invoke('exit_app')
        // Actually, if we don't preventDefault, the window closes.
        // If we want to ensure specific cleanup, we might prevent and then exit.
        // But for now, let's match the original logic:
        // Original: event.preventDefault(); invoke('exit_app')
        event.preventDefault()
        invoke('exit_app')
      }
    })
  }

  return {
    showSaveConfirm,
    fileToCloseId,
    isAppClosing,
    closeFile,
    handleSaveConfirm,
    handleDiscardConfirm,
    handleCancelConfirm,
    quitApp,
    initCloseRequestListener
  }
}
