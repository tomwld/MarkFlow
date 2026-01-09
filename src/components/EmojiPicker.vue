<script setup lang="ts">
import { ref, computed } from 'vue'
import { emojiCategories } from '../data/emojis'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'

const { t } = useI18n()
const emit = defineEmits<{
  (e: 'select', emoji: string): void
  (e: 'close'): void
}>()

const activeCategory = ref(emojiCategories[0].id)
const target = ref(null)

onClickOutside(target, () => emit('close'))

const currentEmojis = computed(() => {
  return emojiCategories.find(c => c.id === activeCategory.value)?.emojis || []
})
</script>

<template>
  <div ref="target" class="bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 flex flex-col overflow-hidden">
    <!-- Header/Tabs -->
    <div class="flex items-center overflow-x-auto p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e] scrollbar-hide">
      <button
        v-for="cat in emojiCategories"
        :key="cat.id"
        class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 shrink-0 transition-colors mr-1"
        :class="{ 'bg-gray-200 dark:bg-gray-700 text-blue-500': activeCategory === cat.id }"
        :title="t(`emoji.${cat.id}`)"
        @click="activeCategory = cat.id"
      >
        <div :class="[cat.icon, 'text-lg']"></div>
      </button>
    </div>

    <!-- Emoji Grid -->
    <div class="p-2 h-64 overflow-y-auto grid grid-cols-8 gap-1 custom-scrollbar">
      <button
        v-for="emoji in currentEmojis"
        :key="emoji"
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl transition-colors"
        @click="emit('select', emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
