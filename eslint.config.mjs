import antfu from '@antfu/eslint-config'

export default antfu({
  astro: true,
  ignores: ['src/content/slides/**'],
  formatters: {
    /** Markdown: dprint via eslint-plugin-format (`format/dprint`, language `markdown`) */
    markdown: 'dprint',
  },
})
