/**
 * Download new Strava activities with the saved browser session. No Strava API.
 *
 * Usage: pnpm strava:export
 *
 * Requires tmp/strava/auth-state.json from `pnpm strava:login`.
 * GPX files land in tmp/strava/{id}.gpx. Page stats append to
 * tmp/strava/page-stats.jsonl. New files are then imported.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmpDir = path.join(root, 'tmp', 'strava')
const authFile = path.join(tmpDir, 'auth-state.json')
const activitiesDir = path.join(root, 'data', 'strava', 'activities')
const TRAINING_URL = 'https://www.strava.com/athlete/training'

function parseArgs(argv) {
  const args = { headful: false, pause: 1.5, maxPages: 999 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--headful')
      args.headful = true
    else if (arg === '--pause')
      args.pause = Number(argv[++i])
    else if (arg === '--max-pages')
      args.maxPages = Number(argv[++i])
    else
      throw new Error(`Unknown argument: ${arg}`)
  }
  if (!Number.isFinite(args.pause) || args.pause < 0)
    throw new Error('--pause must be a number of seconds')
  if (!Number.isInteger(args.maxPages) || args.maxPages < 1)
    throw new Error('--max-pages must be a positive integer')
  return args
}

function isLoginUrl(url) {
  return /https:\/\/www\.strava\.com\/(?:login|signup|oauth\/authorize)/.test(url)
}

function readKnownIds() {
  const ids = new Set()
  const indexPath = path.join(activitiesDir, '_index.json')
  if (fs.existsSync(indexPath)) {
    for (const id of JSON.parse(fs.readFileSync(indexPath, 'utf8')))
      ids.add(String(id))
  }
  if (fs.existsSync(activitiesDir)) {
    for (const name of fs.readdirSync(activitiesDir)) {
      const match = name.match(/^(\d+)\.json$/)
      if (match)
        ids.add(match[1])
    }
  }
  return ids
}

function activityIdsOnPage(html) {
  const ids = []
  const seen = new Set()
  for (const match of html.matchAll(/\/activities\/(\d+)/g)) {
    const id = match[1]
    if (seen.has(id))
      continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

async function assertLoggedIn(page) {
  if (!isLoginUrl(page.url()))
    return
  throw new Error('Strava asked for login again. Run pnpm strava:login, then retry pnpm strava:export.')
}

async function scrapeMissingIds(page, knownIds, maxPages) {
  await page.goto(TRAINING_URL, { waitUntil: 'networkidle', timeout: 60_000 })
  await assertLoggedIn(page)

  const missing = []
  const seen = new Set()

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    console.log(`Scanning page ${pageNum}`)
    const ids = activityIdsOnPage(await page.content())
    if (ids.length === 0) {
      console.log('No activity links on this page.')
      break
    }

    let reachedKnown = false
    for (const id of ids) {
      if (seen.has(id))
        continue
      seen.add(id)
      if (knownIds.has(id)) {
        reachedKnown = true
        break
      }
      missing.push(id)
    }

    console.log(`New activities so far: ${missing.length}`)
    if (reachedKnown) {
      console.log('Reached an activity already stored locally. Stopping.')
      break
    }

    const next = page.locator('.next_page')
    if (await next.count() === 0) {
      console.log('No next page.')
      break
    }
    const classes = (await next.getAttribute('class')) ?? ''
    if (classes.includes('disabled')) {
      console.log('Last page.')
      break
    }
    await next.click()
    await page.waitForTimeout(1500)
    await assertLoggedIn(page)
  }

  return missing
}

async function downloadGpx(page, id) {
  const downloadUrl = `https://www.strava.com/activities/${id}/export_gpx`
  const savePath = path.join(tmpDir, `${id}.gpx`)
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await page.evaluate((url) => {
    window.location.href = url
  }, downloadUrl)
  const download = await downloadPromise
  await download.saveAs(savePath)
  const body = fs.readFileSync(savePath)
  const head = body.subarray(0, 400).toString('utf8')
  if (!head.includes('<gpx') && !head.includes('<GPX')) {
    fs.rmSync(savePath, { force: true })
    if (head.includes('<html') || head.includes('login'))
      throw new Error('Strava asked for login again. Run pnpm strava:login, then retry pnpm strava:export.')
    throw new Error(`Download for ${id} was not a GPX file.`)
  }
  return savePath
}

async function readPageStats(page, id) {
  await page.goto(`https://www.strava.com/activities/${id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await assertLoggedIn(page)
  return page.evaluate((activityId) => {
    const attrs = window.pageView?._activity?.attributes
    if (!attrs)
      return null
    const title = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()
    const stats = {
      id: activityId,
      name: title || attrs.name,
      type: attrs.type,
      distance: attrs.distance,
      moving_time: attrs.moving_time,
      elev_gain: attrs.elev_gain,
    }
    if (typeof attrs.startDateLocal === 'number')
      stats.startDateLocal = attrs.startDateLocal
    return stats
  }, Number(id))
}

function appendStats(stats) {
  if (!stats)
    return
  fs.appendFileSync(path.join(tmpDir, 'page-stats.jsonl'), `${JSON.stringify(stats)}\n`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function runImport() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/import-strava-gpx.mjs'], { cwd: root, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0)
        resolve()
      else
        reject(new Error(`import-strava-gpx.mjs exited with ${code}`))
    })
  })
}

async function exportActivities({ headful, pause, maxPages }) {
  if (!fs.existsSync(authFile))
    throw new Error('No saved session. Run pnpm strava:login first.')

  fs.mkdirSync(tmpDir, { recursive: true })
  const knownIds = readKnownIds()
  const browser = await chromium.launch({ headless: !headful })
  const context = await browser.newContext({
    storageState: authFile,
    acceptDownloads: true,
  })
  const page = await context.newPage()

  let missing
  try {
    missing = await scrapeMissingIds(page, knownIds, maxPages)
  }
  catch (error) {
    await browser.close()
    throw error
  }

  if (missing.length === 0) {
    await context.storageState({ path: authFile })
    await browser.close()
    console.log('No new activities.')
    return
  }

  console.log(`Downloading ${missing.length} GPX files`)
  const saved = []
  let failure = null
  try {
    for (const [index, id] of missing.entries()) {
      if (fs.existsSync(path.join(tmpDir, `${id}.gpx`))) {
        console.log(`[${index + 1}/${missing.length}] ${id} already in tmp/strava`)
      }
      else {
        console.log(`[${index + 1}/${missing.length}] downloading ${id}`)
        const savePath = await downloadGpx(page, id)
        console.log(`Saved ${savePath}`)
      }
      try {
        appendStats(await readPageStats(page, id))
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('pnpm strava:login'))
          throw error
        console.log(`Page stats skipped for ${id}: ${message}`)
      }
      saved.push(id)
      if (index < missing.length - 1)
        await sleep(pause * 1000)
    }
    await context.storageState({ path: authFile })
  }
  catch (error) {
    failure = error
  }
  finally {
    await browser.close()
  }

  if (saved.length > 0)
    await runImport()
  if (failure)
    throw failure
}

const args = parseArgs(process.argv.slice(2))
exportActivities(args).catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
