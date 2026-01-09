<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import footnote from 'markdown-it-footnote'
import abbr from 'markdown-it-abbr'
import mark from 'markdown-it-mark'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import deflist from 'markdown-it-deflist'
import { computed, watch, ref } from 'vue'
import 'github-markdown-css/github-markdown.css'

const props = defineProps<{
  content: string
  cursorLine?: number
}>()

// Plugin to add data-line attribute
const injectLineNumbers = (md: MarkdownIt) => {
  const originalRender = md.renderer.renderToken.bind(md.renderer)
  md.renderer.renderToken = (tokens, idx, options) => {
    const token = tokens[idx]
    if (token.map && token.type.endsWith('_open')) {
      token.attrPush(['data-line', String(token.map[0])])
    }
    return originalRender(tokens, idx, options)
  }
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})
  .use(injectLineNumbers)
  .use(taskLists)
  .use(footnote)
  .use(abbr)
  .use(mark)
  .use(sub)
  .use(sup)
  .use(deflist)

const html = computed(() => md.render(props.content))

const containerRef = ref<HTMLElement | null>(null)

// Watch content change to reset scroll if needed or just handle re-render
watch(() => props.content, () => {
  // Optional: maybe we don't want to scroll on content change unless cursor moves
  // But if we switch documents, content changes completely.
  // We should rely on cursorLine prop change to trigger scroll.
  // However, if we switch files, cursorLine might also change or stay similar but refer to different content.
})

watch(() => props.cursorLine, (newLine) => {
  if (!newLine || !containerRef.value) return
  
  // Use nextTick to ensure DOM is updated after content change if any
  // But since we are in a watch, if content changed simultaneously, html computed updates, v-html updates.
  // We might need a small delay or nextTick.
  // Actually, let's use nextTick just to be safe, or requestAnimationFrame.
  setTimeout(() => {
    scrollToCursor(newLine)
  }, 50)
})

const scrollToCursor = (newLine: number) => {
  if (!containerRef.value) return
  
  // Convert 1-based cursor line to 0-based markdown line
  const targetLine = newLine - 1
  
  // Find all elements with data-line
  const elements = Array.from(containerRef.value.querySelectorAll('[data-line]')) as HTMLElement[]
  
  let targetElement: HTMLElement | null = null
  
  // Find the element with the highest data-line that is less than or equal to targetLine
  // This ensures we scroll to the beginning of the block containing the cursor
  for (const el of elements) {
    const line = parseInt(el.getAttribute('data-line') || '-1')
    if (!isNaN(line) && line <= targetLine) {
      if (!targetElement || line > parseInt(targetElement.getAttribute('data-line') || '-1')) {
        targetElement = el
      }
    }
  }

  if (targetElement) {
    // Check if element is already visible to avoid unnecessary scrolling
    const rect = targetElement.getBoundingClientRect()
    const containerRect = containerRef.value.getBoundingClientRect()
    
    const isVisible = (
      rect.top >= containerRect.top &&
      rect.bottom <= containerRect.bottom
    )
    
    if (!isVisible) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}
</script>

<template>
  <div ref="containerRef" class="h-full w-full overflow-y-auto bg-white dark:bg-[#0d1117] scroll-smooth">
    <div 
      class="markdown-body p-8 min-h-full"
      v-html="html"
    ></div>
  </div>
</template>

<style scoped>
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
}

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
  }
}

/* Ensure dark mode support works well with the surrounding app */
:deep(.markdown-body) {
  background-color: transparent;
}
</style>
