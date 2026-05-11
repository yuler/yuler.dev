import { describe, expect, it } from 'vitest'
import {
  layoutStickyNotes,
  THOUGHT_LAYOUT_CONTAINER_W,
  THOUGHT_STICKY_NOTE_W,
} from './thoughts-canvas-layout'

describe('layoutStickyNotes', () => {
  it('keeps sticky note tilt subtle', () => {
    const rows = layoutStickyNotes(
      Array.from({ length: 60 }, (_, i) => ({
        id: String(i),
        slug: `thought-${i}`,
        dateMs: Date.parse('2026-01-01T00:00:00Z') + i,
      })),
    )

    expect(Math.max(...rows.map(row => Math.abs(row.rotateDeg)))).toBeLessThanOrEqual(7)
  })

  it('places the newest thought in a year near the horizontal center', () => {
    const rows = layoutStickyNotes([
      {
        id: 'old',
        slug: 'old-edge',
        dateMs: Date.parse('2026-01-01T00:00:00Z'),
      },
      {
        id: 'new',
        slug: 'new-edge',
        dateMs: Date.parse('2026-05-11T00:00:00Z'),
      },
    ])

    const newest = rows.find(row => row.slug === 'new-edge')
    const centerX = (THOUGHT_LAYOUT_CONTAINER_W - THOUGHT_STICKY_NOTE_W) / 2

    expect(newest?.x).toBeDefined()
    expect(Math.abs((newest?.x ?? 0) - centerX)).toBeLessThanOrEqual(80)
  })
})
