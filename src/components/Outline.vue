<script setup lang="ts">
import { computed } from 'vue'

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
}

const headings = computed(() => {
  if (!props.content) return []
  
  const result: Heading[] = []
  const lines = props.content.split('\n')
  
  lines.forEach((line, index) => {
    // Match headers # to ######
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      result.push({
        level: match[1].length,
        text: match[2].trim(),
        line: index + 1
      })
    }
  })
  
  return result
})

const handleJump = (line: number) => {
  emit('jump', line)
}
</script>

<template>
  <div class="h-full overflow-y-auto py-2">
    <div v-if="headings.length === 0" class="text-sm text-gray-400 p-4 text-center">
      No headings
    </div>
    
    <div 
      v-for="(heading, i) in headings" 
      :key="i"
      class="px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 truncate transition-colors duration-150"
      :style="{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }"
      @click="handleJump(heading.line)"
      :title="heading.text"
    >
      {{ heading.text }}
    </div>
  </div>
</template>
