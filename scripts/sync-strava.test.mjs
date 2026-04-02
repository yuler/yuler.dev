import { describe, expect, test } from 'vitest';
import { getStravaActivities } from '../src/utils/strava.ts';

function stravaEnvReady() {
  return Boolean(
    process.env.STRAVA_CLIENT_ID &&
    process.env.STRAVA_CLIENT_SECRET &&
    process.env.STRAVA_REFRESH_TOKEN,
  );
}

describe.skipIf(!stravaEnvReady())('Strava API (sync)', () => {
  test('getStravaActivities returns activities from the API', async () => {
    const activities = await getStravaActivities();

    console.log(
      'Strava activities JSON:',
      JSON.stringify(activities, null, 2),
    );

    expect(Array.isArray(activities)).toBe(true);

    if (activities.length > 0) {
      const activity = activities[0];
      expect(activity).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        type: expect.any(String),
        start_date: expect.any(String),
      });
      expect(activity.distance).toEqual(expect.any(Number));
      expect(activity.moving_time).toEqual(expect.any(Number));
    }
  });
});
