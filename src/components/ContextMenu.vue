<script setup lang="ts">
import { ref, computed } from 'vue'
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

onClickOutside(menuRef, () => {
  if (props.visible) {
    emit('update:visible', false)
    emit('close')
  }
})

const style = computed(() => {
  // Basic bounds checking could be added here
  return {
    top: `${props.y}px`,
    left: `${props.x}px`
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
