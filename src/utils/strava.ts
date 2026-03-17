/**
 * Strava API Utility
 * Documentation: https://developers.strava.com/docs/reference/
 */

const API_BASE = 'https://www.strava.com/api/v3'

function getEnv(key: string): string {
  if (typeof process === 'undefined' || !process.env) {
    throw new Error('Server-side only: process.env is not available.')
  }
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

let cachedToken: string | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: getEnv('STRAVA_CLIENT_ID'),
      client_secret: getEnv('STRAVA_CLIENT_SECRET'),
      refresh_token: getEnv('STRAVA_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (data.errors) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data.errors)}`)
  }
  cachedToken = data.access_token as string
  return cachedToken
}

async function stravaFetch<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const token = await getAccessToken()
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v))
    }
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      `Strava API ${path} failed (${res.status}): ${JSON.stringify(err)}`,
    )
  }

  return res.json() as Promise<T>
}

/**
 * https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities
 */
export function getStravaActivities(
  options: { after?: number; page?: number; perPage?: number } = {},
) {
  const { after, page, perPage = 100 } = options
  return stravaFetch<StravaActivity[]>('/athlete/activities', {
    ...(after && { after }),
    ...(page && { page }),
    per_page: perPage,
  })
}

/**
 * https://developers.strava.com/docs/reference/#api-Activities-getActivityById
 */
export function getStravaActivityById(id: number) {
  return stravaFetch<StravaActivityDetail>(`/activities/${id}`)
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number
  moving_time: number
  start_date: string
  start_date_local: string
  map: { id: string; summary_polyline: string }
  [key: string]: unknown
}

export interface StravaActivityDetail extends StravaActivity {
  map: { id: string; summary_polyline: string; polyline: string }
  calories: number
  description: string | null
  [key: string]: unknown
}
