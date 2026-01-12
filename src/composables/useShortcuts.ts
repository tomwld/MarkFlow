import { useFileOperations } from './useFileOperations'
import { useExport } from './useExport'
import { useDocuments } from './useDocuments'
import { useAppLifecycle } from './useAppLifecycle'
import { useEditor } from './useEditor'
import { useLayout } from './useLayout'

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
  const { insertMarkdown, editTable } = useEditor()
  const { toggleOutline, showEmojiPicker } = useLayout()
  
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
          if (e.altKey) openFolder();
          else openFile(); 
          break;
        case 's':
          e.preventDefault();
          if (e.altKey) saveAsFile();
          else saveFile();
          break;
        case 'p': 
          if (e.altKey) {
            e.preventDefault();
            exportDocument('pdf');
          } else {
            e.preventDefault(); 
            printDoc();
          }
          break;
        case 'h':
          if (e.altKey) {
            e.preventDefault();
            exportDocument('html');
          }
          break;
        case 'e':
          if (e.altKey) {
            e.preventDefault();
            showEmojiPicker.value = true;
          }
          break;
        case 't':
          if (e.altKey) {
            e.preventDefault();
            insertMarkdown('table');
          }
          break;
        case 'f':
          if (e.altKey) {
            e.preventDefault();
            insertMarkdown('footnote');
          }
          break;
        case 'l':
          if (e.altKey) {
            e.preventDefault();
            insertMarkdown('tasklist');
          }
          break;
        case 'c':
          if (e.altKey) {
            e.preventDefault();
            insertMarkdown('codeblock');
          }
          break;
        case 'b':
          if (e.altKey) {
            e.preventDefault();
            toggleOutline();
          }
          break;
        case 'arrowup':
          if (e.altKey) {
            e.preventDefault();
            editTable('insertRowAbove');
          }
          break;
        case 'arrowdown':
          if (e.altKey) {
            e.preventDefault();
            editTable('insertRowBelow');
          }
          break;
        case 'arrowleft':
          if (e.altKey) {
            e.preventDefault();
            editTable('insertColumnLeft');
          }
          break;
        case 'arrowright':
          if (e.altKey) {
            e.preventDefault();
            editTable('insertColumnRight');
          }
          break;
        case '-':
          if (e.altKey) {
            e.preventDefault();
            editTable('deleteRow');
          }
          break;
        case '=':
          if (e.altKey) {
            e.preventDefault();
            editTable('deleteColumn');
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