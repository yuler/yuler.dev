import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://astro.build/config
export default defineConfig({
  site: 'https://yuler.dev',

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },

  integrations: [
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        theme: 'github-light',
        excludeLangs: ['mermaid'],
      },
      remarkRehype: { footnoteLabel: 'Footnotes' },
      gfm: true,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Create vendor chunks for large dependencies
            if (id.includes('node_modules')) {
              // Mermaid and its dependencies
              if (id.includes('mermaid')
                || id.includes('cytoscape')
                || id.includes('dagre')
                || id.includes('khroma')
                || id.includes('dayjs')
                || id.includes('uuid')
                || id.includes('lodash')
                || id.includes('d3-')) {
                return 'vendor-mermaid'
              }
              // Other vendors can be grouped here if needed
            }
          },
        },
      },
    },
  },
})
