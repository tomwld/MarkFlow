import { invoke } from '@tauri-apps/api/core'
import { Composer } from 'vue-i18n'

export const updateMenuLanguage = async (t: Composer['t']) => {
  const labels = {
    file: t('menu.file'),
    new: t('menu.new'),
    open: t('menu.open'),
    openFolder: t('menu.openFolder'),
    save: t('menu.save'),
    saveAs: t('menu.saveAs'),
    close: t('menu.close'),
    quit: t('menu.exit'),
    edit: t('menu.edit'),
    undo: t('menu.undo'),
    redo: t('menu.redo'),
    cut: t('menu.cut'),
    copy: t('menu.copy'),
    paste: t('menu.paste'),
    selectAll: t('menu.selectAll'),
    view: t('menu.view'),
    toggleSidebar: t('menu.toggleSidebar'),
    toggleOutline: t('menu.toggleOutline'),
    togglePreview: t('menu.togglePreview'),
    toggleTheme: t('menu.toggleTheme'),
    toggleFocus: t('menu.toggleFocus'),
    settings: t('menu.settings'),
    help: t('menu.help'),
    about: t('menu.about'),
  }
  
  try {
    await invoke('update_menu', { labels })
  } catch (e) {
    console.error('Failed to update menu language:', e)
  }
}
