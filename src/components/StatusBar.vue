<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  wordCount: number
  lineCount: number
  cursorLine?: number
  cursorCol?: number
  filePath?: string | null
}>()
</script>

<template>
  <div class="h-6 bg-gray-100 dark:bg-[#2c2c2c] border-t border-gray-200 dark:border-gray-700 flex items-center px-4 text-xs text-gray-500 dark:text-gray-400 gap-4 select-none justify-between">
    <div class="flex gap-4 items-center overflow-hidden">
      <span v-if="filePath" class="truncate max-w-[400px]" :title="filePath">{{ filePath }}</span>
      <span v-else>{{ t('menu.new') }}</span>
    </div>
    <div class="flex gap-4 items-center shrink-0">
      <span>{{ t('status.words') }}: {{ wordCount }}</span>
      <span>{{ t('status.lines') }}: {{ lineCount }}</span>
      <span v-if="cursorLine">{{ t('status.ln') }} {{ cursorLine }}, {{ t('status.col') }} {{ cursorCol }}</span>
      <span>UTF-8</span>
    </div>
  </div>
</template>
