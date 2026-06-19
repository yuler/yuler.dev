import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  getStravaActivities,
  getStravaActivityById,
} from '../src/utils/strava.ts'
import { syncActivities } from './sync-strava-activities-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ACTIVITIES_DIR = path.join(__dirname, '..', 'data', 'strava', 'activities')

syncActivities({
  activitiesDir: ACTIVITIES_DIR,
  getStravaActivities,
  getStravaActivityById,
}).catch((err) => {
  console.error('❌ Sync failed:', err.message)
  process.exit(1)
})
