import { execSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { OUT_DIR, outputPath, PAGES, VIEWPORTS } from '@scripts/screenshot.mjs'
import { expect, it } from 'vitest'

it('outputPath returns correct pattern for home + iphone', () => {
  const result = outputPath('home', 'iphone')
  expect(result).toBe(`${OUT_DIR}/home.iphone.png`)
})

it('outputPath returns correct pattern for workouts-17751421152 + pc', () => {
  const result = outputPath('workouts-17751421152', 'pc')
  expect(result).toBe(`${OUT_DIR}/workouts-17751421152.pc.png`)
})

it('outputPath returns correct pattern for posts-2025-explore-rails-with-vue + ipad', () => {
  const result = outputPath('posts-2025-explore-rails-with-vue', 'ipad')
  expect(result).toBe(`${OUT_DIR}/posts-2025-explore-rails-with-vue.ipad.png`)
})

it('pAGES has exactly 5 entries', () => {
  expect(PAGES.length).toBe(5)
})

it('vIEWPORTS has exactly 3 entries', () => {
  expect(VIEWPORTS.length).toBe(3)
})

it('all PAGES × VIEWPORTS combinations produce unique filenames', () => {
  const filenames = new Set()

  for (const page of PAGES) {
    for (const viewport of VIEWPORTS) {
      const filename = outputPath(page.slug, viewport.name)

      expect(filenames.has(filename)).toBe(false)

      filenames.add(filename)
    }
  }

  expect(filenames.size).toBe(15)
})

it('outputPath matches OUT_DIR/{slug}.{vp}.png for many slug/viewport pairs', () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-'
  for (let i = 0; i < 100; i++) {
    const slug = Array.from({ length: 1 + (i % 24) }, (_, j) => chars[(i + j * 5) % chars.length]).join('')
    const vp = Array.from({ length: 1 + ((i * 3) % 12) }, (_, j) => chars[(i * 7 + j * 3) % chars.length]).join('')
    expect(outputPath(slug, vp)).toBe(`${OUT_DIR}/${slug}.${vp}.png`)
  }
})

// Needs a prior successful gen:screenshots run
it('every configured page and viewport has a screenshot file', () => {
  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      expect(existsSync(outputPath(page.slug, vp.name))).toBe(true)
    }
  }
})

it('second gen:screenshots run exits 0 and screenshot files remain or are refreshed', async () => {
  const initialMtimes = {}
  for (const page of PAGES) {
    for (const viewport of VIEWPORTS) {
      const filePath = outputPath(page.slug, viewport.name)
      if (existsSync(filePath)) {
        initialMtimes[filePath] = statSync(filePath).mtimeMs
      }
    }
  }

  await new Promise(resolve => setTimeout(resolve, 100))

  try {
    execSync('pnpm run gen:screenshots', { stdio: 'pipe' })
  }
  catch (error) {
    expect.fail(`Script failed on second run: ${error.message}`)
  }

  for (const page of PAGES) {
    for (const viewport of VIEWPORTS) {
      const filePath = outputPath(page.slug, viewport.name)
      expect(existsSync(filePath)).toBe(true)

      const newMtime = statSync(filePath).mtimeMs
      if (initialMtimes[filePath]) {
        expect(newMtime).toBeGreaterThanOrEqual(initialMtimes[filePath])
      }
    }
  }
})

it('gen:screenshots exits 1 when dist/ is temporarily unavailable', () => {
  const missingDistDir = `dist-missing-test-${Date.now()}`
  let exitCode = 0

  try {
    const env = {
      ...process.env,
      SCREENSHOT_DIST_DIR: missingDistDir,
      SCREENSHOT_SKIP_BUILD: 'true',
    }

    execSync('pnpm run gen:screenshots', { stdio: 'pipe', env })
    exitCode = 0
  }
  catch (error) {
    exitCode = error.status || 1
  }

  expect(exitCode).toBe(1)
})
