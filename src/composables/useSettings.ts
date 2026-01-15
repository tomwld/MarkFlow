import { useStorage } from '@vueuse/core'

export const useSettings = () => {
  const vimMode = useStorage('settings.vimMode', false)
  
  return {
    vimMode
  }
}
