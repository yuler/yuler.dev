import { describe, expect, it } from 'vitest'
import { decodePolyline } from './polyline'

describe('decodePolyline', () => {
  it('decodes a short polyline', () => {
    // _p~iF~ps|U_ulLnnqC_mqNvxq`@ (classic Google example segment)
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
    const pts = decodePolyline(encoded)
    expect(pts.length).toBeGreaterThan(1)
    expect(pts[0][0]).toBeCloseTo(38.5, 1)
    expect(pts[0][1]).toBeCloseTo(-120.2, 1)
  })

  it('returns empty array for empty string', () => {
    expect(decodePolyline('')).toEqual([])
  })
})
