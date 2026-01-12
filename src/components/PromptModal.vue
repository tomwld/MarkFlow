<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  title: string
  defaultValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', value: string): void
}>()

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.visible, (val) => {
  if (val) {
    inputValue.value = props.defaultValue || ''
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
})

const confirm = () => {
  if (!inputValue.value.trim()) return
  emit('confirm', inputValue.value)
  emit('update:visible', false)
}

const cancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" @click.self="cancel">
      <div class="bg-white dark:bg-[#21252b] p-4 rounded-lg shadow-xl w-80 border border-gray-200 dark:border-[#181a1f]">
        <h3 class="text-lg font-bold mb-4 text-gray-800 dark:text-[#abb2bf]">{{ title }}</h3>
        <input 
          ref="inputRef"
          v-model="inputValue"
          class="w-full px-3 py-2 border rounded mb-4 bg-gray-50 dark:bg-[#282c34] border-gray-300 dark:border-[#181a1f] text-gray-800 dark:text-[#abb2bf] focus:outline-none focus:border-blue-500"
          @keydown.enter="confirm"
          @keydown.escape="cancel"
        />
        <div class="flex justify-end gap-2">
          <button class="px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2c313a] text-gray-600 dark:text-[#abb2bf]" @click="cancel">Cancel</button>
          <button class="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white" @click="confirm">OK</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
