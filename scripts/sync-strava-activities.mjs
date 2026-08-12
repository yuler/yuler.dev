/**
 * Incremental Strava sync — used by GitHub Actions hourly.
 * Usage: pnpm sync:strava:activities
 */

import process from 'node:process'
import { syncActivities } from '../src/lib/strava-core.ts'

syncActivities().catch((err) => {
  console.error('❌ Sync failed:', err.message)
  process.exit(1)
})
