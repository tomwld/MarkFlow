<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'

export interface MenuItem {
  label: string
  action: () => void
  icon?: string
  separator?: boolean
  disabled?: boolean
  danger?: boolean
}

const props = defineProps<{
  items: MenuItem[]
  x: number
  y: number
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(0)
const adjustedY = ref(0)

onClickOutside(menuRef, () => {
  if (props.visible) {
    emit('update:visible', false)
    emit('close')
  }
})

watch(
  [() => props.visible, () => props.x, () => props.y],
  async ([visible, x, y]) => {
    if (visible) {
      // Initially set to the click position
      adjustedX.value = x
      adjustedY.value = y
      
      await nextTick()
      
      if (menuRef.value) {
        const rect = menuRef.value.getBoundingClientRect()
        const winWidth = window.innerWidth
        const winHeight = window.innerHeight
        
        // Check vertical overflow
        // If the menu goes off the bottom of the screen, show it above the cursor
        if (y + rect.height > winHeight) {
          adjustedY.value = Math.max(0, y - rect.height)
        }
        
        // Check horizontal overflow
        // If the menu goes off the right of the screen, show it to the left of the cursor
        if (x + rect.width > winWidth) {
          adjustedX.value = Math.max(0, x - rect.width)
        }
      }
    }
  },
  { immediate: true }
)

const style = computed(() => {
  return {
    top: `${adjustedY.value}px`,
    left: `${adjustedX.value}px`
  }
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="visible"
      ref="menuRef"
      class="fixed z-50 bg-white dark:bg-[#21252b] border border-gray-200 dark:border-[#181a1f] rounded shadow-lg py-1 min-w-40 text-sm select-none"
      :style="style"
      @contextmenu.prevent
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="item.separator" class="h-px bg-gray-200 dark:bg-[#181a1f] my-1 mx-2"></div>
        <div 
          v-else
          class="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2c313a] mx-1 rounded"
          :class="[
            item.disabled ? 'opacity-50 cursor-not-allowed' : '',
            item.danger ? 'text-red-500' : 'text-gray-700 dark:text-[#abb2bf]'
          ]"
          @click="!item.disabled && (item.action(), emit('update:visible', false), emit('close'))"
        >
          <div v-if="item.icon" :class="item.icon" class="text-lg opacity-70"></div>
          <span>{{ item.label }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>
