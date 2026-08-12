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

  it('uses saved position, size, z-index and rotation overrides by slug', () => {
    const [row] = layoutStickyNotes(
      [
        {
          id: 'saved',
          slug: 'saved-card',
          dateMs: Date.parse('2026-01-01T00:00:00Z'),
        },
      ],
      {
        overrides: {
          'saved-card': {
            x: 123,
            y: 456,
            rotateDeg: -3.5,
            zIndex: 42,
            width: 360,
            height: 520,
          },
        },
      },
    )

    expect(row?.x).toBe(123)
    expect(row?.y).toBe(456)
    expect(row?.rotateDeg).toBe(-3.5)
    expect(row?.zIndex).toBe(42)
    expect(row?.width).toBe(360)
    expect(row?.height).toBe(520)
  })

  it('assigns default z-index from focus order when not overridden', () => {
    const rows = layoutStickyNotes([
      { id: 'a', slug: 'a', dateMs: 1 },
      { id: 'b', slug: 'b', dateMs: 2 },
    ])
    const a = rows.find(r => r.slug === 'a')
    const b = rows.find(r => r.slug === 'b')
    expect(a?.zIndex).toBe(1)
    expect(b?.zIndex).toBe(2)
  })

  it('keeps overridden coordinates verbatim, negatives included', () => {
    const rows = layoutStickyNotes(
      [{ id: 'up', slug: 'up', dateMs: Date.parse('2026-01-01T00:00:00Z') }],
      { overrides: { up: { x: -100.5, y: -800, width: 320, height: 200, pin: '📌' } } },
    )
    expect(rows[0]).toMatchObject({
      x: -100.5,
      y: -800,
      width: 320,
      height: 200,
      pinEmoji: '📌',
    })
  })
})
