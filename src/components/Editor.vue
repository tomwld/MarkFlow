<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages as codeLanguages } from '@codemirror/language-data'
import { GFM, Subscript, Superscript, Emoji } from '@lezer/markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { search, searchKeymap } from '@codemirror/search'
import { ref, watch, computed, nextTick } from 'vue'
import { useDark } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { EditorView, ViewUpdate, keymap } from '@codemirror/view'
import { EditorSelection, EditorState } from '@codemirror/state'
import { 
  parseTable, formatTable, addRow, deleteRow, addColumn, deleteColumn, getColumnIndex, isTableLine 
} from '../utils/table'
import { MathExtension } from '../utils/codemirror-math'

const { t } = useI18n()

const languages = [
  "javascript", "typescript", "html", "css", "json", "java", "python", "c", "cpp", "csharp", 
  "go", "rust", "php", "ruby", "shell", "bash", "sql", "xml", "yaml", "markdown", 
  "dockerfile", "kotlin", "swift", "scala", "perl", "lua", "r", "dart", "objectivec", "vue"
].map(lang => ({ label: lang, type: "keyword" }))

const codeBlockLanguageCompletion = (context: CompletionContext) => {
  let word = context.matchBefore(/^\s*```\w*/)
  if (!word) return null
  if (word.from == word.to && !context.explicit) return null
  
  // Find where ``` ends
  const backtickIndex = word.text.indexOf('```')
  if (backtickIndex === -1) return null

  return {
    from: word.from + backtickIndex + 3,
    options: languages
  }
}

const props = defineProps<{
  modelValue: string
  scrollToLine?: number
  syncScrollLine?: number
  initialCursorLine?: number
  initialCursorCol?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'cursor-change', line: number, col: number): void
  (e: 'scroll', line: number): void
}>()

const view = ref<EditorView | null>(null)

const isProgrammaticScroll = ref(false)

const handleReady = (payload: { view: EditorView }) => {
  view.value = payload.view
  
  // Attach scroll listener
  const scrollDom = view.value.scrollDOM
  scrollDom.addEventListener('scroll', () => {
    if (view.value && !isProgrammaticScroll.value) {
      const scrollTop = scrollDom.scrollTop
      // Get the line at the top of the viewport
      // We add a small offset (e.g. 5px) to ensure we get the line inside the viewport
      const lineBlock = view.value.lineBlockAtHeight(scrollTop + 5)
      const line = view.value.state.doc.lineAt(lineBlock.from).number
      emit('scroll', line)
    }
  })
  
  // Restore cursor if provided
  if (props.initialCursorLine && view.value) {
    const doc = view.value.state.doc
    // Ensure line is within bounds
    const line = Math.max(1, Math.min(props.initialCursorLine, doc.lines))
    const lineInfo = doc.line(line)
    // Ensure col is within bounds (col is 1-based in props, offset is 0-based)
    const col = Math.max(1, Math.min(props.initialCursorCol || 1, lineInfo.length + 1))
    
    const pos = lineInfo.from + col - 1
    
    view.value.dispatch({
      selection: EditorSelection.cursor(pos),
      scrollIntoView: true,
      effects: EditorView.scrollIntoView(pos, { y: 'center' })
    })
  }
}

watch(() => props.scrollToLine, (line) => {
  if (line && view.value) {
    const doc = view.value.state.doc
    if (line > 0 && line <= doc.lines) {
      const lineInfo = doc.line(line)
      view.value.dispatch({
        selection: EditorSelection.cursor(lineInfo.from),
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' })
      })
    }
  }
})

watch(() => props.syncScrollLine, (line) => {
  if (line && view.value) {
    const doc = view.value.state.doc
    if (line > 0 && line <= doc.lines) {
      const lineInfo = doc.line(line)
      
      // Set flag to ignore scroll event
      isProgrammaticScroll.value = true
      
      view.value.dispatch({
        // Do NOT move selection/cursor for sync scroll
        // scrollIntoView: true, 
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'start' })
      })
      
      // Reset flag after delay
      setTimeout(() => {
        isProgrammaticScroll.value = false
      }, 100)
    }
  }
})

const isDark = useDark()

const extensions = computed(() => {
  const exts = [
    markdown({
      base: markdownLanguage,
      codeLanguages: codeLanguages,
      extensions: [GFM, Subscript, Superscript, Emoji, MathExtension]
    }), 
    autocompletion({ override: [codeBlockLanguageCompletion] }),
    search(),
    keymap.of(searchKeymap),
    EditorView.lineWrapping,
    EditorState.phrases.of({
      "Go to line": t('search.goToLine'),
      "go": t('search.go'),
      "Find": t('search.find'),
      "Replace": t('search.replace'),
      "next": t('search.next'),
      "previous": t('search.previous'),
      "all": t('search.all'),
      "match case": t('search.matchCase'),
      "by word": t('search.byWord'),
      "replace": t('search.replace'),
      "replace all": t('search.replaceAll'),
      "close": t('search.close'),
      "current match": t('search.currentMatch'),
      "on line": t('search.onLine')
    }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.selectionSet) {
        const state = update.state
        const offset = state.selection.main.head
        const line = state.doc.lineAt(offset)
        emit('cursor-change', line.number, offset - line.from + 1)
      }
    })
  ]

  if (isDark.value) {
    exts.push(oneDark)
  }

  return exts
})

// Local state to manage the editor content
const code = ref(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

// Emit changes to parent
const handleChange = (value: string) => {
  code.value = value
  emit('update:modelValue', value)
}
const insertText = (text: string) => {
  if (view.value) {
    const state = view.value.state
    const selection = state.selection.main
    const from = selection.from
    const to = selection.to
    
    view.value.dispatch({
      changes: { from, to, insert: text },
      selection: EditorSelection.cursor(from + text.length),
      scrollIntoView: true
    })
  }
}

const insertAtCursorAndEnd = (cursorText: string, endText: string) => {
  if (view.value) {
    const state = view.value.state
    const selection = state.selection.main
    const from = selection.from
    const to = selection.to
    const docLength = state.doc.length
    
    // Check if we need a newline before appending
    const lastLine = state.doc.lineAt(docLength)
    const prefix = lastLine.length > 0 ? '\n\n' : '\n'
    
    view.value.dispatch({
      changes: [
        { from, to, insert: cursorText },
        { from: docLength, insert: prefix + endText }
      ],
      selection: EditorSelection.cursor(from + cursorText.length),
      scrollIntoView: true
    })
  }
}

const toggleFormat = (prefix: string, suffix: string) => {
  if (view.value) {
    const state = view.value.state
    const selection = state.selection.main
    const from = selection.from
    const to = selection.to
    const text = state.sliceDoc(from, to)
    const doc = state.doc

    // Helper to count chars
    const countChars = (str: string, char: string, fromStart: boolean) => {
      let count = 0
      if (fromStart) {
        for (let i = 0; i < str.length; i++) {
          if (str[i] === char) count++
          else break
        }
      } else {
        for (let i = str.length - 1; i >= 0; i--) {
          if (str[i] === char) count++
          else break
        }
      }
      return count
    }

    // Check if prefix and suffix use the same character (e.g. *, **, ~~)
    if (prefix.length > 0 && suffix.length > 0 && 
        prefix[0] === suffix[0] && 
        prefix.split('').every(c => c === prefix[0]) && 
        suffix.split('').every(c => c === suffix[0])) {
      
      const char = prefix[0]
      const targetLevel = prefix.length

      // Check Internal
      const iStart = countChars(text, char, true)
      const iEnd = countChars(text, char, false)
      // Only consider valid if start and end match, to avoid partial matches
      const iLevel = (iStart > 0 && iEnd > 0 && iStart === iEnd && text.length >= iStart + iEnd) ? iStart : 0

      // Check External
      const before = doc.sliceString(Math.max(0, from - 10), from) // Look back a bit
      const after = doc.sliceString(to, Math.min(doc.length, to + 10)) // Look forward a bit
      const eStart = countChars(before, char, false) // Count from end of 'before'
      const eEnd = countChars(after, char, true) // Count from start of 'after'
      const eLevel = (eStart > 0 && eEnd > 0 && eStart === eEnd) ? eStart : 0

      let mode: 'internal' | 'external' = 'internal'
      let currentLevel = 0

      // Priority: Internal > External
      if (iLevel > 0) {
        mode = 'internal'
        currentLevel = iLevel
      } else if (eLevel > 0) {
        mode = 'external'
        currentLevel = eLevel
      } else {
        mode = 'internal'
        currentLevel = 0
      }

      // Determine Action
      let action: 'add' | 'remove' = 'add'
      
      if (char === '*') {
        if (targetLevel === 1) { // Italic
          // Remove if level is 1 (italic) or >= 3 (bold+italic or more)
          // This ensures we don't go beyond 3 levels, and allows reducing from 3 (or more) to 2
          if (currentLevel === 1 || currentLevel >= 3) action = 'remove'
        } else if (targetLevel === 2) { // Bold
          // Remove if level is >= 2 (bold or bold+italic or more)
          // This allows reducing from 3 (or more) to 1
          if (currentLevel >= 2) action = 'remove'
        }
      } else {
        // Default (e.g. ~~)
        if (currentLevel >= targetLevel) action = 'remove'
      }

      if (action === 'add') {
         if (mode === 'internal') {
             // Wrap text
             view.value.dispatch({
                changes: { from, to, insert: `${prefix}${text}${suffix}` },
                selection: EditorSelection.single(from + prefix.length, to + prefix.length),
                scrollIntoView: true
             })
         } else {
             // External mode but adding: Insert markers at boundaries
             // e.g. |*foo*| -> |**foo**| (wait, that's not right)
             // If we are adding to external, we are essentially wrapping the whole thing again?
             // Actually, if mode is external, it means we are INSIDE markers.
             // If we add, we are wrapping the selection (which is inside).
             // e.g. *|foo|* -> *|**foo**|* ? No, that's valid markdown but maybe not what we want.
             // If we want *foo* -> ***foo***. We should insert * at from and to.
             view.value.dispatch({
                changes: [
                    { from, insert: prefix },
                    { from: to, insert: suffix }
                ],
                selection: EditorSelection.single(from + prefix.length, to + prefix.length),
                scrollIntoView: true
             })
         }
      } else {
        // Remove
        if (mode === 'internal') {
            // Unwrap internal: remove targetLevel chars from start and end of text
            view.value.dispatch({
                changes: { from, to, insert: text.slice(targetLevel, text.length - targetLevel) },
                selection: EditorSelection.single(from, to - (targetLevel * 2)),
                scrollIntoView: true
            })
        } else {
            // Unwrap external: delete chars from doc
            view.value.dispatch({
                changes: [
                    { from: from - targetLevel, to: from, insert: '' },
                    { from: to, to: to + targetLevel, insert: '' }
                ],
                selection: EditorSelection.single(from - targetLevel, to - targetLevel),
                scrollIntoView: true
            })
        }
      }
      return
    }

    // Check if the selected text itself is wrapped
    if (text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length) {
      // Unwrap internal
       view.value.dispatch({
        changes: { from: from, to: to, insert: text.slice(prefix.length, text.length - suffix.length) },
        selection: EditorSelection.single(from, to - prefix.length - suffix.length),
        scrollIntoView: true
      })
      return
    }

    // Check if already wrapped externally
    const before = doc.sliceString(from - prefix.length, from)
    const after = doc.sliceString(to, to + suffix.length)
    
    if (before === prefix && after === suffix) {
       // Unwrap external
       view.value.dispatch({
        changes: { from: from - prefix.length, to: to + suffix.length, insert: text },
        selection: EditorSelection.single(from - prefix.length, to - prefix.length),
        scrollIntoView: true
      })
    } else {
      // Wrap
      view.value.dispatch({
        changes: { from, to, insert: `${prefix}${text}${suffix}` },
        selection: EditorSelection.single(from + prefix.length, to + prefix.length),
        scrollIntoView: true
      })
    }
  }
}

const toggleLinePrefix = (prefix: string) => {
  if (view.value) {
    const state = view.value.state
    const selection = state.selection.main
    const fromLine = state.doc.lineAt(selection.from)
    const toLine = state.doc.lineAt(selection.to)
    
    // Check if we are toggling a heading
    const isHeading = /^#{1,6}\s$/.test(prefix)

    if (isHeading) {
        const changes = []
        for (let i = fromLine.number; i <= toLine.number; i++) {
            const line = state.doc.line(i)
            const match = line.text.match(/^(#{1,6})\s/)
            
            if (match) {
                const existingPrefix = match[0]
                if (existingPrefix === prefix) {
                    // Same heading level -> Toggle off (remove)
                    changes.push({ from: line.from, to: line.from + existingPrefix.length, insert: '' })
                } else {
                    // Different heading level -> Replace
                    changes.push({ from: line.from, to: line.from + existingPrefix.length, insert: prefix })
                }
            } else {
                // No heading -> Add
                changes.push({ from: line.from, to: line.from, insert: prefix })
            }
        }
        
        view.value.dispatch({
            changes: changes,
            scrollIntoView: true
        })
        return
    }

    // Check if we are toggling ordered list
    const isOrderedList = prefix === '1. '
    
    if (isOrderedList) {
        let allHaveOrderedPrefix = true
        for (let i = fromLine.number; i <= toLine.number; i++) {
            const line = state.doc.line(i)
            if (!/^\d+\.\s/.test(line.text)) {
                allHaveOrderedPrefix = false
                break
            }
        }
        
        const changes = []
        if (allHaveOrderedPrefix) {
            // Remove ordered list prefix
             for (let i = fromLine.number; i <= toLine.number; i++) {
                const line = state.doc.line(i)
                const match = line.text.match(/^(\d+\.\s)/)
                if (match) {
                    changes.push({ from: line.from, to: line.from + match[0].length, insert: '' })
                }
            }
        } else {
            // Add ordered list prefix with incrementing numbers
            let counter = 1
            for (let i = fromLine.number; i <= toLine.number; i++) {
                const line = state.doc.line(i)
                // Check if it already has a prefix (replace or add?)
                // Assuming we just want to add if not present, or replace if another list type?
                // For simplicity, let's just prepend, or if it has another list marker, replace it?
                // The requirement is specifically for ordered list increment.
                
                // Let's handle replacement of unordered list or existing ordered list (to re-number)
                const match = line.text.match(/^([-*+]|\d+\.)\s/)
                if (match) {
                     changes.push({ from: line.from, to: line.from + match[0].length, insert: `${counter}. ` })
                } else {
                     changes.push({ from: line.from, to: line.from, insert: `${counter}. ` })
                }
                counter++
            }
        }
        
        view.value.dispatch({
            changes: changes,
            scrollIntoView: true
        })
        return
    }

    let allHavePrefix = true
    for (let i = fromLine.number; i <= toLine.number; i++) {
        const line = state.doc.line(i)
        if (!line.text.startsWith(prefix)) {
            allHavePrefix = false
            break
        }
    }
    
    const changes = []
    for (let i = fromLine.number; i <= toLine.number; i++) {
        const line = state.doc.line(i)
        if (allHavePrefix) {
             changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
        } else {
             if (!line.text.startsWith(prefix)) {
                 changes.push({ from: line.from, to: line.from, insert: prefix })
             }
        }
    }
    
    view.value.dispatch({
      changes: changes,
      scrollIntoView: true
    })
  }
}

const editTable = (action: 'insertRowAbove' | 'insertRowBelow' | 'insertColumnLeft' | 'insertColumnRight' | 'deleteRow' | 'deleteColumn') => {
  if (!view.value) return;
  
  const state = view.value.state;
  const selection = state.selection.main;
  const lineObj = state.doc.lineAt(selection.head);
  const lineNum = lineObj.number; // 1-based
  const lineIndex = lineNum - 1; // 0-based
  
  // Get all lines
  const lines: string[] = [];
  for(let i=1; i<=state.doc.lines; i++) {
    lines.push(state.doc.line(i).text);
  }
  
  const parsed = parseTable(lines, lineIndex);
  if (!parsed) return; // Not in table
  
  const { table, startLine, endLine } = parsed;
  const relRowIndex = lineIndex - startLine;
  const colIndex = getColumnIndex(lineObj.text, selection.head - lineObj.from);
  
  let newTable = table;
  
  switch (action) {
    case 'insertRowAbove':
      newTable = addRow(table, relRowIndex);
      break;
    case 'insertRowBelow':
      newTable = addRow(table, relRowIndex + 1);
      break;
    case 'insertColumnLeft':
      newTable = addColumn(table, colIndex);
      break;
    case 'insertColumnRight':
      newTable = addColumn(table, colIndex + 1);
      break;
    case 'deleteRow':
      newTable = deleteRow(table, relRowIndex);
      break;
    case 'deleteColumn':
      newTable = deleteColumn(table, colIndex);
      break;
  }
  
  const newText = formatTable(newTable);
  
  // Replace table lines
  const startPos = state.doc.line(startLine + 1).from;
  const endPos = state.doc.line(endLine + 1).to;
  
  view.value.dispatch({
    changes: { from: startPos, to: endPos, insert: newText },
    // Move selection to start of table for simplicity, or try to maintain relative pos
    selection: EditorSelection.cursor(startPos),
    scrollIntoView: true
  });
}

defineExpose({
  insertText,
  insertAtCursorAndEnd,
  editTable,
  toggleFormat,
  toggleLinePrefix
})

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<'table' | 'taskList' | null>(null)

const contextMenuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(0)
const adjustedY = ref(0)
const isPositioned = ref(false)

watch(contextMenuVisible, async (visible) => {
  if (visible) {
    isPositioned.value = false
    adjustedX.value = contextMenuX.value
    adjustedY.value = contextMenuY.value
    
    await nextTick()
    
    if (contextMenuRef.value) {
      const rect = contextMenuRef.value.getBoundingClientRect()
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight
      
      // Check vertical overflow
      if (adjustedY.value + rect.height > winHeight) {
        adjustedY.value = Math.max(0, adjustedY.value - rect.height)
      }
      
      // Check horizontal overflow
      if (adjustedX.value + rect.width > winWidth) {
        adjustedX.value = Math.max(0, adjustedX.value - rect.width)
      }
      
      isPositioned.value = true
    }
  }
})

const isTaskListLine = (text: string) => {
  return /^(\s*[-*+]\s+)\[([ xX])\]/.test(text)
}

const handleContextMenu = (e: MouseEvent) => {
  if (!view.value) return;

  const pos = view.value.posAtCoords({ x: e.clientX, y: e.clientY });
  if (!pos) return;

  const line = view.value.state.doc.lineAt(pos);
  
  if (isTableLine(line.text)) {
    e.preventDefault();
    
    // Move cursor to click position
    view.value.dispatch({
      selection: EditorSelection.cursor(pos)
    });

    contextMenuX.value = e.clientX;
    contextMenuY.value = e.clientY;
    contextMenuVisible.value = true;
    contextMenuType.value = 'table';
  } else if (isTaskListLine(line.text)) {
    e.preventDefault();
    
    // Move cursor to click position
    view.value.dispatch({
      selection: EditorSelection.cursor(pos)
    });

    contextMenuX.value = e.clientX;
    contextMenuY.value = e.clientY;
    contextMenuVisible.value = true;
    contextMenuType.value = 'taskList';
  } else {
    contextMenuVisible.value = false;
    contextMenuType.value = null;
  }
}

const closeContextMenu = () => {
  contextMenuVisible.value = false;
  contextMenuType.value = null;
}

const handleMenuAction = (action: 'insertRowAbove' | 'insertRowBelow' | 'insertColumnLeft' | 'insertColumnRight' | 'deleteRow' | 'deleteColumn') => {
  editTable(action);
  closeContextMenu();
}

const toggleTaskStatus = (completed: boolean) => {
  if (!view.value) return;
  
  const state = view.value.state;
  const selection = state.selection.main;
  const line = state.doc.lineAt(selection.head);
  const text = line.text;
  
  const match = text.match(/^(\s*[-*+]\s+)\[([ xX])\]/);
  if (match) {
    const prefix = match[1];
    const newStatus = completed ? 'x' : ' ';
    
    const newLine = text.replace(/^(\s*[-*+]\s+)\[([ xX])\]/, `${prefix}[${newStatus}]`);
    view.value.dispatch({
      changes: { from: line.from, to: line.to, insert: newLine }
    });
  }
  closeContextMenu();
}
</script>

<template>
  <div class="h-full w-full overflow-hidden text-base relative" @contextmenu="handleContextMenu" @click="closeContextMenu">
    <Codemirror
      v-model="code"
      :placeholder="t('editor.placeholder')"
      :style="{ height: '100%', fontSize: '14px' }"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      @ready="handleReady"
      @change="handleChange"
    />

    <!-- Context Menu -->
    <div 
      v-if="contextMenuVisible"
      ref="contextMenuRef"
      class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md py-1 text-sm text-gray-700 dark:text-gray-200 min-w-[160px]"
      :style="{ left: `${adjustedX}px`, top: `${adjustedY}px`, visibility: isPositioned ? 'visible' : 'hidden' }"
      @click.stop
    >
      <template v-if="contextMenuType === 'table'">
        <div class="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700 mb-1">
          {{ t('table.actions') }}
        </div>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
          @click="handleMenuAction('insertRowAbove')"
        >
          <span>{{ t('table.insertRowAbove') }}</span>
          <span class="text-xs text-gray-400">Ctrl+Alt+↑</span>
        </button>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
          @click="handleMenuAction('insertRowBelow')"
        >
          <span>{{ t('table.insertRowBelow') }}</span>
          <span class="text-xs text-gray-400">Ctrl+Alt+↓</span>
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
          @click="handleMenuAction('insertColumnLeft')"
        >
          <span>{{ t('table.insertColumnLeft') }}</span>
          <span class="text-xs text-gray-400">Ctrl+Alt+←</span>
        </button>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
          @click="handleMenuAction('insertColumnRight')"
        >
          <span>{{ t('table.insertColumnRight') }}</span>
          <span class="text-xs text-gray-400">Ctrl+Alt+→</span>
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-between group"
          @click="handleMenuAction('deleteRow')"
        >
          <span>{{ t('table.deleteRow') }}</span>
          <span class="text-xs text-red-300">Ctrl+Alt+-</span>
        </button>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-between group"
          @click="handleMenuAction('deleteColumn')"
        >
          <span>{{ t('table.deleteColumn') }}</span>
          <span class="text-xs text-red-300">Ctrl+Alt+=</span>
        </button>
      </template>

      <template v-if="contextMenuType === 'taskList'">
         <div class="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700 mb-1">
          {{ t('taskList.actions') }}
        </div>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
          @click="toggleTaskStatus(true)"
        >
          <span>{{ t('taskList.markAsCompleted') }}</span>
        </button>
        <button 
          class="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
          @click="toggleTaskStatus(false)"
        >
          <span>{{ t('taskList.markAsUncompleted') }}</span>
        </button>
      </template>
    </div>
  </div>
</template>
