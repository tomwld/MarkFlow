<script setup lang="ts">
import { ref, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDark, useToggle, onClickOutside } from '@vueuse/core'
import { useFileOperations } from '../composables/useFileOperations'
import { useLayout } from '../composables/useLayout'
import { useEditor } from '../composables/useEditor'
import EmojiPicker from './EmojiPicker.vue'

const { t } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)

const showEmojiPickerFromMenu = inject('showEmojiPickerFromMenu', ref(false))

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

const { insertMarkdown, insertEmoji, toggleLinePrefix } = useEditor()

const showEmojiPicker = ref(false)
const showRecentFiles = ref(false)
const recentFilesRef = ref(null)
const showHeadingDropdown = ref(false)
const headingDropdownRef = ref(null)

// Sync with menu event
watch(showEmojiPickerFromMenu, (val) => {
  if (val) {
    showEmojiPicker.value = true
    showEmojiPickerFromMenu.value = false
  }
})

onClickOutside(recentFilesRef, () => {
  showRecentFiles.value = false
})

onClickOutside(headingDropdownRef, () => {
  showHeadingDropdown.value = false
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

      <!-- Group 2: Formatting -->
      <div class="relative" ref="headingDropdownRef">
        <button 
          class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1"
          :class="{ 'bg-gray-200 dark:bg-gray-700': showHeadingDropdown }"
          :title="t('toolbar.insertHeading')" 
          @click="showHeadingDropdown = !showHeadingDropdown"
        >
          <div class="i-carbon-heading text-lg"></div>
          <div class="i-carbon-chevron-down text-xs opacity-50"></div>
        </button>
        <div 
          v-if="showHeadingDropdown"
          class="absolute top-full left-0 mt-1 min-w-32 w-auto bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 flex flex-col py-1"
        >
          <button 
            v-for="i in 6" 
            :key="i"
            class="px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer whitespace-nowrap flex items-center gap-2"
            @click="toggleLinePrefix('#'.repeat(i) + ' '); showHeadingDropdown = false"
          >
            <span :class="`text-base font-bold`" :style="{ fontSize: `${1.5 - (i * 0.1)}rem` }">H{{ i }}</span>
            <span>{{ t(`toolbar.heading${i}`) }}</span>
          </button>
        </div>
      </div>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertBold')" @click="insertMarkdown('bold')">
        <div class="i-carbon-text-bold text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertItalic')" @click="insertMarkdown('italic')">
        <div class="i-carbon-text-italic text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertStrikethrough')" @click="insertMarkdown('strikethrough')">
        <div class="i-carbon-text-strikethrough text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertMark')" @click="insertMarkdown('mark')">
        <div class="i-carbon-text-fill text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertInlineCode')" @click="insertMarkdown('inlineCode')">
        <div class="i-carbon-code text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertSubscript')" @click="insertMarkdown('subscript')">
        <div class="i-carbon-text-subscript text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertSuperscript')" @click="insertMarkdown('superscript')">
        <div class="i-carbon-text-superscript text-lg"></div>
      </button>
       <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertQuote')" @click="insertMarkdown('quote')">
        <div class="i-carbon-quotes text-lg"></div>
      </button>
       <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertUnorderedList')" @click="insertMarkdown('unorderedList')">
        <div class="i-carbon-list-bulleted text-lg"></div>
      </button>
       <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertOrderedList')" @click="insertMarkdown('orderedList')">
        <div class="i-carbon-list-numbered text-lg"></div>
      </button>
      
      <div class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

      <!-- Group 3: Insert Tools -->
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertTable')" @click="insertMarkdown('table')">
        <div class="i-carbon-table text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertHorizontalRule')" @click="insertMarkdown('horizontalRule')">
        <div class="i-carbon-subtract text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertFootnote')" @click="insertMarkdown('footnote')">
        <div class="i-carbon-bookmark text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertTaskList')" @click="insertMarkdown('tasklist')">
        <div class="i-carbon-checkbox-checked text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertCodeBlock')" @click="insertMarkdown('codeblock')">
        <div class="i-carbon-terminal text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertLink')" @click="insertMarkdown('link')">
        <div class="i-carbon-link text-lg"></div>
      </button>
      <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="t('toolbar.insertImage')" @click="insertMarkdown('image')">
        <div class="i-carbon-image text-lg"></div>
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
        <!-- Group 4: View & Layout -->
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

      <!-- Group 5: Settings -->
        <button class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" :title="isDark ? t('toolbar.lightMode') : t('toolbar.darkMode')" @click="toggleDark()">
        <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" class="text-lg"></div>
      </button>
    </div>
  </div>
</template>
