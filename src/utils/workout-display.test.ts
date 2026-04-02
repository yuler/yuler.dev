import { describe, expect, it } from 'vitest'
import {
  formatDistanceMeters,
  formatDistanceMetersCompact,
  formatMovingDuration,
  formatPaceOrSpeed,
} from './workout-display'

describe('workout-display', () => {
  it('formats distance', () => {
    expect(formatDistanceMeters(500)).toBe('500m')
    expect(formatDistanceMeters(1500)).toBe('1.50 km')
    expect(formatDistanceMetersCompact(1500)).toBe('1.50km')
  })

  it('formats moving duration modes', () => {
    expect(formatMovingDuration(125, 'list')).toBe('2m')
    expect(formatMovingDuration(3665, 'detail')).toMatch(/1h 1m 5s/)
  })

  it('formats pace vs ride speed', () => {
    expect(formatPaceOrSpeed('Ride', 5)).toContain('km/h')
    expect(formatPaceOrSpeed('Run', 3)).toMatch(/'/)
  })
})
