<script setup lang="ts">
import { type MarkdownDocument } from '../types/document'

defineProps<{
  documents: MarkdownDocument[]
  activeId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'close', id: string): void
}>()
</script>

<template>
  <div class="flex items-center bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar select-none">
    <div 
      v-for="doc in documents" 
      :key="doc.id"
      class="group flex items-center gap-2 px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer min-w-[120px] max-w-[200px] h-9"
      :class="[
        activeId === doc.id 
          ? 'bg-white dark:bg-[#1e1e1e] text-blue-600 dark:text-blue-400' 
          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]'
      ]"
      :title="doc.filePath || doc.title"
      @click="emit('select', doc.id)"
      @auxclick.middle="emit('close', doc.id)"
    >
      <div class="flex-1 truncate relative pr-2">
        <span class="truncate">{{ doc.title }}</span>
        <!-- Dirty Indicator (Dot) -->
        <span 
          v-if="doc.isModified" 
          class="absolute -right-0 top-0.5 w-1.5 h-1.5 rounded-full bg-blue-500"
        ></span>
      </div>
      
      <!-- Close Button -->
      <div 
        class="w-5 h-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-opacity"
        @click.stop="emit('close', doc.id)"
      >
        <div class="i-carbon-close text-xs"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
