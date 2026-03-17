/**
 * Strava API Utility
 * Documentation: https://developers.strava.com/docs/reference/
 */

const getEnv = (key: string): string => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key]
  }
  return process.env[key] || ''
}

const STRAVA_CLIENT_ID = getEnv('STRAVA_CLIENT_ID')
const STRAVA_CLIENT_SECRET = getEnv('STRAVA_CLIENT_SECRET')
const STRAVA_REFRESH_TOKEN = getEnv('STRAVA_REFRESH_TOKEN')

const TOKEN_URL = 'https://www.strava.com/oauth/token'
const ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities'

async function getAccessToken() {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  if (data.errors) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(data.errors)}`)
  }
  return data.access_token
}

/**
 * Fetch activities from Strava
 * https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities
 */
export async function getStravaActivities(after?: number, perPage = 100) {
  const accessToken = await getAccessToken()
  const url = new URL(ACTIVITIES_URL)
  if (after) {
    url.searchParams.append('after', after.toString())
  }
  url.searchParams.append('per_page', perPage.toString())

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to fetch Strava activities: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}

/**
 * Fetch a specific activity with detailed map polyline
 * https://developers.strava.com/docs/reference/#api-Activities-getActivityById
 */
export async function getStravaActivityById(id: number) {
  const accessToken = await getAccessToken()
  const response = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to fetch activity ${id}: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}
