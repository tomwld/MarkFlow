<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { search, searchKeymap } from '@codemirror/search'
import { ref, watch, computed } from 'vue'
import { useDark } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { EditorView, ViewUpdate, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { 
  parseTable, formatTable, addRow, deleteRow, addColumn, deleteColumn, getColumnIndex, isTableLine 
} from '../utils/table'

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
  initialCursorLine?: number
  initialCursorCol?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'cursor-change', line: number, col: number): void
}>()

const view = ref<EditorView | null>(null)

const handleReady = (payload: { view: EditorView }) => {
  view.value = payload.view
  
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
      selection: { anchor: pos, head: pos },
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
        selection: { anchor: lineInfo.from },
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' })
      })
    }
  }
})

const isDark = useDark()

const extensions = computed(() => {
  const exts = [
    markdown(), 
    autocompletion({ override: [codeBlockLanguageCompletion] }),
    search(),
    keymap.of(searchKeymap),
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
      selection: { anchor: from + text.length, head: from + text.length },
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
      selection: { anchor: from + cursorText.length, head: from + cursorText.length },
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
    selection: { anchor: startPos, head: startPos },
    scrollIntoView: true
  });
}

defineExpose({
  insertText,
  insertAtCursorAndEnd,
  editTable
})

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<'table' | 'taskList' | null>(null)

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
      selection: { anchor: pos, head: pos }
    });

    contextMenuX.value = e.clientX;
    contextMenuY.value = e.clientY;
    contextMenuVisible.value = true;
    contextMenuType.value = 'table';
  } else if (isTaskListLine(line.text)) {
    e.preventDefault();
    
    // Move cursor to click position
    view.value.dispatch({
      selection: { anchor: pos, head: pos }
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
      class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md py-1 text-sm text-gray-700 dark:text-gray-200 min-w-[160px]"
      :style="{ left: `${contextMenuX}px`, top: `${contextMenuY}px` }"
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