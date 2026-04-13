import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  getStravaActivities,
  getStravaActivityById,
} from '../src/utils/strava.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ACTIVITIES_DIR = path.join(__dirname, '..', 'data', 'strava', 'activities')
const IDS_FILE = path.join(ACTIVITIES_DIR, '_index.json')
const META_FILE = path.join(ACTIVITIES_DIR, '_meta.json')

fs.mkdirSync(ACTIVITIES_DIR, { recursive: true })

function readIds() {
  try {
    const data = JSON.parse(fs.readFileSync(IDS_FILE, 'utf-8'))
    return Array.isArray(data) ? data : []
  }
  catch {
    return []
  }
}

function readMeta() {
  try {
    const data = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'))
    return data || {}
  }
  catch {
    return {}
  }
}

function writeMeta(meta) {
  fs.writeFileSync(META_FILE, `${JSON.stringify(meta, null, 2)}\n`)
}

function writeIds(ids) {
  fs.writeFileSync(IDS_FILE, `${JSON.stringify(ids, null, 2)}\n`)
}

function hasDetail(id) {
  return fs.existsSync(path.join(ACTIVITIES_DIR, `${id}.json`))
}

function saveDetail(id, data) {
  fs.writeFileSync(
    path.join(ACTIVITIES_DIR, `${id}.json`),
    `${JSON.stringify(data, null, 2)}\n`,
  )
}

function getLatestActivityTimestamp(activities) {
  return Math.max(
    ...activities.map(activity => Math.floor(new Date(activity.start_date).getTime() / 1000)),
  )
}

async function fetchAllActivities(after = null) {
  const all = []
  let page = 1
  while (true) {
    const options = { page, perPage: 100 }
    if (after) {
      options.after = after
    }
    const batch = await getStravaActivities(options)
    if (!batch.length)
      break
    all.push(...batch)
    console.log(`  Page ${page}: ${batch.length} activities`)
    if (batch.length < 100)
      break
    page++
  }
  return all
}

async function syncActivities() {
  console.log('🔄 Syncing Strava activities...')

  const knownIds = readIds()
  const knownSet = new Set(knownIds)
  const meta = readMeta()

  // Use last sync timestamp for incremental fetch
  const lastSync = meta.lastSync || null
  const isFullSync = !lastSync

  if (isFullSync) {
    console.log('  Full sync: fetching all activities (no previous sync)')
  }
  else {
    const syncDate = new Date(lastSync * 1000).toISOString()
    console.log(`  Incremental sync: fetching activities since ${syncDate}`)
  }

  // Fetch activities (incremental if we have a lastSync timestamp)
  const activities = await fetchAllActivities(lastSync)

  if (activities.length === 0) {
    console.log('✅ No new activities found')
    return
  }

  const freshIds = activities.map(a => a.id)
  const missingIds = freshIds.filter(id => !hasDetail(id))

  if (missingIds.length === 0) {
    const latestTimestamp = getLatestActivityTimestamp(activities)
    writeMeta({ ...meta, lastSync: latestTimestamp })
    console.log('✅ All activities up to date')
    return
  }

  console.log(`⬇️  Fetching ${missingIds.length} activity details...`)
  for (const id of missingIds) {
    console.log(`  ${id}`)
    const detail = await getStravaActivityById(id)
    saveDetail(id, detail)
  }

  for (const id of freshIds) knownSet.add(id)
  writeIds([...knownSet])

  // Update lastSync timestamp based on the latest activity fetched
  const latestTimestamp = getLatestActivityTimestamp(activities)
  writeMeta({ ...meta, lastSync: latestTimestamp })

  console.log(`✅ Synced ${missingIds.length} activities (total: ${knownSet.size})`)
}

syncActivities().catch((err) => {
  console.error('❌ Sync failed:', err.message)
  process.exit(1)
})
