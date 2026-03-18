#!/usr/bin/env node
/**
 * Export a single post as PDF by building the site, serving it, and printing with Playwright.
 * Usage: pnpm run export:pdf [slug]
 * Example: pnpm run export:pdf 2026/vibe-coding
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync, readdirSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const postsRoot = join(root, 'src', 'content', 'posts')
const port = 4173
const baseUrl = `http://127.0.0.1:${port}`

function listPostSlugs(dir = postsRoot, prefix = '') {
  const entries = readdirSync(dir, { withFileTypes: true })
  const slugs = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      slugs.push(...listPostSlugs(fullPath, rel))
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      const withoutExt = rel.replace(/\.(md|mdx)$/, '')
      let dateRaw = null
      try {
        const content = readFileSync(fullPath, 'utf8')
        const match = content.match(/^date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/m)
        if (match) {
          dateRaw = match[1]
        }
      } catch (e) {
        console.warn(`[Warning] Failed to read date from ${fullPath}: ${e.message}`);
      }
      const date = dateRaw ? new Date(dateRaw) : null
      slugs.push({ slug: withoutExt, date, dateRaw })
    }
  }
  return slugs.sort((a, b) => {
    if (a.date && b.date) {
      return b.date.getTime() - a.date.getTime()
    }
    if (a.date && !b.date) return -1
    if (!a.date && b.date) return 1
    return a.slug.localeCompare(b.slug)
  })
}

async function chooseSlugTui() {
  const posts = listPostSlugs()
  if (!posts.length) {
    console.error('No posts found under `content/posts`.')
    process.exit(1)
  }

  console.log('Select a post to export from `content/posts` (sorted by frontmatter `date`):\n')
  posts.forEach((p, i) => {
    const idx = String(i + 1).padStart(2, ' ')
    const dateLabel = p.dateRaw ?? 'no-date'
    console.log(`${idx}. [${dateLabel}] ${p.slug}`)
  })
  console.log('\nEnter number (default 1): ')

  const rl = await import('node:readline')
  const iface = rl.createInterface({ input: process.stdin, output: process.stdout })

  const answer = await new Promise((resolve) => {
    iface.question('> ', (ans) => resolve(ans.trim()))
  })
  iface.close()

  let index = parseInt(answer || '1', 10)
  if (Number.isNaN(index) || index < 1 || index > posts.length) {
    console.log(`Invalid selection, defaulting to 1.`)
    index = 1
  }
  return posts[index - 1].slug
}

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

async function exportPdf(postUrl, outPath) {
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
  let slug = process.argv[2]
  if (!slug) {
    slug = await chooseSlugTui()
  } else {
    console.log(`Using slug from CLI: ${slug}`)
  }

  const postUrl = `${baseUrl}/posts/${slug}`
  const safeName = slug.replace(/[^\w\-]+/g, '-')
  const pdfDir = join(root, 'pdfs')
  if (!existsSync(pdfDir)) {
    mkdirSync(pdfDir, { recursive: true })
  }
  const outPath = join(pdfDir, `${safeName}.pdf`)

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
      await exportPdf(postUrl, outPath)
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
