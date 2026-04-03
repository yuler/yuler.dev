import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const PORT = 4173
const DIST = process.env.SCREENSHOT_DIST_DIR ?? 'dist'

export const OUT_DIR = 'screenshots'

export const PAGES = [
  { url: '/', slug: 'home' },
  { url: '/posts', slug: 'posts' },
  { url: '/posts/hi', slug: 'posts-hi' },
  { url: '/workouts', slug: 'workouts' },
  { url: '/workouts/17883105335', slug: 'workouts-17883105335' },
]

export const VIEWPORTS = [
  { name: 'iphone', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'pc', width: 1280, height: 800 },
]

/** Generate output path for a screenshot */
export function outputPath(slug, vpName) {
  return `${OUT_DIR}/${slug}.${vpName}.png`
}

const __filename = fileURLToPath(import.meta.url)

function isMainModule() {
  const entry = process.argv[1]
  if (!entry)
    return false
  return resolve(entry) === __filename
}

// Helper: ensure the site is built
function ensureBuilt() {
  const skipBuild = process.env.SCREENSHOT_SKIP_BUILD === 'true'

  if (existsSync(DIST)) {
    console.log(`✓ ${DIST}/ exists, skipping build`)
    return
  }

  if (skipBuild) {
    throw new Error(
      `Screenshot preview cannot start: ${DIST}/ is missing and SCREENSHOT_SKIP_BUILD=true`,
    )
  }

  console.log(`Building site...`)
  execSync('pnpm run build', { stdio: 'inherit' })
}

/**
 * Start `pnpm run preview` (Astro preview) and wait until HTTP responds.
 * Uses the same static hosting behavior as local preview, not a custom file server.
 */
function startPreviewServer(port) {
  return new Promise((resolve, reject) => {
    const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    const child = spawn(
      pnpm,
      ['run', 'preview', '--host', '127.0.0.1', '--port', String(port)],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })

    let settled = false

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })

    child.on('exit', (code, signal) => {
      if (settled)
        return
      settled = true
      reject(
        new Error(
          `pnpm run preview exited before ready (code=${code} signal=${signal})\n${stderr}`,
        ),
      )
    })

    const previewUrl = `http://127.0.0.1:${port}/`
    const timeoutMs = 90_000

    ;(async () => {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (settled)
          return
        try {
          const res = await fetch(previewUrl, {
            redirect: 'manual',
            signal: AbortSignal.timeout(3000),
          })
          if (res.status >= 200 && res.status < 500) {
            settled = true
            child.removeAllListeners('exit')
            console.log(`✓ Astro preview at http://127.0.0.1:${port}`)
            resolve({
              close: () => {
                return new Promise((resolveClose) => {
                  if (child.exitCode !== null || child.signalCode !== null) {
                    console.log('✓ Preview server already stopped')
                    resolveClose()
                    return
                  }
                  child.once('exit', () => {
                    console.log('✓ Preview server stopped')
                    resolveClose()
                  })
                  child.kill('SIGTERM')
                  setTimeout(() => {
                    if (child.exitCode === null && child.signalCode === null)
                      child.kill('SIGKILL')
                  }, 5000)
                })
              },
            })
            return
          }
        }
        catch {
          // ECONNREFUSED / timeout — keep polling
        }
        await new Promise(r => setTimeout(r, 250))
      }
      if (!settled) {
        settled = true
        child.removeAllListeners('exit')
        child.kill('SIGTERM')
        reject(new Error(`Preview did not respond at ${previewUrl} within ${timeoutMs}ms\n${stderr}`))
      }
    })().catch((err) => {
      if (!settled) {
        settled = true
        child.removeAllListeners('exit')
        child.kill('SIGTERM')
        reject(err)
      }
    })
  })
}

// Main: capture all screenshots
async function captureScreenshots(baseUrl) {
  console.log('Launching browser...')
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()

    for (const pageInfo of PAGES) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const url = `${baseUrl}${pageInfo.url}`
        console.log(`Capturing ${pageInfo.slug} @ ${viewport.name} (${viewport.width}×${viewport.height})`)

        // Use bounded waits to avoid indefinite hangs on long-lived connections.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

        // Workout detail pages set `data-route-ready` on `.activity-map-container` after Leaflet inits.
        // (MapRoute must run even when the bundled module loads after `DOMContentLoaded` — see MapRoute.astro.)
        const mapCount = await page.locator('.activity-map-container').count()
        if (mapCount > 0) {
          await page
            .locator('.activity-map-container[data-route-ready="true"]')
            .first()
            .waitFor({ state: 'attached', timeout: 30_000 })
            .catch(() => console.warn(`[screenshot] Map readiness timeout for ${url}`))
        }

        const outputFile = outputPath(pageInfo.slug, viewport.name)
        await page.screenshot({ path: outputFile, fullPage: true })
      }
    }

    console.log(`✓ Captured ${PAGES.length * VIEWPORTS.length} screenshots`)
  }
  finally {
    await browser.close()
  }
}

if (isMainModule()) {
  (async () => {
    let serverHandle = null

    try {
      if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true })
        console.log(`✓ Created ${OUT_DIR}/ directory`)
      }

      ensureBuilt()

      serverHandle = await startPreviewServer(PORT)

      await captureScreenshots(`http://127.0.0.1:${PORT}`)

      await serverHandle.close()
      process.exit(0)
    }
    catch (error) {
      console.error('Error:', error.message)
      if (serverHandle) {
        await serverHandle.close()
      }
      process.exit(1)
    }
  })()
}
