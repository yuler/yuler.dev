import { describe, expect, it } from 'vitest'
import { getStravaActivities } from '../src/utils/strava.ts'

function stravaEnvReady() {
  return Boolean(
    process.env.STRAVA_CLIENT_ID
    && process.env.STRAVA_CLIENT_SECRET
    && process.env.STRAVA_REFRESH_TOKEN,
  )
}

describe.skipIf(!stravaEnvReady())('strava API (sync)', () => {
  it('getStravaActivities returns activities from the API', async () => {
    const activities = await getStravaActivities()

    // CI logs can be very noisy (and slow). Keep local runs verbose.
    if (!process.env.CI) {
      console.log(
        'Strava activities JSON:',
        JSON.stringify(activities, null, 2),
      )
    }

    expect(Array.isArray(activities)).toBe(true)

    if (activities.length > 0) {
      const activity = activities[0]
      expect(activity).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        type: expect.any(String),
        start_date: expect.any(String),
      })
      expect(activity.distance).toEqual(expect.any(Number))
      expect(activity.moving_time).toEqual(expect.any(Number))
    }
  })
})
