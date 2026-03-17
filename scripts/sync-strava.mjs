import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getStravaActivities, getStravaActivityById } from '../src/utils/strava.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data', 'strava')

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

async function syncActivities() {
  console.log('🔄 Syncing Strava activities...')
  try {
    const activities = await getStravaActivities()
    
    // Detailed sync: Fetch each activity to get detailed polylines if needed,
    // but summary_polyline from the list is usually enough.
    // We'll save the list first.
    fs.writeFileSync(
      path.join(DATA_DIR, 'activities.json'), 
      JSON.stringify(activities, null, 2)
    )
    
    console.log(`✅ Saved ${activities.length} activities to ${DATA_DIR}/activities.json`)
    
    // Optionally fetch more details for the latest activity for "map movement"
    if (activities.length > 0) {
      const latest = activities[0]
      console.log(`📍 Fetching details for latest activity: ${latest.name}`)
      const details = await getStravaActivityById(latest.id)
      
      fs.writeFileSync(
        path.join(DATA_DIR, `latest.json`),
        JSON.stringify(details, null, 2)
      )
      console.log(`✅ Saved latest activity details to ${DATA_DIR}/latest.json`)
      
      if (details.map?.polyline) {
        console.log('🗺️ Detailed polyline (movement data) is available.')
      } else if (details.map?.summary_polyline) {
        console.log('🗺️ Summary polyline is available.')
      }
    }
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    process.exit(1)
  }
}

syncActivities()
