/**
 * Manual Strava ops. Usage: pnpm strava <command>
 *
 * Hourly latest sync stays on `pnpm sync:strava:activities` (GitHub Actions).
 * This CLI is for local checks: missing delayed uploads, status, repair, fetch.
 */

import process from 'node:process'
import {
  DEFAULT_ACTIVITIES_DIR,
  fetchAllActivities,
  findMissingActivityIds,
  hasDetail,
  listLocalDetailIds,
  readIds,
  readMeta,
  repairActivityIndex,
  saveDetail,
} from '../src/lib/strava-core.ts'
import { getStravaActivities, getStravaActivityById } from '../src/utils/strava.ts'

const dir = DEFAULT_ACTIVITIES_DIR

function printHelp() {
  console.log(`Usage: pnpm strava <command>

Commands:
  status         Local index vs detail files (no API)
  missing        List remote activities missing local detail JSON (full listing)
  repair-index   Rebuild _index.json from local *.json details
  fetch <id>     Download one activity detail by id

Latest incremental sync (GitHub Actions):
  pnpm sync:strava:activities
`)
}

function runStatus() {
  const indexIds = readIds(dir)
  const detailIds = listLocalDetailIds(dir)
  const detailSet = new Set(detailIds)
  const indexSet = new Set(indexIds)
  const meta = readMeta(dir)
  const lastSync = meta.lastSync
    ? `${new Date(meta.lastSync * 1000).toISOString()} (${meta.lastSync})`
    : '(none)'

  const indexMissingDetails = indexIds.filter(id => !detailSet.has(id))
  const detailsMissingFromIndex = detailIds.filter(id => !indexSet.has(id))

  console.log(`Dir: ${dir}`)
  console.log(`Index: ${indexIds.length}`)
  console.log(`Details: ${detailIds.length}`)
  console.log(`lastSync: ${lastSync}`)
  console.log(`Index entries without detail: ${indexMissingDetails.length || 0}`)
  if (indexMissingDetails.length)
    console.log(`  ${indexMissingDetails.join(', ')}`)
  console.log(`Details missing from index: ${detailsMissingFromIndex.length || 0}`)
  if (detailsMissingFromIndex.length)
    console.log(`  ${detailsMissingFromIndex.join(', ')}`)
}

async function runMissing() {
  console.log('🔄 Listing all Strava activities (no after cursor)...')
  const activities = await fetchAllActivities(getStravaActivities, { logger: console })
  const missingIds = findMissingActivityIds(dir, activities.map(a => a.id))
  const byId = new Map(activities.map(a => [a.id, a]))

  console.log(`Remote: ${activities.length}  Local details: ${listLocalDetailIds(dir).length}  Missing: ${missingIds.length}`)
  if (missingIds.length === 0)
    return

  for (const id of missingIds) {
    const a = byId.get(id)
    console.log(`  ${id}  ${a?.start_date ?? '?'}  ${a?.name ?? ''}`)
  }
}

async function runFetch(rawId: string | undefined) {
  const id = Number(rawId)
  if (!Number.isFinite(id) || id <= 0) {
    console.error('Usage: pnpm strava fetch <id>')
    process.exit(1)
  }
  if (hasDetail(dir, id)) {
    console.log(`Already have ${id}.json`)
    return
  }
  console.log(`⬇️  Fetching ${id}...`)
  const detail = await getStravaActivityById(id)
  saveDetail(dir, id, detail)
  console.log(`✅ Saved ${id}.json`)
}

async function main() {
  const [command, ...args] = process.argv.slice(2)

  switch (command) {
    case 'status':
      runStatus()
      return
    case 'missing':
      await runMissing()
      return
    case 'repair-index': {
      const ids = repairActivityIndex(dir)
      console.log(`✅ Rebuilt index (${ids.length} ids)`)
      return
    }
    case 'fetch':
      await runFetch(args[0])
      return
    case 'help':
    case undefined:
      printHelp()
      return
    default:
      console.error(`Unknown command: ${command}\n`)
      printHelp()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
