<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import FileTree from './FileTree.vue'
import Outline from './Outline.vue'
import Editor from './Editor.vue'
import Preview from './Preview.vue'
import ContextMenu, { type MenuItem } from './ContextMenu.vue'
import PromptModal from './PromptModal.vue'
import { useLayout } from '../composables/useLayout'
import { useDocuments } from '../composables/useDocuments'
import { useEditor } from '../composables/useEditor'
import { useFileOperations } from '../composables/useFileOperations'

const { t } = useI18n()

const { 
  isFocusMode, 
  showPreview, 
  editorWidth, 
  showSidebar, 
  showOutline, 
  showFiles, 
  sidebarWidth, 
  startSidebarResize,
  startEditorResize
} = useLayout()

const { activeDocument } = useDocuments()

const { 
  loadFile, 
  handleLinkClick,
  currentFolder,
  createFileInDir, 
  createFolderInDir, 
  renamePath, 
  deletePath, 
  showInExplorer
} = useFileOperations()

// Context Menu State
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuItems = ref<MenuItem[]>([])

// Prompt Modal State
const promptVisible = ref(false)
const promptTitle = ref('')
const promptDefault = ref('')
const promptAction = ref<((value: string) => Promise<void>) | null>(null)

// Refresh Signal
const refreshSignal = ref(0)

const handlePromptConfirm = async (value: string) => {
  if (promptAction.value) {
    await promptAction.value(value)
    promptAction.value = null
    refreshSignal.value++
  }
}

const handleFileContextMenu = (e: MouseEvent, path: string, isDir: boolean) => {
  e.preventDefault()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  
  const items: MenuItem[] = []
  
  if (isDir) {
    items.push({
      label: t('menu.newFile'),
      icon: 'i-carbon-document-add',
      action: () => {
        promptTitle.value = t('menu.newFile')
        promptDefault.value = ''
        promptAction.value = async (name) => {
          const newPath = await createFileInDir(path, name)
          await loadFile(newPath)
        }
        promptVisible.value = true
      }
    })
    items.push({
      label: t('menu.newFolder'),
      icon: 'i-carbon-folder-add',
      action: () => {
        promptTitle.value = t('menu.newFolder')
        promptDefault.value = ''
        promptAction.value = async (name) => {
          await createFolderInDir(path, name)
        }
        promptVisible.value = true
      }
    })
    items.push({ separator: true, label: '', action: () => {} })
  }

  items.push({
    label: t('menu.rename'),
    icon: 'i-carbon-edit',
    action: () => {
      promptTitle.value = t('menu.rename')
      promptDefault.value = path.split(/[\\/]/).pop() || ''
      promptAction.value = async (name) => {
        if (name !== promptDefault.value) {
          await renamePath(path, name)
        }
      }
      promptVisible.value = true
    }
  })
  
  items.push({
    label: t('menu.delete'),
    icon: 'i-carbon-trash-can',
    danger: true,
    action: async () => {
      if (await deletePath(path, isDir)) {
        refreshSignal.value++
      }
    }
  })
  
  items.push({ separator: true, label: '', action: () => {} })
  
  items.push({
    label: t('menu.revealInExplorer'),
    icon: 'i-carbon-folder-open',
    action: () => showInExplorer(path)
  })
  
  contextMenuItems.value = items
  contextMenuVisible.value = true
}

const { 
  editorRef, 
  scrollToLine, 
  handleCursorChange 
} = useEditor()

const { newFile, openFile, openFolder } = useFileOperations()
</script>

<template>
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Sidebar (File Tree & Outline) -->
    <aside 
      v-if="!isFocusMode && showSidebar && (currentFolder || showOutline)" 
      class="border-r border-gray-200 dark:border-[#181a1f] flex flex-col bg-gray-50 dark:bg-[#21252b] shrink-0"
      :style="{ width: `${sidebarWidth}px` }"
    >
       <!-- Files Section -->
       <div 
         v-if="currentFolder" 
         class="flex flex-col min-h-0 transition-[flex-grow] duration-200" 
         :class="[showFiles ? 'flex-1' : 'flex-none']"
       >
          <div 
            class="flex items-center px-2 py-1.5 bg-gray-100 dark:bg-[#282c34] cursor-pointer hover:bg-gray-200 dark:hover:bg-[#2c313a] transition-colors border-b border-gray-200 dark:border-[#181a1f]"
            @click="showFiles = !showFiles"
            @contextmenu.prevent="currentFolder && handleFileContextMenu($event, currentFolder, true)"
          >
             <div class="i-carbon-chevron-right transform transition-transform text-gray-500" :class="{ 'rotate-90': showFiles }"></div>
             <span class="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex-1 truncate" :title="currentFolder">{{ currentFolder.split(/[\\/]/).pop() }}</span>
             <div class="flex items-center">
               <button class="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded" @click.stop="currentFolder = null" :title="t('toolbar.closeFolder')">
                  <div class="i-carbon-close text-xs"></div>
               </button>
             </div>
          </div>
          <div v-show="showFiles" class="flex-1 overflow-y-auto custom-scrollbar">
             <FileTree 
               :path="currentFolder" 
               :refresh-signal="refreshSignal"
               @file-click="(path) => loadFile(path)" 
               @context-menu="handleFileContextMenu"
             />
          </div>
       </div>

       <!-- Outline Section -->
       <div 
          class="flex flex-col min-h-0 border-t border-gray-200 dark:border-[#181a1f] transition-[flex-grow] duration-200" 
          :class="[showOutline ? 'flex-1' : 'flex-none']"
       >
          <div 
            class="flex items-center px-2 py-1.5 bg-gray-100 dark:bg-[#282c34] cursor-pointer hover:bg-gray-200 dark:hover:bg-[#2c313a] transition-colors border-b border-gray-200 dark:border-[#181a1f]"
            @click="showOutline = !showOutline"
          >
             <div class="i-carbon-chevron-right transform transition-transform text-gray-500" :class="{ 'rotate-90': showOutline }"></div>
             <span class="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{{ t('menu.toggleOutline') }}</span>
          </div>
          <div v-show="showOutline" class="flex-1 overflow-hidden">
             <Outline v-if="activeDocument" :content="activeDocument.content" @jump="(line) => scrollToLine = line" />
             <div v-else class="text-sm text-gray-400 p-4 text-center">{{ t('outline.noActiveFile') || 'No active file' }}</div>
          </div>
       </div>
    </aside>

    <!-- Sidebar Resizer -->
    <div 
      v-if="!isFocusMode && showSidebar && (currentFolder || showOutline)"
      class="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize z-20 shrink-0"
      @mousedown="startSidebarResize"
    ></div>

    <!-- Center Content -->
    <div class="flex-1 flex flex-col min-w-0 relative">
      <div v-if="activeDocument" class="flex-1 flex w-full h-full">
        <!-- Editor Pane -->
        <div 
          class="h-full flex flex-col"
          :style="{ width: showPreview ? `${editorWidth}%` : '100%' }"
        >
          <Editor 
            ref="editorRef"
            :key="activeDocument.id"
            :model-value="activeDocument.content"
            :scroll-to-line="scrollToLine ?? undefined"
            :initial-cursor-line="activeDocument.cursorLine"
            :initial-cursor-col="activeDocument.cursorCol"
            @update:model-value="(val) => { if(activeDocument) { activeDocument.content = val; activeDocument.isModified = true; } }"
            @cursor-change="handleCursorChange"
          />
        </div>
        
        <!-- Resizer Handle -->
        <div 
          v-if="showPreview"
          class="w-1 h-full bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
          @mousedown="startEditorResize"
        ></div>
        
        <!-- Preview Pane -->
        <div 
          v-if="showPreview"
          class="h-full bg-white dark:bg-[#282c34] overflow-hidden"
          :style="{ width: `${100 - editorWidth}%` }"
        >
          <Preview 
            :content="activeDocument.content" 
            :cursor-line="activeDocument.cursorLine"
            @link-click="handleLinkClick"
            @update:content="(newContent) => { if(activeDocument) { activeDocument.content = newContent; activeDocument.isModified = true; } }"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex-1 flex items-center justify-center text-gray-400">
        <div class="text-center">
          <div class="i-carbon-document text-6xl mb-4 mx-auto"></div>
          <p>No open files</p>
          <div class="flex gap-4 mt-4 justify-center">
            <button class="text-blue-500 hover:underline" @click="newFile">New File</button>
            <button class="text-blue-500 hover:underline" @click="openFile">Open File</button>
            <button class="text-blue-500 hover:underline" @click="openFolder">Open Folder</button>
          </div>
        </div>
      </div>
      
      <!-- Focus Mode Exit Button (Floating) -->
      <button 
        v-if="isFocusMode"
        class="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full opacity-0 hover:opacity-100 transition-opacity shadow-lg z-50"
        title="Exit Focus Mode"
        @click="isFocusMode = false"
      >
        <div class="i-carbon-minimize text-lg"></div>
      </button>
    </div>

    <!-- Modals -->
    <ContextMenu
      v-model:visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
    />
    
    <PromptModal
      v-model:visible="promptVisible"
      :title="promptTitle"
      :default-value="promptDefault"
      @confirm="handlePromptConfirm"
    />
  </div>
</template>
