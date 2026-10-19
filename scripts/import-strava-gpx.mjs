/**
 * Turn official Strava GPX exports plus a page-stats JSONL into
 * data/strava/activities/{id}.json.
 *
 * GPX files: tmp/strava/{id}.gpx
 * Optional stats (distance, moving time, local start) from the activity page:
 *   tmp/strava/page-stats.jsonl
 *
 * Usage: node scripts/import-strava-gpx.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmpDir = path.join(root, 'tmp', 'strava')
const activitiesDir = path.join(root, 'data', 'strava', 'activities')
const SHANGHAI_OFFSET_SEC = 8 * 60 * 60

const SPORT = {
  cycling: 'Ride',
  running: 'Run',
  walking: 'Walk',
  hiking: 'Hike',
  swimming: 'Swim',
}

function encodeSigned(num) {
  let value = num < 0 ? ~(num << 1) : num << 1
  let out = ''
  while (value >= 0x20) {
    out += String.fromCharCode((0x20 | (value & 0x1F)) + 63)
    value >>= 5
  }
  out += String.fromCharCode(value + 63)
  return out
}

function encodePolyline(points) {
  let lastLat = 0
  let lastLng = 0
  let out = ''
  for (const [lat, lng] of points) {
    const ilat = Math.round(lat * 1e5)
    const ilng = Math.round(lng * 1e5)
    out += encodeSigned(ilat - lastLat)
    out += encodeSigned(ilng - lastLng)
    lastLat = ilat
    lastLng = ilng
  }
  return out
}

function parseGpx(xml) {
  const name = xml.match(/<name>([^<]*)<\/name>/)?.[1] ?? 'Activity'
  const gpxType = xml.match(/<type>([^<]*)<\/type>/)?.[1] ?? ''
  const points = []
  const re = /<trkpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/trkpt>/g
  for (const match of xml.matchAll(re)) {
    const body = match[3]
    const time = body.match(/<time>([^<]+)<\/time>/)?.[1]
    const ele = body.match(/<ele>([^<]+)<\/ele>/)?.[1]
    const hr = body.match(/<gpxtpx:hr>([^<]+)<\/gpxtpx:hr>/)?.[1]
    points.push({
      lat: Number(match[1]),
      lon: Number(match[2]),
      time: time ? Date.parse(time) : null,
      ele: ele == null ? null : Number(ele),
      hr: hr == null ? null : Number(hr),
    })
  }
  return { name, gpxType, points }
}

function maxSpeed(points) {
  const speeds = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a.time == null || b.time == null)
      continue
    const dt = (b.time - a.time) / 1000
    if (dt < 1)
      continue
    const speed = haversine(a, b) / dt
    if (speed > 0 && speed <= 12)
      speeds.push(speed)
  }
  if (speeds.length === 0)
    return 0
  speeds.sort((a, b) => a - b)
  return speeds[Math.min(speeds.length - 1, Math.floor(speeds.length * 0.995))]
}

function haversine(a, b) {
  const R = 6371000
  const p1 = a.lat * Math.PI / 180
  const p2 = b.lat * Math.PI / 180
  const dp = (b.lat - a.lat) * Math.PI / 180
  const dl = (b.lon - a.lon) * Math.PI / 180
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function loadStats() {
  const file = path.join(tmpDir, 'page-stats.jsonl')
  const byId = new Map()
  if (!fs.existsSync(file))
    return byId
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed)
      continue
    let value = JSON.parse(trimmed)
    if (typeof value === 'string')
      value = JSON.parse(value)
    byId.set(value.id, value)
  }
  return byId
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function toActivity(id, gpx, stats) {
  const points = gpx.points
  const sport = stats?.type || SPORT[gpx.gpxType] || gpx.gpxType || 'Workout'
  const coords = points.map(p => [p.lat, p.lon])
  const polyline = coords.length ? encodePolyline(coords) : ''
  const eles = points.map(p => p.ele).filter(n => Number.isFinite(n))
  const hrs = points.map(p => p.hr).filter(n => Number.isFinite(n))
  const times = points.map(p => p.time).filter(n => Number.isFinite(n))
  const startMs = times[0] ?? null
  const endMs = times.at(-1) ?? startMs
  const localSec = typeof stats?.startDateLocal === 'number'
    ? stats.startDateLocal
    : (startMs == null ? null : Math.floor(startMs / 1000) + SHANGHAI_OFFSET_SEC)
  const startDate = localSec == null
    ? null
    : new Date((localSec - SHANGHAI_OFFSET_SEC) * 1000).toISOString().replace('.000Z', 'Z')
  const startDateLocal = localSec == null
    ? null
    : new Date(localSec * 1000).toISOString().replace('.000Z', 'Z')
  const distance = typeof stats?.distance === 'number'
    ? stats.distance
    : points.reduce((sum, p, i) => i === 0 ? 0 : sum + haversine(points[i - 1], p), 0)
  const moving = typeof stats?.moving_time === 'number'
    ? stats.moving_time
    : (startMs != null && endMs != null ? Math.max(0, Math.round((endMs - startMs) / 1000)) : 0)
  const elapsed = startMs != null && endMs != null
    ? Math.max(moving, Math.round((endMs - startMs) / 1000))
    : moving
  const elevation = typeof stats?.elev_gain === 'number' ? round1(stats.elev_gain) : 0

  return {
    id,
    name: stats?.name || gpx.name,
    distance: round1(distance),
    moving_time: moving,
    elapsed_time: elapsed,
    total_elevation_gain: elevation,
    type: sport,
    sport_type: sport,
    id_str: String(id),
    start_date: startDate,
    start_date_local: startDateLocal,
    timezone: '(GMT+08:00) Asia/Shanghai',
    utc_offset: SHANGHAI_OFFSET_SEC,
    map: {
      id: `a${id}`,
      polyline,
      summary_polyline: polyline,
    },
    start_latlng: coords[0] ?? [],
    end_latlng: coords.at(-1) ?? [],
    average_speed: moving > 0 ? Math.round((distance / moving) * 1000) / 1000 : 0,
    max_speed: Math.round(maxSpeed(points) * 100) / 100,
    has_heartrate: hrs.length > 0,
    ...(hrs.length
      ? {
          average_heartrate: Math.round(hrs.reduce((s, n) => s + n, 0) / hrs.length),
          max_heartrate: Math.max(...hrs),
        }
      : {}),
    elev_high: eles.length ? round1(Math.max(...eles)) : 0,
    elev_low: eles.length ? round1(Math.min(...eles)) : 0,
    description: null,
    calories: 0,
    device_name: '',
  }
}

const statsById = loadStats()
const files = fs.readdirSync(tmpDir).filter(name => /^\d+\.gpx$/.test(name))
const indexPath = path.join(activitiesDir, '_index.json')
const metaPath = path.join(activitiesDir, '_meta.json')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
const known = new Set(index)
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
let latest = typeof meta.lastSync === 'number' ? meta.lastSync : 0
const added = []

for (const file of files) {
  const id = Number(file.replace(/\.gpx$/, ''))
  const dest = path.join(activitiesDir, `${id}.json`)
  if (fs.existsSync(dest)) {
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'))
    if (existing.resource_state)
      continue
  }
  const gpx = parseGpx(fs.readFileSync(path.join(tmpDir, file), 'utf8'))
  const activity = toActivity(id, gpx, statsById.get(id))
  fs.writeFileSync(dest, `${JSON.stringify(activity, null, 2)}\n`)
  if (!known.has(id))
    added.push(activity)
}

added.sort((a, b) => a.id - b.id)
for (const activity of added) {
  index.push(activity.id)
  if (activity.start_date) {
    const sec = Math.floor(new Date(activity.start_date).getTime() / 1000)
    if (sec > latest)
      latest = sec
  }
}

if (added.length) {
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`)
  fs.writeFileSync(metaPath, `${JSON.stringify({ ...meta, lastSync: latest }, null, 2)}\n`)
}

for (const activity of added) {
  console.log(`${activity.id}  ${activity.start_date_local}  ${activity.sport_type}  ${activity.distance}m  ${activity.name}`)
}
console.log(`Added ${added.length}`)
