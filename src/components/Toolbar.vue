<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDark, useToggle, onClickOutside } from '@vueuse/core'
import { useFileOperations } from '../composables/useFileOperations'
import { useLayout } from '../composables/useLayout'
import { useEditor } from '../composables/useEditor'
import EmojiPicker from './EmojiPicker.vue'

const { t } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)

const { 
  newFile, 
  openFile, 
  openFolder, 
  saveFile, 
  loadFile,
  recentFiles 
} = useFileOperations()

const { 
  isFocusMode, 
  showSidebar, 
  showOutline, 
  showPreview, 
  toggleOutline 
} = useLayout()

const { insertMarkdown, insertEmoji } = useEditor()

const showEmojiPicker = ref(false)
const showRecentFiles = ref(false)
const recentFilesRef = ref(null)

onClickOutside(recentFilesRef, () => {
  showRecentFiles.value = false
})

const onEmojiSelect = (emoji: string) => {
  insertEmoji(emoji)
  showEmojiPicker.value = false
}
</script>

<template>
  <div v-if="!isFocusMode" class="h-10 bg-gray-50 dark:bg-[#333333] border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between shrink-0 select-none">
    <div class="flex items-center gap-2">
      <!-- Group 1: File Operations -->
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.newFile')" @click="newFile">
        <div class="i-carbon-add text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.openFile')" @click="openFile">
        <div class="i-carbon-folder-open text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.openFolder')" @click="openFolder">
        <div class="i-carbon-folder-add text-lg"></div>
      </button>
      
      <!-- Recent Files Dropdown Trigger -->
      <div class="relative" ref="recentFilesRef">
          <button 
            class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1" 
            :class="{ 'bg-gray-200 dark:bg-gray-700': showRecentFiles }"
            :title="t('toolbar.recentFiles')"
            @click="showRecentFiles = !showRecentFiles"
          >
          <div class="i-carbon-time text-lg"></div>
        </button>
        <div 
          v-if="showRecentFiles"
          class="absolute top-full left-0 mt-1 min-w-64 w-auto max-w-[80vw] bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50"
        >
          <div v-if="recentFiles.length === 0" class="p-2 text-sm text-gray-500">{{ t('toolbar.noRecentFiles') }}</div>
          <div 
            v-for="file in recentFiles" 
            :key="file"
            class="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer whitespace-nowrap"
            @click="loadFile(file); showRecentFiles = false"
          >
            {{ file }}
          </div>
        </div>
      </div>

      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.save')" @click="saveFile()">
        <div class="i-carbon-save text-lg"></div>
      </button>
      
      <div class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

      <!-- Group 2: Insert Tools -->
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertTable')" @click="insertMarkdown('table')">
        <div class="i-carbon-table text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertFootnote')" @click="insertMarkdown('footnote')">
        <div class="i-carbon-quotes text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertTaskList')" @click="insertMarkdown('tasklist')">
        <div class="i-carbon-checkbox-checked text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertCodeBlock')" @click="insertMarkdown('codeblock')">
        <div class="i-carbon-code text-lg"></div>
      </button>

      <div class="relative">
        <button 
          class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          :class="{ 'bg-gray-200 dark:bg-gray-700': showEmojiPicker }" 
          :title="t('toolbar.insertEmoji')" 
          @click="showEmojiPicker = !showEmojiPicker"
        >
          <div class="i-carbon-face-satisfied text-lg"></div>
        </button>
        <EmojiPicker 
          v-if="showEmojiPicker" 
          class="absolute top-full left-0 mt-1 z-50"
          @select="onEmojiSelect"
          @close="showEmojiPicker = false"
        />
      </div>
    </div>
    
    <div class="flex items-center gap-2">
        <!-- Group 3: View & Layout -->
      <button 
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" 
        :class="{ 'bg-gray-200 dark:bg-gray-700': showSidebar }"
        :title="t('toolbar.toggleSidebar')" 
        @click="showSidebar = !showSidebar"
      >
        <div class="i-carbon-side-panel-open text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :class="{ 'bg-gray-200 dark:bg-gray-700': showOutline }" :title="showOutline ? t('toolbar.hideOutline') : t('toolbar.showOutline')" @click="toggleOutline()">
        <div class="i-carbon-tree-view-alt text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="showPreview ? t('toolbar.hidePreview') : t('toolbar.showPreview')" @click="showPreview = !showPreview">
        <div :class="showPreview ? 'i-carbon-open-panel-filled-right' : 'i-carbon-open-panel-right'" class="text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.focusMode')" @click="isFocusMode = true">
        <div class="i-carbon-center-to-fit text-lg"></div>
      </button>

      <div class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

      <!-- Group 4: Settings -->
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="isDark ? t('toolbar.lightMode') : t('toolbar.darkMode')" @click="toggleDark()">
        <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" class="text-lg"></div>
      </button>
    </div>
  </div>
</template>
