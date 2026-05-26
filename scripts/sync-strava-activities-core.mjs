import fs from 'node:fs'
import path from 'node:path'

const IDS_FILE = '_index.json'
const META_FILE = '_meta.json'

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  }
  catch {
    return fallback
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function readIds(activitiesDir) {
  const data = readJson(path.join(activitiesDir, IDS_FILE), [])
  return Array.isArray(data) ? data : []
}

function readMeta(activitiesDir) {
  const data = readJson(path.join(activitiesDir, META_FILE), {})
  return data && typeof data === 'object' ? data : {}
}

function hasDetail(activitiesDir, id) {
  return fs.existsSync(path.join(activitiesDir, `${id}.json`))
}

function saveDetail(activitiesDir, id, data) {
  writeJson(path.join(activitiesDir, `${id}.json`), data)
}

function getLatestActivityTimestamp(activities) {
  return Math.max(
    ...activities.map(activity => Math.floor(new Date(activity.start_date).getTime() / 1000)),
  )
}

async function fetchAllActivities(getStravaActivities) {
  const all = []
  let page = 1
  while (true) {
    const batch = await getStravaActivities({ page, perPage: 100 })
    if (!batch.length)
      break
    all.push(...batch)
    if (batch.length < 100)
      break
    page++
  }
  return all
}

export async function syncActivities({
  activitiesDir,
  getStravaActivities,
  getStravaActivityById,
  logger = console,
}) {
  fs.mkdirSync(activitiesDir, { recursive: true })

  logger.log('🔄 Syncing Strava activities...')
  logger.log('  Full sync: fetching all activities')

  const knownIds = readIds(activitiesDir)
  const knownSet = new Set(knownIds)
  const meta = readMeta(activitiesDir)

  const activities = await fetchAllActivities(async (options) => {
    const batch = await getStravaActivities(options)
    if (batch.length)
      logger.log(`  Page ${options.page}: ${batch.length} activities`)
    return batch
  })

  if (activities.length === 0) {
    logger.log('✅ No activities found')
    return
  }

  const freshIds = activities.map(a => a.id)
  const missingIds = freshIds.filter(id => !hasDetail(activitiesDir, id))

  if (missingIds.length === 0) {
    const latestTimestamp = getLatestActivityTimestamp(activities)
    writeJson(path.join(activitiesDir, META_FILE), { ...meta, lastSync: latestTimestamp })
    logger.log('✅ All activities up to date')
    return
  }

  logger.log(`⬇️  Fetching ${missingIds.length} activity details...`)
  for (const id of missingIds) {
    logger.log(`  ${id}`)
    const detail = await getStravaActivityById(id)
    saveDetail(activitiesDir, id, detail)
  }

  for (const id of freshIds) knownSet.add(id)
  writeJson(path.join(activitiesDir, IDS_FILE), [...knownSet])

  const latestTimestamp = getLatestActivityTimestamp(activities)
  writeJson(path.join(activitiesDir, META_FILE), { ...meta, lastSync: latestTimestamp })

  logger.log(`✅ Synced ${missingIds.length} activities (total: ${knownSet.size})`)
}
