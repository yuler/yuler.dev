import antfu from '@antfu/eslint-config'

export default antfu({
  astro: true,
  formatters: {
    /** Markdown: dprint via eslint-plugin-format (`format/dprint`, language `markdown`) */
    markdown: 'dprint',
  },
})
