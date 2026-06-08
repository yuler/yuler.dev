import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const thoughtsCanvasLayoutPath = path.resolve(__dirname, 'src/data/thoughts-canvas-layout.json')

function thoughtsCanvasLayoutDevPlugin() {
  return {
    name: 'thoughts-canvas-layout-dev',
    configureServer(server) {
      server.middlewares.use('/__thoughts-canvas-layout', async (req, res, next) => {
        if (req.method !== 'POST')
          return next()

        try {
          let body = ''
          for await (const chunk of req)
            body += chunk

          const payload = JSON.parse(body)
          if (payload?.version !== 1 || typeof payload.cards !== 'object' || payload.cards === null)
            throw new Error('Invalid thoughts layout payload')

          const cards = {}
          for (const [slug, card] of Object.entries(payload.cards)) {
            if (
              typeof slug !== 'string'
              || typeof card !== 'object'
              || card === null
              || !Number.isFinite(card.x)
              || !Number.isFinite(card.y)
              || !Number.isFinite(card.rotateDeg)
            ) {
              throw new Error(`Invalid card layout for ${slug}`)
            }
            cards[slug] = {
              x: Math.round(card.x * 100) / 100,
              y: Math.round(card.y * 100) / 100,
              rotateDeg: Math.round(card.rotateDeg * 100) / 100,
            }
          }

          const sortedCards = Object.fromEntries(Object.entries(cards).sort(([a], [b]) => a.localeCompare(b)))
          await fs.writeFile(
            thoughtsCanvasLayoutPath,
            `${JSON.stringify({ version: 1, cards: sortedCards }, null, 2)}\n`,
            'utf8',
          )

          const layoutModules = server.moduleGraph.getModulesByFile(thoughtsCanvasLayoutPath)
          layoutModules?.forEach(mod => server.moduleGraph.invalidateModule(mod))

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, layout: { version: 1, cards: sortedCards } }))
        }
        catch (err) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }))
        }
      })
    },
  }
}

// https://astro.build/config
export default defineConfig({
  site: 'https://yuler.dev',

  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-light',
      excludeLangs: ['mermaid'],
    },
  },

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
    plugins: [tailwindcss(), thoughtsCanvasLayoutDevPlugin()],
    server: {
      watch: {
        ignored: [thoughtsCanvasLayoutPath],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
})
