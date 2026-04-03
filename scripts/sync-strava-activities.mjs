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

async function fetchAllActivities() {
  const all = []
  let page = 1
  while (true) {
    const batch = await getStravaActivities({ page, perPage: 100 })
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

  // Always paginate: incremental runs used to call getStravaActivities() once and
  // missed IDs beyond the first page when total activities > per_page.
  const activities = await fetchAllActivities()

  const freshIds = activities.map(a => a.id)
  const missingIds = freshIds.filter(id => !hasDetail(id))

  if (missingIds.length === 0) {
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

  console.log(`✅ Synced ${missingIds.length} activities (total: ${knownSet.size})`)
}

syncActivities().catch((err) => {
  console.error('❌ Sync failed:', err.message)
  process.exit(1)
})
