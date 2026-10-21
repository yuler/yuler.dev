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
import { chromium } from 'playwright'
import { activitiesDir, authFile, isLoginUrl, root, tmpDir, TRAINING_URL } from './strava-common.mjs'

function parseArgs(argv) {
  return {
    headful: argv.includes('--headful'),
    pause: 1.5,
    maxPages: 999,
  }
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

    const currentFirstId = ids[0]
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
    try {
      await page.waitForFunction((prevId) => {
        const firstLink = document.querySelector('a[href^="/activities/"]')
        const match = firstLink?.getAttribute('href')?.match(/\/activities\/(\d+)/)
        return match ? match[1] !== prevId : false
      }, currentFirstId, { timeout: 10_000 })
    }
    catch {
      await page.waitForTimeout(1000)
    }
    await assertLoggedIn(page)
  }

  return missing
}

async function downloadGpx(page, id) {
  const downloadUrl = `https://www.strava.com/activities/${id}/export_gpx`
  const savePath = path.join(tmpDir, `${id}.gpx`)

  let cleanup = () => {}
  const downloadPromise = new Promise((resolve, reject) => {
    const onDownload = (download) => {
      cleanup()
      resolve(download)
    }
    const onFramenavigated = (frame) => {
      if (frame === page.mainFrame() && isLoginUrl(frame.url())) {
        cleanup()
        reject(new Error('Strava asked for login again. Run pnpm strava:login, then retry pnpm strava:export.'))
      }
    }
    const timer = setTimeout(() => {
      cleanup()
      if (isLoginUrl(page.url())) {
        reject(new Error('Strava asked for login again. Run pnpm strava:login, then retry pnpm strava:export.'))
      }
      else {
        reject(new Error(`Timeout waiting for download of activity ${id}`))
      }
    }, 30_000)

    cleanup = () => {
      clearTimeout(timer)
      page.off('download', onDownload)
      page.off('framenavigated', onFramenavigated)
    }

    page.on('download', onDownload)
    page.on('framenavigated', onFramenavigated)
  })

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
    const child = spawn('pnpm', ['import:strava:gpx'], { cwd: root, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0)
        resolve()
      else
        reject(new Error(`pnpm import:strava:gpx exited with ${code}`))
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
