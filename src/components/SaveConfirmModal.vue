<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  show: boolean
  fileName: string
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'discard'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="props.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="emit('cancel')">
    <div class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl w-[400px] overflow-hidden" @click.stop>
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ t('dialog.saveChanges') }}</h2>
        <button class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" @click="emit('cancel')">
          <span class="i-carbon-close text-xl"></span>
        </button>
      </div>
      
      <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300 mb-6">
          {{ t('dialog.saveChangesMessage', { file: fileName }) }}
        </p>
        
        <div class="flex justify-end gap-3">
           <button 
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="emit('discard')"
          >
            {{ t('dialog.dontSave') }}
          </button>
          <button 
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="emit('cancel')"
          >
            {{ t('dialog.cancel') }}
          </button>
          <button 
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            @click="emit('save')"
          >
            {{ t('dialog.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
