import { getStravaActivities } from '../src/utils/strava.ts'

getStravaActivities()
  .then((activities) => {
    console.log(`Fetched ${activities.length} activities:\n`)
    activities.forEach((activity, index) => {
      console.log(`--- Activity #${index + 1} ---`)
      console.log(`ID: ${activity.id}`)
      console.log(`Name: ${activity.name}`)
      console.log(`Type: ${activity.type}`)
      console.log(`Date: ${activity.start_date}`)
      console.log(`Distance: ${(activity.distance / 1000).toFixed(2)} km`)
      console.log(`Moving Time: ${(activity.moving_time / 60).toFixed(1)} minutes`)
      console.log('')
    })
  })
  .catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
