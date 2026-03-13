#!/usr/bin/env node
/**
 * Export a single post as PDF by building the site, serving it, and printing with Playwright.
 * Usage: pnpm run export:pdf [slug]
 * Example: pnpm run export:pdf 2026/vibe-coding
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')

const slug = process.argv[2] || '2026/vibe-coding'
const port = 4173
const baseUrl = `http://127.0.0.1:${port}`
const postUrl = `${baseUrl}/posts/${slug}`
const outPath = join(root, `vibe-coding.pdf`)

async function build() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['run', 'build'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build exited ${code}`))))
  })
}

function serveDist() {
  return createServer((req, res) => {
    const urlPath = (req.url?.split('?')[0] || '/').replace(/^\//, '') || 'index.html'
    let path = join(distDir, urlPath)
    if (!path.endsWith('.html')) {
      if (existsSync(path) && statSync(path).isDirectory()) {
        path = join(path, 'index.html')
      } else if (!existsSync(path)) {
        path = join(path, 'index.html')
      }
    }
    if (!existsSync(path)) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const stream = createReadStream(path)
    const ext = path.slice(path.lastIndexOf('.'))
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' }
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
    stream.pipe(res)
  })
}

async function exportPdf() {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(postUrl, { waitUntil: 'networkidle' })
  // Force all lazy-loaded images to load: scroll to bottom then wait for images
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 300))
    const imgs = Array.from(document.images)
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise((resolve) => {
          img.onload = img.onerror = resolve
        })
      })
    )
  })

  // Keep only article content, width 100%
  await page.evaluate(() => {
    const article = document.querySelector('article')
    if (!article) return
    const clone = article.cloneNode(true)
    const wrap = document.createElement('div')
    wrap.style.cssText = 'width:100%;max-width:100%;margin:0;padding:20px;box-sizing:border-box;'
    clone.style.width = '100%'
    clone.style.maxWidth = '100%'
    wrap.appendChild(clone)
    document.body.innerHTML = ''
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.width = '100%'
    document.body.appendChild(wrap)
  })

  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  })
  await browser.close()
}

async function main() {
  if (!existsSync(distDir)) {
    console.log('Building site...')
    await build()
  } else {
    console.log('Using existing dist. Run "pnpm run build" first if you changed the post.')
  }

  const server = serveDist()
  server.listen(port, '127.0.0.1', async () => {
    try {
      console.log(`Serving at ${baseUrl}, exporting ${postUrl} to PDF...`)
      await exportPdf()
      console.log(`PDF saved: ${outPath}`)
    } finally {
      server.close()
    }
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
