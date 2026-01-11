<script setup lang="ts">
import { computed, ref } from 'vue'
import OutlineItem from './OutlineItem.vue'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  (e: 'jump', line: number): void
}>()

interface Heading {
  level: number
  text: string
  line: number
  children: Heading[]
  expanded: boolean
  id: string
}

// Map to store expansion state by ID (text + level)
const expandedState = ref<Record<string, boolean>>({})

const toggleExpand = (id: string) => {
  if (expandedState.value[id] === undefined) {
    expandedState.value[id] = false // If it was implicitly true, set to false
  } else {
    expandedState.value[id] = !expandedState.value[id]
  }
}

const headings = computed(() => {
  if (!props.content) return []
  
  const root: Heading[] = []
  const stack: Heading[] = []
  
  const lines = props.content.split(/\r?\n/)
  let inCodeBlock = false
  
  lines.forEach((line, index) => {
    // Check for code block boundaries
    if (line.match(/^\s{0,3}(`{3,}|~{3,})/)) {
      inCodeBlock = !inCodeBlock
      return
    }
    
    if (inCodeBlock) return

    // Match headers # to ######
    const match = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = `${level}-${text}` // Use level-text as ID for persistence
      
      const node: Heading = {
        level,
        text,
        line: index + 1,
        children: [],
        expanded: expandedState.value[id] ?? true, // Default to expanded
        id
      }

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      if (stack.length === 0) {
        root.push(node)
      } else {
        stack[stack.length - 1].children.push(node)
      }
      stack.push(node)
    }
  })
  
  return root
})

const handleJump = (line: number) => {
  emit('jump', line)
}
</script>

<template>
  <div class="h-full overflow-y-auto py-2 custom-scrollbar">
    <div v-if="headings.length === 0" class="text-sm text-gray-400 p-4 text-center">
      {{ $t ? $t('outline.noHeadings') : 'No headings' }}
    </div>
    
    <div class="px-2">
      <OutlineItem 
        v-for="(heading, i) in headings" 
        :key="i"
        :heading="heading"
        @jump="handleJump"
        @toggle="toggleExpand"
      />
    </div>
  </div>
</template>
