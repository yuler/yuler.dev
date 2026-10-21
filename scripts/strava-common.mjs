import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const tmpDir = path.join(root, 'tmp', 'strava')
export const authFile = path.join(tmpDir, 'auth-state.json')
export const activitiesDir = path.join(root, 'data', 'strava', 'activities')
export const TRAINING_URL = 'https://www.strava.com/athlete/training'

export function isLoginUrl(url) {
  return /https:\/\/www\.strava\.com\/(?:login|signup|oauth\/authorize)/.test(url)
}
