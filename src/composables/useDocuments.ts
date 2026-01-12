import { ref, computed } from 'vue'
import { type MarkdownDocument } from '../types/document'

// Global state (singleton pattern)
const documents = ref<MarkdownDocument[]>([])
const activeDocId = ref<string | null>(null)

export function useDocuments() {
  const activeDocument = computed(() => documents.value.find(d => d.id === activeDocId.value))

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

  const generateId = () => crypto.randomUUID()

  const createDocument = (title: string = 'Untitled', content: string = '', filePath: string | null = null): MarkdownDocument => {
    return {
      id: generateId(),
      title,
      content,
      filePath,
      isModified: false,
      cursorLine: 1,
      cursorCol: 1
    }
  }

  const addDocument = (doc: MarkdownDocument) => {
    documents.value.push(doc)
    activeDocId.value = doc.id
  }

  const getDocumentByPath = (path: string) => {
    return documents.value.find(d => d.filePath === path)
  }

  const setActiveDocument = (id: string) => {
    activeDocId.value = id
  }

  const removeDocument = (id: string) => {
    const index = documents.value.findIndex(d => d.id === id)
    if (index === -1) return

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

  const closeDocument = (id: string) => {
     removeDocument(id)
  }

  return {
    documents,
    activeDocId,
    activeDocument,
    wordCount,
    lineCount,
    createDocument,
    addDocument,
    getDocumentByPath,
    setActiveDocument,
    removeDocument,
    closeDocument
  }
}
