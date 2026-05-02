import { fnv1a32 } from './fnv1a32'

export interface ThoughtLayoutInput {
  id: string
  slug: string
  dateMs: number
}

export interface ThoughtLayoutRow {
  slug: string
  bandIndex: number
  bandKey: string
  x: number
  y: number
  rotateDeg: number
  tabIndex: number
}

export interface LayoutOptions {
  /** Tab 顺序：新→旧（设计 3.1） */
  focusOrder?: 'new-first' | 'old-first'
}

/** 与顶栏 / 列表 `px-4` 一致（1rem，根字号 16px 时 16px） */
const PAD_X = 16
/** 分带与 world 纵向留白 */
const PAD_Y = 48
const NOTE_W = 300
/** 卡片内容最大高度（布局与 world 估算按此上限，避免重叠） */
const NOTE_MAX_H = 480
/** 单年份分带高度：须 ≥ NOTE_MAX_H + 竖向随机余量 */
const BAND_H = NOTE_MAX_H + PAD_Y + 72

/**
 * 与 `max-w-6xl` + `px-4` 内容区等宽：72rem − 2×1rem（根 16px 时 1120px）。
 * 卡片横向随机范围限制在此宽度内。
 */
export const THOUGHT_LAYOUT_CONTAINER_W = 1120

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
  const xSpread = Math.max(0, THOUGHT_LAYOUT_CONTAINER_W - NOTE_W - 2 * PAD_X)
  for (const t of inputs) {
    const y = calendarYear(t.dateMs)
    const bandIndex = yearRank.get(y) ?? 0
    const bandKey = String(y)
    const u = unitFloat(t.slug, 'x')
    const v = unitFloat(t.slug, 'y')
    const x = PAD_X + u * xSpread
    const yPx = PAD_Y + bandIndex * BAND_H + v * (BAND_H - NOTE_MAX_H - PAD_Y)
    /** ±13° from slug — reads like casually placed stickers */
    const rot = (unitFloat(t.slug, 'rot') - 0.5) * 26
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
export const THOUGHT_STICKY_NOTE_MAX_H = NOTE_MAX_H

export function worldBounds(rows: ThoughtLayoutRow[]): { width: number, height: number } {
  if (rows.length === 0)
    return { width: THOUGHT_LAYOUT_CONTAINER_W, height: PAD_Y * 2 + BAND_H }
  let maxX = 0
  let maxY = 0
  let maxBand = 0
  for (const r of rows) {
    maxX = Math.max(maxX, r.x + NOTE_W)
    maxY = Math.max(maxY, r.y + NOTE_MAX_H)
    maxBand = Math.max(maxBand, r.bandIndex)
  }
  /** 纵向至少盖住所有年份分带 */
  const minH = PAD_Y + (maxBand + 1) * BAND_H + PAD_Y
  return {
    width: Math.max(THOUGHT_LAYOUT_CONTAINER_W, maxX + PAD_X),
    height: Math.max(minH, maxY + PAD_Y),
  }
}
