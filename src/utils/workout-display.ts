export const sportIcons: Record<string, string> = {
  Run: '🏃',
  Ride: '🚴',
  Walk: '🚶',
  Swim: '🏊',
  Hike: '🥾',
  Yoga: '🧘',
  WeightTraining: '🏋️',
}

export function deviceEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('apple watch')) return '⌚'
  if (n.includes('iphone')) return '📱'
  if (n.includes('ipad')) return '📱'
  if (n.includes('garmin')) return '⌚'
  if (n.includes('fitbit')) return '⌚'
  if (n.includes('wahoo') || n.includes('bike computer')) return '🖥️'
  if (n.includes('polar')) return '⌚'
  if (n.includes('suunto')) return '⌚'
  if (n.includes('coros')) return '⌚'
  if (n.includes('samsung') || n.includes('galaxy watch')) return '⌚'
  if (n.includes('android') || n.includes('pixel')) return '📱'
  if (n.includes('zwift') || n.includes('peloton') || n.includes('trainer')) return '🚲'
  return '📟'
}

/** List row: short duration. Detail: include seconds when under 1h. */
export function formatMovingDuration(seconds: number, mode: 'list' | 'detail'): string {
  const roundedSeconds = Math.round(seconds)
  const h = Math.floor(roundedSeconds / 3600)
  const m = Math.floor((roundedSeconds % 3600) / 60)
  const s = roundedSeconds % 60
  if (mode === 'detail') {
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(2)} km`
}

/** Compact distance for dense list rows (no space before km). */
export function formatDistanceMetersCompact(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(2)}km`
}

export function formatPaceOrSpeed(sportType: string, avgSpeed: number): string {
  if (avgSpeed === 0) return '-'
  if (sportType === 'Ride') return `${(avgSpeed * 3.6).toFixed(1)} km/h`
  const totalPaceSeconds = Math.round(1000 / avgSpeed)
  const paceMin = Math.floor(totalPaceSeconds / 60)
  const paceSec = totalPaceSeconds % 60
  return `${paceMin}'${String(paceSec).padStart(2, '0')}"/km`
}

export function formatMaxSpeedKmh(maxSpeed: number): string {
  return `${(maxSpeed * 3.6).toFixed(1)} km/h`
}

/** Total weekly moving time for heatmap tooltips */
export function formatDurationHeatmap(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
