<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { ref, watch } from 'vue'
import { EditorView, ViewUpdate } from '@codemirror/view'

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

const extensions = [
  markdown(), 
  oneDark,
  EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.selectionSet) {
      const state = update.state
      const offset = state.selection.main.head
      const line = state.doc.lineAt(offset)
      emit('cursor-change', line.number, offset - line.from + 1)
    }
  })
]

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

defineExpose({
  insertText
})
</script>

<template>
  <div class="h-full w-full overflow-hidden text-base">
    <Codemirror
      v-model="code"
      placeholder="Start typing..."
      :style="{ height: '100%', fontSize: '14px' }"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      @ready="handleReady"
      @change="handleChange"
    />
  </div>
</template>
