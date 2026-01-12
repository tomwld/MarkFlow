import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

// Singleton state for layout
const isFocusMode = ref(false)
const showPreview = ref(true)
const editorWidth = ref(50) // percentage
const showSidebar = ref(true)
const showOutline = ref(true)
const showFiles = ref(true)
const showSettings = ref(false)
const showEmojiPicker = ref(false)
const sidebarWidth = useStorage('sidebar-width', 250)

// Resizing state
const isSidebarResizing = ref(false)
const sidebarStartX = ref(0)
const sidebarStartWidth = ref(0)

const isEditorResizing = ref(false)
const editorStartX = ref(0)
const editorStartWidth = ref(0)

export function useLayout() {
  const toggleOutline = () => {
    showOutline.value = !showOutline.value
    if (showOutline.value) {
      showSidebar.value = true
    }
  }

  // Sidebar Resizing
  const startSidebarResize = (e: MouseEvent) => {
    isSidebarResizing.value = true
    sidebarStartX.value = e.clientX
    sidebarStartWidth.value = sidebarWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    window.addEventListener('mousemove', handleSidebarResize)
    window.addEventListener('mouseup', stopSidebarResize)
  }

  const handleSidebarResize = (e: MouseEvent) => {
    if (!isSidebarResizing.value) return
    const diff = e.clientX - sidebarStartX.value
    const newWidth = sidebarStartWidth.value + diff
    sidebarWidth.value = Math.min(Math.max(newWidth, 150), 600)
  }

  const stopSidebarResize = () => {
    isSidebarResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', handleSidebarResize)
    window.removeEventListener('mouseup', stopSidebarResize)
  }

  // Editor/Preview Resizing
  const startEditorResize = (e: MouseEvent) => {
    isEditorResizing.value = true
    editorStartX.value = e.clientX
    editorStartWidth.value = editorWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    window.addEventListener('mousemove', handleEditorResize)
    window.addEventListener('mouseup', stopEditorResize)
  }

  const handleEditorResize = (e: MouseEvent) => {
    if (!isEditorResizing.value) return
    const containerWidth = window.innerWidth
    const diff = e.clientX - editorStartX.value
    const newWidth = editorStartWidth.value + (diff / containerWidth) * 100
    editorWidth.value = Math.min(Math.max(newWidth, 20), 80)
  }

  const stopEditorResize = () => {
    isEditorResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', handleEditorResize)
    window.removeEventListener('mouseup', stopEditorResize)
  }

  return {
    isFocusMode,
    showPreview,
    editorWidth,
    showSidebar,
    showOutline,
    showFiles,
    showSettings,
    showEmojiPicker,
    sidebarWidth,
    toggleOutline,
    startSidebarResize,
    startEditorResize
  }
}
