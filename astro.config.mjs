import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const thoughtsCanvasLayoutPath = path.resolve(__dirname, 'src/data/thoughts-canvas-layout.json')

function normalizeView(view) {
  if (
    typeof view !== 'object'
    || view === null
    || !Number.isFinite(view.cx)
    || !Number.isFinite(view.cy)
  ) {
    return null
  }
  return {
    cx: Math.round(view.cx * 100) / 100,
    cy: Math.round(view.cy * 100) / 100,
  }
}

async function readStoredView() {
  try {
    const raw = await fs.readFile(thoughtsCanvasLayoutPath, 'utf8')
    return normalizeView(JSON.parse(raw).view)
  }
  catch {
    return null
  }
}

function thoughtsCanvasLayoutDevPlugin() {
  return {
    name: 'thoughts-canvas-layout-dev',
    configureServer(server) {
      server.middlewares.use('/__thoughts-canvas-layout', async (req, res, next) => {
        if (req.method !== 'POST')
          return next()

        try {
          const chunks = []
          for await (const chunk of req)
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          const body = Buffer.concat(chunks).toString('utf8')

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
              zIndex: Number.isFinite(card.zIndex) ? Math.round(card.zIndex) : 1,
              width: Number.isFinite(card.width) ? Math.round(card.width) : 300,
              height: Number.isFinite(card.height) ? Math.round(card.height) : 480,
            }
            if (typeof card.pin === 'string' && card.pin) {
              cards[slug].pin = card.pin
              cards[slug].pinX = Number.isFinite(card.pinX) ? Math.round(card.pinX) : 8
              cards[slug].pinY = Number.isFinite(card.pinY) ? Math.round(card.pinY) : 8
            }
          }

          const sortedCards = Object.fromEntries(Object.entries(cards).sort(([a], [b]) => a.localeCompare(b)))

          // The authored starting view travels with the layout, so every visitor
          // opens on the same framing. A payload without one keeps the stored view
          // rather than clearing it.
          const view = normalizeView(payload.view) ?? (await readStoredView())

          const layout = { version: 1, ...(view ? { view } : {}), cards: sortedCards }
          await fs.writeFile(thoughtsCanvasLayoutPath, `${JSON.stringify(layout, null, 2)}\n`, 'utf8')

          const layoutModules = server.moduleGraph.getModulesByFile(thoughtsCanvasLayoutPath)
          layoutModules?.forEach(mod => server.moduleGraph.invalidateModule(mod))

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, layout }))
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
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/node_modules\/(?:@mermaid-js\/|mermaid(?:\/|$))/.test(id))
              return 'mermaid'
          },
        },
      },
    },
  },
})
