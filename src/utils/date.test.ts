import { describe, expect, it } from 'vitest'
import { formatDate } from './date'

describe('formatDate', () => {
  it('formats as yyyy-MM-dd', () => {
    expect(formatDate(new Date('2026-04-02T12:00:00'))).toBe('2026-04-02')
  })
})
