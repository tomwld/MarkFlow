import { useFileOperations } from './useFileOperations'
import { useExport } from './useExport'
import { useDocuments } from './useDocuments'
import { useAppLifecycle } from './useAppLifecycle'

export function useShortcuts() {
  const { 
    newFile, 
    openFile, 
    openFolder, 
    saveFile, 
    saveAsFile 
  } = useFileOperations()
  
  const { activeDocId } = useDocuments()
  const { closeFile } = useAppLifecycle()
  
  const { 
    exportDocument, 
    printDoc 
  } = useExport()

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
        case 'w': 
          e.preventDefault(); 
          if(activeDocId.value) closeFile(activeDocId.value); 
          break;
      }
    }
  }

  const registerShortcuts = () => {
    window.addEventListener('keydown', handleKeydown)
  }

  const unregisterShortcuts = () => {
    window.removeEventListener('keydown', handleKeydown)
  }

  return {
    registerShortcuts,
    unregisterShortcuts
  }
}
