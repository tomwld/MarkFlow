import { ref } from 'vue'
import { useDocuments } from './useDocuments'

// Singleton state
const editorRef = ref<any>(null)
const scrollToLine = ref<number | null>(null)

export function useEditor() {
  const { activeDocument } = useDocuments()
  
  const insertText = (text: string) => {
    if (editorRef.value) {
      editorRef.value.insertText(text)
    }
  }

  const insertEmoji = (emoji: string) => {
    insertText(emoji)
  }

  const insertMarkdown = (type: 'table' | 'footnote' | 'tasklist' | 'codeblock' | 'link' | 'image' | 'bold' | 'italic' | 'strikethrough' | 'heading' | 'unorderedList' | 'orderedList' | 'quote') => {
    if (!editorRef.value) return

    let text = ''
    switch (type) {
      case 'bold':
        editorRef.value.toggleFormat('**', '**')
        return
      case 'italic':
        editorRef.value.toggleFormat('*', '*')
        return
      case 'strikethrough':
        editorRef.value.toggleFormat('~~', '~~')
        return
      case 'heading':
        editorRef.value.toggleLinePrefix('# ')
        return
      case 'unorderedList':
        editorRef.value.toggleLinePrefix('- ')
        return
      case 'orderedList':
        editorRef.value.toggleLinePrefix('1. ')
        return
      case 'quote':
        editorRef.value.toggleLinePrefix('> ')
        return
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
        editorRef.value.insertAtCursorAndEnd(`[^${nextNum}]`, `[^${nextNum}]: Footnote text`)
        return
      case 'tasklist':
        text = '- [ ] Task item'
        break
      case 'codeblock':
        text = '\n```language\ncode\n```\n'
        break
      case 'link':
        text = '[Link text](url)'
        break
      case 'image':
        text = '![Alt text](url)'
        break
    }
    
    insertText(text)
  }

  const editTable = (action: 'insertRowAbove' | 'insertRowBelow' | 'insertColumnLeft' | 'insertColumnRight' | 'deleteRow' | 'deleteColumn') => {
    if (editorRef.value) {
      editorRef.value.editTable(action)
    }
  }

  const handleCursorChange = (line: number, col: number) => {
    if (activeDocument.value) {
      activeDocument.value.cursorLine = line
      activeDocument.value.cursorCol = col
    }
  }

  const toggleLinePrefix = (prefix: string) => {
    if (editorRef.value) {
      editorRef.value.toggleLinePrefix(prefix)
    }
  }

  return {
    editorRef,
    scrollToLine,
    insertText,
    insertEmoji,
    insertMarkdown,
    toggleLinePrefix,
    editTable,
    handleCursorChange
  }
}
