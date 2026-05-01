import { fnv1a32 } from './fnv1a32'

export type ThoughtLayoutInput = {
  id: string
  slug: string
  dateMs: number
}

export type ThoughtLayoutRow = {
  slug: string
  bandIndex: number
  bandKey: string
  x: number
  y: number
  rotateDeg: number
  tabIndex: number
}

export type LayoutOptions = {
  /** Tab 顺序：新→旧（设计 3.1） */
  focusOrder?: 'new-first' | 'old-first'
}

const NOTE_W = 300
const NOTE_H = 280
const BAND_H = 420
const PAD = 48

function unitFloat(seed: string, salt: string): number {
  const h = fnv1a32(`${seed}\0${salt}`)
  return (h % 10_000) / 10_000
}

function calendarYear(ms: number): number {
  return new Date(ms).getUTCFullYear()
}

/**
 * 按 UTC 日历年份分带；新年份 bandIndex 更大。
 * 带内位置由 slug 确定性分散。
 */
export function layoutStickyNotes(
  inputs: ThoughtLayoutInput[],
  options: LayoutOptions = {},
): ThoughtLayoutRow[] {
  const focusOrder = options.focusOrder ?? 'new-first'
  const byYear = new Map<number, ThoughtLayoutInput[]>()
  for (const t of inputs) {
    const y = calendarYear(t.dateMs)
    if (!byYear.has(y))
      byYear.set(y, [])
    byYear.get(y)!.push(t)
  }
  const yearsAsc = [...byYear.keys()].sort((a, b) => a - b)
  const yearRank = new Map<number, number>()
  yearsAsc.forEach((y, i) => yearRank.set(y, i))

  const rows: ThoughtLayoutRow[] = []
  for (const t of inputs) {
    const y = calendarYear(t.dateMs)
    const bandIndex = yearRank.get(y) ?? 0
    const bandKey = String(y)
    const u = unitFloat(t.slug, 'x')
    const v = unitFloat(t.slug, 'y')
    const rw = 900
    const x = PAD + u * (rw - NOTE_W)
    const yPx = PAD + bandIndex * BAND_H + v * (BAND_H - NOTE_H - PAD)
    const rot = (unitFloat(t.slug, 'rot') - 0.5) * 7
    rows.push({
      slug: t.slug,
      bandIndex,
      bandKey,
      x,
      y: yPx,
      rotateDeg: rot,
      tabIndex: 0,
    })
  }

  const chron = [...inputs].sort((a, b) => a.dateMs - b.dateMs)
  const order = focusOrder === 'new-first' ? [...chron].reverse() : chron
  const rowMap = new Map(rows.map(r => [r.slug, r]))
  order.forEach((t, i) => {
    const row = rowMap.get(t.slug)
    if (row)
      row.tabIndex = 10 + i
  })

  return rows
}

export const THOUGHT_STICKY_NOTE_W = NOTE_W
export const THOUGHT_STICKY_NOTE_H = NOTE_H

export function worldBounds(rows: ThoughtLayoutRow[]): { width: number, height: number } {
  if (rows.length === 0)
    return { width: 800, height: 600 }
  let maxX = 0
  let maxY = 0
  for (const r of rows) {
    maxX = Math.max(maxX, r.x + NOTE_W)
    maxY = Math.max(maxY, r.y + NOTE_H)
  }
  return { width: maxX + PAD, height: maxY + PAD }
}
