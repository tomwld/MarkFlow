import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
  ],
  safelist: [
    'i-carbon-face-satisfied',
    'i-carbon-user',
    'i-carbon-tree',
    'i-carbon-noodle-bowl',
    'i-carbon-idea',
    'i-carbon-favorite'
  ]
})
