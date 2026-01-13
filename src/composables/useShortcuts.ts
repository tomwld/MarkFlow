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
  const { toggleOutline, showEmojiPicker, showSidebar, showPreview, isFocusMode } = useLayout()
  
  const { 
    exportDocument 
  } = useExport()

  const handleKeydown = (e: KeyboardEvent) => {
    // Toggle Focus Mode (F11)
    if (e.key === 'F11') {
      e.preventDefault()
      isFocusMode.value = !isFocusMode.value
      return
    }

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
            showPreview.value = !showPreview.value;
          }
          break;
        case 'h':
          if (e.altKey) {
            e.preventDefault();
            exportDocument('html');
          }
          break;
        case 'e':
          e.preventDefault();
          showEmojiPicker.value = true;
          break;
        case 't':
          e.preventDefault();
          insertMarkdown('table');
          break;
        case 'f':
          if (e.altKey && e.ctrlKey) {
            e.preventDefault();
            insertMarkdown('footnote');
          }
          break;
        case 'l':
          e.preventDefault();
          insertMarkdown('tasklist');
          break;
        case 'c':
          if (e.altKey && e.ctrlKey) {
            e.preventDefault();
            insertMarkdown('codeblock');
          }
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown('link');
          break;
        case 'm':
          if (e.altKey) {
            e.preventDefault();
            insertMarkdown('math');
          }
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('image');
          break;
        case 'b':
          if (e.altKey) {
            e.preventDefault();
            toggleOutline();
          } else {
            e.preventDefault();
            showSidebar.value = !showSidebar.value;
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