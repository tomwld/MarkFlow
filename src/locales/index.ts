import { createI18n } from 'vue-i18n'
import en from './en'
import zhCN from './zh-CN'

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: localStorage.getItem('locale') || 'zh-CN', // Default locale
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN
  }
})

export default i18n
