<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import footnote from 'markdown-it-footnote'
import abbr from 'markdown-it-abbr'
import mark from 'markdown-it-mark'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import deflist from 'markdown-it-deflist'
// @ts-ignore
import markdownItKatex from 'markdown-it-katex'
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import mermaid from 'mermaid'
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
// @ts-ignore
import hljs from 'highlight.js'

const props = defineProps<{
  content: string
  cursorLine?: number
  scrollLine?: number
}>()

const emit = defineEmits<{
  (e: 'link-click', href: string): void
  (e: 'update:content', content: string): void
  (e: 'scroll', line: number): void
}>()

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
})

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

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch (__) {}
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
})
  .use(injectLineNumbers)
  .use(taskLists, { enabled: true })
  .use(footnote)
  .use(abbr)
  .use(mark)
  .use(sub)
  .use(sup)
  .use(deflist)
  .use(markdownItKatex)

// Override fence rule to inject data-line for code blocks and mermaid
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const line = token.map ? String(token.map[0]) : ''
  const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
  const lang = info.split(/\s+/g)[0]

  if (lang === 'mermaid') {
     return `<div class="mermaid-wrapper" ${line ? `data-line="${line}"` : ''}><div class="mermaid">${token.content}</div></div>`
   }
   
   let highlighted = ''
  if (options.highlight) {
    highlighted = options.highlight(token.content, lang, '') || md.utils.escapeHtml(token.content)
  } else {
    highlighted = md.utils.escapeHtml(token.content)
  }

  if (highlighted.startsWith('<pre')) {
    return highlighted.replace('<pre', `<pre ${line ? `data-line="${line}"` : ''}`)
  }

  return `<pre ${line ? `data-line="${line}"` : ''}><code${lang ? ` class="language-${lang}"` : ''}>${highlighted}</code></pre>\n`
}

const html = computed(() => md.render(props.content))

const containerRef = ref<HTMLElement | null>(null)

const renderMermaid = useDebounceFn(async () => {
  if (!containerRef.value) return
  await nextTick()
  const mermaidNodes = Array.from(containerRef.value.querySelectorAll('.mermaid')) as HTMLElement[]
  if (mermaidNodes.length > 0) {
    try {
        await mermaid.run({
            nodes: mermaidNodes
        })
        // Mermaid rendering changes content height, so we need to re-apply scroll position
        // to ensure the view is correctly positioned, especially for large diagrams
        if (props.scrollLine !== undefined) {
            await nextTick()
            scrollToLine(props.scrollLine)
        }
    } catch (e) {
        // Suppress errors during editing/typing to avoid console noise
        console.debug('Mermaid render error:', e)
    }
  }
}, 300)

// Watch content change to reset scroll if needed or just handle re-render
watch(() => props.content, () => {
  // Optional: maybe we don't want to scroll on content change unless cursor moves
  // But if we switch documents, content changes completely.
  // We should rely on cursorLine prop change to trigger scroll.
  // However, if we switch files, cursorLine might also change or stay similar but refer to different content.
  renderMermaid()
})

onMounted(() => {
    renderMermaid()
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

const isProgrammaticScroll = ref(false)

watch(() => props.scrollLine, (newLine) => {
  if (newLine === undefined || !containerRef.value) return
  isProgrammaticScroll.value = true
  scrollToLine(newLine)
  // Reset flag after a short delay to allow scroll event to fire
  setTimeout(() => {
    isProgrammaticScroll.value = false
  }, 100)
})

const onScroll = () => {
  if (isProgrammaticScroll.value || !containerRef.value) return
  
  const container = containerRef.value
  const scrollTop = container.scrollTop
  const elements = Array.from(container.querySelectorAll('[data-line]')) as HTMLElement[]
  
  // Find element at or just below top
  // Or rather, find the last element whose top is <= container top + offset
  // Actually we want the element that is currently at the top of the viewport
  
  let currentLine = 1
  let minDiff = Infinity
  
  for (const el of elements) {
    const line = parseInt(el.getAttribute('data-line') || '-1')
    if (isNaN(line)) continue
    
    // Relative position to container top
    const top = el.offsetTop - container.offsetTop
    const diff = Math.abs(top - scrollTop)
    
    // Simple heuristic: if element top is close to scrollTop, or just above it
    if (top <= scrollTop + 20) { // +20 buffer
       // keep tracking the highest line number that is "above or at" the fold
       // But data-line might not be strictly ordered in DOM if structure is complex, though usually it is.
       currentLine = line
    } else {
        // Since elements are usually in order, if we pass the fold, we can stop?
        // Not necessarily if nested. But good enough.
    }
  }
  
  emit('scroll', currentLine)
}

const scrollToLine = (newLine: number) => {
  if (!containerRef.value) return
  const targetLine = newLine - 1
  const container = containerRef.value
  const elements = Array.from(container.querySelectorAll('[data-line]')) as HTMLElement[]
  
  let currentEl: HTMLElement | null = null
  let nextEl: HTMLElement | null = null
  let currentIndex = -1

  // Find the element matching the target line
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    const line = parseInt(el.getAttribute('data-line') || '-1')
    
    if (!isNaN(line) && line <= targetLine) {
      if (!currentEl || line > parseInt(currentEl.getAttribute('data-line') || '-1')) {
        currentEl = el
        currentIndex = i
      }
    }
  }

  if (currentEl) {
    // Try to find the next element to calculate ratio
    if (currentIndex !== -1 && currentIndex + 1 < elements.length) {
        nextEl = elements[currentIndex + 1]
    }

    const currentLine = parseInt(currentEl.getAttribute('data-line') || '0')
    let ratio = 0
    
    // If we have a next element, we can calculate the ratio within the block
    if (nextEl) {
        const nextLine = parseInt(nextEl.getAttribute('data-line') || '-1')
        if (nextLine > currentLine && nextLine > targetLine) {
            const totalLines = nextLine - currentLine
            const lineDiff = targetLine - currentLine
            ratio = Math.max(0, Math.min(lineDiff / totalLines, 1))
        }
    }
    
    // Calculate target scroll position
    // We use offsetTop to get relative position to the container (which is positioned relative)
    // And add ratio * height for smooth scrolling within large blocks (like charts/tables)
    let targetScrollTop = currentEl.offsetTop + (currentEl.offsetHeight * ratio)
    
    // Ensure we don't scroll past bounds
    const maxScroll = container.scrollHeight - container.clientHeight
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))
    
    container.scrollTo({
        top: targetScrollTop,
        behavior: 'auto'
    })
  }
}

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

const toggleTask = (lineIndex: number) => {
  const lines = props.content.split('\n')
  
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const line = lines[lineIndex]
    // Regex to find task checkbox: start of line, optional whitespace, bullet, whitespace, [ ], whitespace
    // Note: markdown-it-task-lists might render for various bullets
    const match = line.match(/^(\s*[-*+]\s+)\[([ xX])\]/)
    
    if (match) {
      const isChecked = match[2] !== ' '
      const newStatus = isChecked ? ' ' : 'x'
      // Use replacement to preserve indentation and bullet type
      const newLine = line.replace(/^(\s*[-*+]\s+)\[([ xX])\]/, `$1[${newStatus}]`)
      lines[lineIndex] = newLine
      emit('update:content', lines.join('\n'))
    }
  }
}

const handleClick = async (event: MouseEvent) => {
  const target = event.target as HTMLElement
  
  // Handle task list checkbox toggle
  if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox' && target.classList.contains('task-list-item-checkbox')) {
    // Find closest li with data-line
    const li = target.closest('li')
    if (li && li.hasAttribute('data-line')) {
      const lineIndex = parseInt(li.getAttribute('data-line')!, 10)
      if (!isNaN(lineIndex)) {
        toggleTask(lineIndex)
      }
    }
    return
  }

  const link = target.closest('a')
  
  if (link) {
    const href = link.getAttribute('href')
    if (href) {
      // Check if it's an external link
      const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')
      
      // Check if it's an anchor link
      const isAnchor = href.startsWith('#')
      
      if (!isExternal && !isAnchor) {
        event.preventDefault()
        emit('link-click', href)
      } else if (isExternal) {
        event.preventDefault()
        try {
          await openUrl(href)
        } catch (error) {
          console.error('Failed to open external link:', error)
        }
      }
    }
  }
}
</script>

<template>
  <div ref="containerRef" class="h-full w-full overflow-y-auto bg-white dark:bg-[#282c34] relative" @scroll="onScroll">
    <div 
      class="markdown-body p-8 min-h-full"
      v-html="html"
      @click="handleClick"
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

/* Fix for ordered/unordered list styles sometimes being overridden by reset css */
:deep(.markdown-body ul) {
  list-style-type: disc;
  padding-left: 2em;
}

:deep(.markdown-body ol) {
  list-style-type: decimal;
  padding-left: 2em;
}

/* Dark mode overrides for markdown-body */
:global(.dark) .markdown-body {
  color: #abb2bf !important;
  /* Improve text rendering in dark mode */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

:global(.dark) .markdown-body a {
  color: #61afef !important;
}

:global(.dark) .markdown-body h1,
:global(.dark) .markdown-body h2,
:global(.dark) .markdown-body h3,
:global(.dark) .markdown-body h4,
:global(.dark) .markdown-body h5,
:global(.dark) .markdown-body h6 {
  color: #e5c07b !important;
  border-bottom-color: #3e4451;
}

:global(.dark) .markdown-body blockquote {
  color: #5c6370;
  border-left-color: #3e4451;
}

:global(.dark) .markdown-body table tr {
  background-color: #282c34;
  border-top-color: #3e4451;
}

:global(.dark) .markdown-body table tr:nth-child(2n) {
  background-color: #21252b;
}

:global(.dark) .markdown-body table th,
:global(.dark) .markdown-body table td {
  border-color: #3e4451;
}

:global(.dark) .markdown-body hr {
  background-color: #3e4451;
}

:global(.dark) .markdown-body code,
:global(.dark) .markdown-body tt {
  background-color: rgba(171, 178, 191, 0.1); 
}

:global(.dark) .markdown-body pre code {
  background-color: transparent;
}

:global(.dark) .markdown-body pre {
  background-color: #21252b;
}

/* Ensure code blocks look good with atom-one-dark */
:deep(.hljs) {
  padding: 1rem !important;
}
</style>

<style>
/* Force override for dark mode text color using CSS variables and !important */
/* We use a non-scoped block to ensure specificity wins over github-markdown-css */
.dark .markdown-body {
  --fgColor-default:#abb2bf !important;
  --color-fg-default: #abb2bf !important;
  color: #abb2bf !important;
}

.dark .markdown-body h1,
.dark .markdown-body h2,
.dark .markdown-body h3,
.dark .markdown-body h4,
.dark .markdown-body h5,
.dark .markdown-body h6 {
  color: #abb2bf !important;
  border-bottom-color: #21262d;
}

.dark .markdown-body a {
  color: #58a6ff !important;
}

.dark .markdown-body .footnotes {
  color: #abb2bf !important;
  border-top-color: #30363d !important;
}

.dark .markdown-body .footnotes ol li {
  color: #abb2bf !important;
}

.dark .markdown-body table tr {
  background-color: #282c34 !important;
  border-top-color: #3e4451 !important;
}

.dark .markdown-body table tr:nth-child(2n) {
  background-color: #21252b !important;
}

.dark .markdown-body table th,
.dark .markdown-body table td {
  border-color: #3e4451 !important;
}

.dark .markdown-body pre {
  background-color: #21252b !important;
  border: 1px solid #181a1f !important;
}

.dark .markdown-body code,
.dark .markdown-body tt {
  background-color: rgba(171, 178, 191, 0.1) !important;
}

.dark .markdown-body pre code {
  background-color: transparent !important;
}
</style>
