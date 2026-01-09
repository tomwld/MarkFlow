export interface MarkdownDocument {
  id: string
  title: string
  content: string
  filePath: string | null
  isModified: boolean
  cursorLine: number
  cursorCol: number
  // Optional: Scroll position could be added here
}
