/**
 * Loads locally synced Strava activity JSON (from `pnpm sync:strava:activities`).
 * Single `import.meta.glob` so Vite bundles one consistent map of modules.
 */

import ids from '../../data/strava/activities/_index.json'

const ACTIVITY_JSON_PATH_RE = /\/(\d+)\.json$/

const activityModules = import.meta.glob('../../data/strava/activities/*.json', {
  eager: true,
}) as Record<string, unknown>

function activityIdFromModuleKey(key: string): number | undefined {
  const m = key.match(ACTIVITY_JSON_PATH_RE)
  return m ? Number.parseInt(m[1], 10) : undefined
}

const activityModuleById = new Map<number, unknown>()
for (const [key, mod] of Object.entries(activityModules)) {
  const id = activityIdFromModuleKey(key)
  if (id != null)
    activityModuleById.set(id, mod)
}

export function getStoredActivityIds(): readonly number[] {
  return ids as number[]
}

export function unwrapJsonModule<T>(mod: unknown): T {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: T }).default
  }
  return mod as T
}

export function loadStoredActivityById<T>(id: number): T | undefined {
  const mod = activityModuleById.get(id)
  if (mod === undefined)
    return undefined
  return unwrapJsonModule<T>(mod)
}

export function loadAllStoredActivities<T>(): T[] {
  return getStoredActivityIds()
    .map(id => loadStoredActivityById<T>(id))
    .filter((a): a is T => a != null)
}

/** Full activity payload as stored for workout detail pages */
export interface StoredActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number
  moving_time: number
  elapsed_time: number
  start_date_local: string
  average_speed: number
  max_speed: number
  total_elevation_gain: number
  elev_high: number
  elev_low: number
  has_heartrate: boolean
  average_heartrate?: number
  max_heartrate?: number
  calories: number
  description: string | null
  device_name: string
  start_latlng: number[]
  end_latlng: number[]
  map: { polyline: string, summary_polyline: string }
}

/** Subset for list / home card */
export type StoredActivitySummary = Pick<
  StoredActivity,
  | 'id'
  | 'name'
  | 'sport_type'
  | 'distance'
  | 'moving_time'
  | 'elapsed_time'
  | 'start_date_local'
  | 'average_speed'
  | 'total_elevation_gain'
  | 'has_heartrate'
  | 'average_heartrate'
  | 'map'
>
