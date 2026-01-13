import { MarkdownConfig, BlockContext, Line } from '@lezer/markdown'
import { tags as t } from '@lezer/highlight'

export const MathExtension: MarkdownConfig = {
  defineNodes: [
    { name: "InlineMath", style: t.string },
    { name: "BlockMath", style: t.string },
    { name: "MathDelimiter", style: [t.processingInstruction, t.strong] }
  ],
  parseBlock: [{
    name: "MathBlock",
    parse(cx: BlockContext, line: Line) {
      if (line.text.slice(line.pos).startsWith("$$")) {
        const start = cx.lineStart + line.pos
        const delimiters = [cx.elt("MathDelimiter", start, start + 2)]
        
        while (cx.nextLine()) {
          const currentLine = (cx as any).line;
          if (currentLine.text.slice(currentLine.pos).startsWith("$$")) {
            const end = cx.lineStart + currentLine.pos + 2
            delimiters.push(cx.elt("MathDelimiter", end - 2, end))
            cx.addElement(cx.elt("BlockMath", start, end, delimiters))
            cx.nextLine()
            return true
          }
        }
        // Unclosed block
        const lastLine = (cx as any).line;
        cx.addElement(cx.elt("BlockMath", start, cx.lineStart + lastLine.text.length, delimiters))
        return true
      }
      return false
    },
    before: "FencedCode"
  }],
  parseInline: [{
    name: "Math",
    parse(cx, next, pos) {
      if (next != 36 /* $ */) return -1
      
      // Inline $$ ... $$ (display math on single line)
      if (cx.char(pos + 1) == 36) {
        for (let i = pos + 2; i < cx.end; i++) {
          if (cx.char(i) == 36 && cx.char(i + 1) == 36) {
             return cx.addElement(cx.elt("BlockMath", pos, i + 2))
          }
          if (cx.char(i) == 92) i++ // Escape
        }
        return -1
      }
      
      // Inline $ ... $
      if (pos + 1 >= cx.end) return -1
      
      for (let i = pos + 1; i < cx.end; i++) {
        if (cx.char(i) == 36) {
             return cx.addElement(cx.elt("InlineMath", pos, i + 1))
        }
        if (cx.char(i) == 92) i++ // Escape
      }
      return -1
    },
    before: "Emphasis" 
  }]
}
