/**
 * Local Strava activity store + sync operations.
 *
 * Hourly GH sync (`syncActivities`) uses `lastSync` as Strava's `after` cursor
 * to pull latest activities. Late uploads with older start dates will not show
 * up there — use `fetchAllActivities` / `pnpm strava missing` to find those.
 */

import type { StravaActivity, StravaActivityDetail } from '../utils/strava.ts'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getStravaActivities as defaultGetStravaActivities,
  getStravaActivityById as defaultGetStravaActivityById,
} from '../utils/strava.ts'

const IDS_FILE = '_index.json'
const META_FILE = '_meta.json'
const DETAIL_FILE_RE = /^(\d+)\.json$/

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const DEFAULT_ACTIVITIES_DIR = path.join(REPO_ROOT, 'data', 'strava', 'activities')

export interface StravaMeta {
  lastSync?: number
  [key: string]: unknown
}

export interface ActivityListItem {
  id: number
  start_date: string
  name?: string
}

export interface Logger {
  log: (...args: unknown[]) => void
}

export type GetStravaActivities = (options: {
  page?: number
  perPage?: number
  after?: number
}) => Promise<ActivityListItem[]>

export type GetStravaActivityById = (id: number) => Promise<StravaActivityDetail | StravaActivity>

export interface SyncResult {
  missingIds: number[]
  fetchedIds: number[]
  total: number
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  }
  catch {
    return fallback
  }
}

export function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

export function readIds(activitiesDir: string): number[] {
  const data = readJson<unknown>(path.join(activitiesDir, IDS_FILE), [])
  return Array.isArray(data) ? data.filter((id): id is number => typeof id === 'number') : []
}

export function writeIds(activitiesDir: string, ids: number[]): void {
  writeJson(path.join(activitiesDir, IDS_FILE), ids)
}

export function readMeta(activitiesDir: string): StravaMeta {
  const data = readJson<unknown>(path.join(activitiesDir, META_FILE), {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data as StravaMeta : {}
}

export function writeMeta(activitiesDir: string, meta: StravaMeta): void {
  writeJson(path.join(activitiesDir, META_FILE), meta)
}

export function hasDetail(activitiesDir: string, id: number): boolean {
  return fs.existsSync(path.join(activitiesDir, `${id}.json`))
}

export function saveDetail(activitiesDir: string, id: number, data: unknown): void {
  writeJson(path.join(activitiesDir, `${id}.json`), data)
}

export function listLocalDetailIds(activitiesDir: string): number[] {
  if (!fs.existsSync(activitiesDir))
    return []
  return fs.readdirSync(activitiesDir)
    .map(name => DETAIL_FILE_RE.exec(name)?.[1])
    .filter((id): id is string => id != null)
    .map(id => Number.parseInt(id, 10))
    .sort((a, b) => a - b)
}

export function findMissingActivityIds(activitiesDir: string, remoteIds: number[]): number[] {
  return remoteIds.filter(id => !hasDetail(activitiesDir, id))
}

export function getLatestActivityTimestamp(activities: Array<{ start_date: string }>): number {
  if (activities.length === 0)
    return 0
  return Math.max(
    ...activities.map(activity => Math.floor(new Date(activity.start_date).getTime() / 1000)),
  )
}

export function repairActivityIndex(activitiesDir: string): number[] {
  fs.mkdirSync(activitiesDir, { recursive: true })
  const ids = listLocalDetailIds(activitiesDir)
  writeIds(activitiesDir, ids)
  return ids
}

export async function fetchActivities(
  getStravaActivities: GetStravaActivities = defaultGetStravaActivities,
  options: {
    after?: number
    perPage?: number
    logger?: Logger
  } = {},
): Promise<ActivityListItem[]> {
  const { after, perPage = 100, logger } = options
  const all: ActivityListItem[] = []
  let page = 1
  while (true) {
    const batch = await getStravaActivities({
      page,
      perPage,
      ...(after != null ? { after } : {}),
    })
    if (!batch.length)
      break
    all.push(...batch)
    logger?.log(`  Page ${page}: ${batch.length} activities`)
    if (batch.length < perPage)
      break
    page++
  }
  return all
}

/** Full activity list (no `after`). Use to detect late uploads. */
export function fetchAllActivities(
  getStravaActivities: GetStravaActivities = defaultGetStravaActivities,
  options: { perPage?: number, logger?: Logger } = {},
) {
  return fetchActivities(getStravaActivities, options)
}

/**
 * Incremental sync of latest activities (`after: lastSync`).
 * Used by `pnpm sync:strava:activities` / GitHub Actions.
 */
export async function syncActivities({
  activitiesDir = DEFAULT_ACTIVITIES_DIR,
  getStravaActivities = defaultGetStravaActivities,
  getStravaActivityById = defaultGetStravaActivityById,
  logger = console,
}: {
  activitiesDir?: string
  getStravaActivities?: GetStravaActivities
  getStravaActivityById?: GetStravaActivityById
  logger?: Logger
} = {}): Promise<SyncResult> {
  fs.mkdirSync(activitiesDir, { recursive: true })

  logger.log('🔄 Syncing Strava activities...')

  const knownIds = readIds(activitiesDir)
  const knownSet = new Set(knownIds)
  const meta = readMeta(activitiesDir)
  const lastSync = typeof meta.lastSync === 'number' ? meta.lastSync : null

  if (lastSync) {
    logger.log(`  Incremental sync: fetching activities since ${new Date(lastSync * 1000).toISOString()}`)
  }
  else {
    logger.log('  Full sync: fetching all activities (no previous sync)')
  }

  const activities = await fetchActivities(getStravaActivities, {
    after: lastSync ?? undefined,
    logger,
  })

  if (activities.length === 0) {
    logger.log('✅ No new activities found')
    return { missingIds: [], fetchedIds: [], total: knownSet.size }
  }

  const freshIds = activities.map(a => a.id)
  const missingIds = findMissingActivityIds(activitiesDir, freshIds)

  if (missingIds.length === 0) {
    for (const id of freshIds)
      knownSet.add(id)
    writeIds(activitiesDir, [...knownSet])
    writeMeta(activitiesDir, { ...meta, lastSync: getLatestActivityTimestamp(activities) })
    logger.log('✅ All activities up to date')
    return { missingIds: [], fetchedIds: [], total: knownSet.size }
  }

  logger.log(`⬇️  Fetching ${missingIds.length} activity details...`)
  const fetchedIds: number[] = []
  for (const id of missingIds) {
    logger.log(`  ${id}`)
    const detail = await getStravaActivityById(id)
    saveDetail(activitiesDir, id, detail)
    fetchedIds.push(id)
  }

  for (const id of freshIds)
    knownSet.add(id)
  writeIds(activitiesDir, [...knownSet])
  writeMeta(activitiesDir, { ...meta, lastSync: getLatestActivityTimestamp(activities) })

  logger.log(`✅ Synced ${fetchedIds.length} activities (total: ${knownSet.size})`)
  return { missingIds, fetchedIds, total: knownSet.size }
}
