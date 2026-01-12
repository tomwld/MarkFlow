<script setup lang="ts">
import { computed } from 'vue'

interface Heading {
  level: number
  text: string
  line: number
  children: Heading[]
  expanded: boolean
  id: string
}

const props = defineProps<{
  heading: Heading
}>()

const emit = defineEmits<{
  (e: 'jump', line: number): void
  (e: 'toggle', id: string): void
}>()

const hasChildren = computed(() => props.heading.children && props.heading.children.length > 0)

const handleClick = () => {
  emit('jump', props.heading.line)
}

const handleToggle = (e: MouseEvent) => {
  e.stopPropagation()
  emit('toggle', props.heading.id)
}
</script>

<template>
  <div class="outline-item select-none">
    <div 
      class="flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2c313a] text-gray-600 dark:text-[#abb2bf] transition-colors duration-150 rounded"
      :class="{ 'font-medium text-gray-900 dark:text-[#e5c07b]': heading.level === 1 }"
      @click="handleClick"
      :title="heading.text"
    >
      <!-- Indentation spacer -->
      <div :style="{ width: `${(heading.level - 1) * 12}px` }" class="shrink-0"></div>
      
      <!-- Expander -->
      <div 
        class="w-4 h-4 flex items-center justify-center shrink-0 hover:text-gray-900 dark:hover:text-white rounded"
        @click="handleToggle"
      >
        <div 
            v-if="hasChildren" 
            class="transition-transform duration-200"
            :class="heading.expanded ? 'rotate-90' : ''"
        >
            <div class="i-carbon-caret-right text-xs"></div>
        </div>
        <div v-else class="w-4"></div>
      </div>

      <!-- Text -->
      <span class="truncate">{{ heading.text }}</span>
    </div>

    <!-- Children -->
    <div v-if="heading.expanded && hasChildren">
      <OutlineItem 
        v-for="(child, i) in heading.children" 
        :key="i" 
        :heading="child" 
        @jump="(line) => emit('jump', line)"
        @toggle="(id) => emit('toggle', id)"
      />
    </div>
  </div>
</template>
