<script setup lang="ts">
import { ref, watch } from 'vue'
import { readDir, type DirEntry } from '@tauri-apps/plugin-fs'

const props = defineProps<{
  path: string
  depth?: number
  refreshSignal?: number
}>()

const emit = defineEmits<{
  (e: 'file-click', path: string): void
  (e: 'context-menu', event: MouseEvent, path: string, isDir: boolean): void
}>()

const entries = ref<DirEntry[]>([])
const isOpen = ref(false)
const isLoading = ref(false)

// Helper to check if file is markdown
const isMarkdown = (name: string) => /\.(md|markdown)$/i.test(name)

const loadDir = async () => {
  if (!props.path) return
  isLoading.value = true
  try {
    const result = await readDir(props.path)
    // Sort: Folders first, then files. Alphabetical.
    entries.value = result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    // Ignore error if path no longer exists (e.g. during rename/delete)
    const errStr = String(error)
    if (errStr.includes('os error 3') || errStr.includes('no such file or directory')) {
      entries.value = [] // Clear entries as path is gone
      return
    }
    console.error('Failed to read dir:', props.path, error)
  } finally {
    isLoading.value = false
  }
}

const toggle = async () => {
  if (props.depth === 0) return // Root always open effectively, handled by watcher
  isOpen.value = !isOpen.value
  if (isOpen.value && entries.value.length === 0) {
    await loadDir()
  }
}

watch(() => props.refreshSignal, async () => {
  if (isOpen.value) {
    await loadDir()
  }
})

const handleFileClick = async (entry: DirEntry) => {
  if (entry.isDirectory) return
  // We need full path. 
  // Since DirEntry doesn't always have full path in v2 (it might just be name), 
  // we construct it.
  // Wait, join is async in Tauri v2 APIs sometimes, but let's check import.
  // Actually, constructing path manually for display might be easier if we know separator.
  // But safer to use join.
  // However, join from @tauri-apps/api/path is async.
  // Let's pass the parent path + name.
  
  // For simplicity, let's assume we can just concat with standard separator if we are on Windows/Linux specific, 
  // but better to use the API or just passed path.
  // Actually, since we are in a recursive component, we can compute full path easily if we have parent path.
  
  // To avoid async join in template loop, let's just do a simple string join for now 
  // knowing we are on Windows (based on env) or use a helper.
  // But we have `path` prop.
  
  const fullPath = `${props.path}\\${entry.name}` // Naive join for Windows, but we should be careful.
  // Better: emit the join request or handle it. 
  // Actually, let's use a prop for full path construction.
  
  emit('file-click', fullPath)
}

const handleContextMenu = (e: MouseEvent, entry: DirEntry) => {
  const fullPath = `${props.path}\\${entry.name}`
  emit('context-menu', e, fullPath, entry.isDirectory)
}

const handleHeaderContextMenu = (e: MouseEvent) => {
  emit('context-menu', e, props.path, true)
}

const handleChildClick = (path: string) => {
  emit('file-click', path)
}

// Watch path changes to reload if it's root
watch(() => props.path, async () => {
  if (props.depth === 0) {
    isOpen.value = true
    await loadDir()
  } else {
    entries.value = []
    isOpen.value = false
  }
}, { immediate: true })

</script>

<template>
  <div class="text-sm select-none">
    <!-- Directory Header (only for non-root depth) -->
    <div 
      v-if="depth !== 0"
      class="flex items-center gap-1 py-1 px-2 hover:bg-gray-100 dark:hover:bg-[#2c313a] cursor-pointer text-gray-700 dark:text-[#abb2bf]"
      :style="{ paddingLeft: `${(depth || 0) * 12 + 8}px` }"
      @click="toggle"
      @contextmenu.prevent.stop="handleHeaderContextMenu"
    >
      <div :class="isOpen ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'" class="text-xs opacity-70"></div>
      <div class="i-carbon-folder text-yellow-500"></div>
      <span class="truncate">{{ path.split(/[\\/]/).pop() }}</span>
    </div>

    <!-- Children -->
    <div v-if="isOpen || depth === 0">
      <template v-for="entry in entries" :key="entry.name">
        <!-- Folder (Recursive) -->
        <FileTree 
          v-if="entry.isDirectory"
          :path="`${path}\\${entry.name}`" 
          :depth="(depth || 0) + 1"
          :refresh-signal="refreshSignal"
          @file-click="handleChildClick"
          @context-menu="(e, p, d) => emit('context-menu', e, p, d)"
        />
        
        <!-- File (Markdown only) -->
        <div 
          v-else-if="isMarkdown(entry.name)"
          class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-[#2c313a] cursor-pointer text-gray-600 dark:text-[#abb2bf]"
          :style="{ paddingLeft: `${(depth || 0) * 12 + (depth === 0 ? 8 : 20)}px` }"
          @click="handleFileClick(entry)"
          @contextmenu.prevent.stop="handleContextMenu($event, entry)"
        >
          <div class="i-carbon-document text-gray-400"></div>
          <span class="truncate">{{ entry.name }}</span>
        </div>
      </template>
      
      <div v-if="entries.length === 0 && !isLoading && depth === 0" class="p-4 text-center text-gray-400 text-xs">
        No files found
      </div>
    </div>
  </div>
</template>
