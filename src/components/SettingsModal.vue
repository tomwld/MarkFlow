<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { updateMenuLanguage } from '../utils/menu'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t, locale } = useI18n()

const languages = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' }
]

const currentLang = ref(locale.value)

const changeLanguage = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  if (target) {
    const lang = target.value
    locale.value = lang
    currentLang.value = lang
    localStorage.setItem('locale', lang)
    await updateMenuLanguage(t)
  }
}
</script>

<template>
  <div v-if="props.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="emit('close')">
    <div class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl w-[500px] overflow-hidden" @click.stop>
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ t('settings.title') }}</h2>
        <button class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" @click="emit('close')">
          <span class="i-carbon-close text-xl"></span>
        </button>
      </div>
      
      <div class="p-6">
        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">{{ t('settings.general') }}</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-600 dark:text-gray-400">{{ t('settings.language') }}</label>
                <select 
                  v-model="currentLang"
                  class="block w-40 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2d2d2d] py-1.5 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  @change="changeLanguage($event)"
                >
                  <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                    {{ lang.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="px-6 py-4 bg-gray-50 dark:bg-[#252526] border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button 
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="emit('close')"
        >
          {{ t('settings.close') }}
        </button>
      </div>
    </div>
  </div>
</template>
