import { describe, expect, it } from 'vitest'
import { layoutStickyNotes, type ThoughtLayoutInput } from './thoughts-canvas-layout'

function T(slug: string, dateIso: string): ThoughtLayoutInput {
  return { id: slug, slug, dateMs: new Date(dateIso).getTime() }
}

describe('layoutStickyNotes', () => {
  it('returns stable x,y,rotate for the same slug and date', () => {
    const a = layoutStickyNotes([T('alpha', '2026-01-02T12:00:00Z')])
    const b = layoutStickyNotes([T('alpha', '2026-01-02T12:00:00Z')])
    expect(a[0]).toEqual(b[0])
  })

  it('places newer calendar year in a higher-index band', () => {
    const rows = layoutStickyNotes([
      T('old', '2024-06-01T00:00:00Z'),
      T('new', '2026-01-01T00:00:00Z'),
    ])
    const old = rows.find(r => r.slug === 'old')!
    const neu = rows.find(r => r.slug === 'new')!
    expect(neu.bandIndex).toBeGreaterThan(old.bandIndex)
  })

  it('orders tabindex sequence new-to-old when option focusOrder is new-first', () => {
    const rows = layoutStickyNotes(
      [T('a', '2025-01-01T00:00:00Z'), T('b', '2026-01-01T00:00:00Z')],
      { focusOrder: 'new-first' },
    )
    const tab = [...rows].sort((p, q) => p.tabIndex - q.tabIndex).map(r => r.slug)
    expect(tab[0]).toBe('b')
  })
})
