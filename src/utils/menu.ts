import { invoke } from '@tauri-apps/api/core'
import { Composer } from 'vue-i18n'
import { message } from '@tauri-apps/plugin-dialog'

export const updateMenuLanguage = async (t: Composer['t']) => {
  const labels = {
    file: t('menu.file'),
    new: t('menu.new'),
    open: t('menu.open'),
    openFolder: t('menu.openFolder'),
    save: t('menu.save'),
    saveAs: t('menu.saveAs'),
    exportPdf: t('menu.exportPdf'),
    exportHtml: t('menu.exportHtml'),
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
    insert: t('menu.insert'),
    insertTable: t('menu.insertTable'),
    insertFootnote: t('menu.insertFootnote'),
    insertTaskList: t('menu.insertTaskList'),
    insertCodeBlock: t('menu.insertCodeBlock'),
    insertEmoji: t('menu.insertEmoji'),
    toggleSidebar: t('menu.toggleSidebar'),
    toggleOutline: t('menu.toggleOutline'),
    togglePreview: t('menu.togglePreview'),
    toggleTheme: t('menu.toggleTheme'),
    toggleFocus: t('menu.toggleFocus'),
    settings: t('menu.settings'),
    help: t('menu.help'),
    about: t('menu.about'),
    markdownSyntax: t('menu.markdownSyntax'),
  }
  
  try {
    await invoke('update_menu', { labels })
  } catch (e) {
    console.error('Failed to update menu language:', e)
    await message(`Failed to update menu language: ${e}`, { kind: 'error' })
  }
}
