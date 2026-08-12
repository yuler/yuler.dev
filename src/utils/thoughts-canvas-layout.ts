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
  zIndex: number
  width: number
  height: number
  pinEmoji?: string
  /** Pin offset from the card's top-left corner. */
  pinX: number
  pinY: number
  tabIndex: number
}

export interface ThoughtLayoutOverride {
  x?: number
  y?: number
  rotateDeg?: number
  zIndex?: number
  width?: number
  height?: number
  /** Pin emoji on the card; click pin in view mode to focus the card */
  pin?: string
  pinX?: number
  pinY?: number
}

/**
 * Authored starting view for the canvas: the canvas point to put in the middle of
 * the viewport, plus zoom. Stored as a point rather than a translate so it restores
 * correctly at any window size.
 */
export interface ThoughtsCanvasView {
  cx: number
  cy: number
}

export interface ThoughtLayoutOverridesFile {
  version: 1
  view?: ThoughtsCanvasView
  cards: Record<string, ThoughtLayoutOverride | undefined>
}

export interface LayoutOptions {
  /** Tab order: new to old (design 3.1) */
  focusOrder?: 'new-first' | 'old-first'
  /** Optional container width for responsive layout */
  containerWidth?: number
  overrides?: Record<string, ThoughtLayoutOverride | undefined>
}

/** Matches top bar / list `px-4` (1rem, 16px when root font size is 16px) */
const PAD_X = 16
/** Vertical padding between bands and world */
const PAD_Y = 48
const NOTE_W = 300
/** Max height of card content (layout and world estimation use this limit to avoid overlap) */
const NOTE_MAX_H = 480
/** Single year band height: must be ≥ NOTE_MAX_H + vertical random margin */
const BAND_H = NOTE_MAX_H + PAD_Y + 72
/** Newest note in each year stays close to the visual center. */
const RECENT_CENTER_SPREAD = 160
/** ±7° from slug — enough personality without looking too tilted. */
const ROTATE_RANGE_DEG = 14
/** Pin starts in the card's top-left corner and can be dragged from there. */
export const THOUGHT_PIN_DEFAULT_OFFSET = 8
export const THOUGHT_PIN_SIZE = 28

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Same width as `max-w-6xl` + `px-4` content area: 72rem - 2x1rem (1120px when root is 16px).
 * Card horizontal random range is limited within this width.
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
 * Band by UTC calendar year; **newest** year sits in the top band (bandIndex 0).
 * Within a year, newer posts sit higher; horizontal scatter and tilt stay slug‑deterministic.
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
  const yearsDesc = [...byYear.keys()].sort((a, b) => b - a)
  const yearRank = new Map<number, number>()
  yearsDesc.forEach((y, i) => yearRank.set(y, i))

  const rows: ThoughtLayoutRow[] = []
  const containerW = options.containerWidth ?? THOUGHT_LAYOUT_CONTAINER_W
  const xSpread = Math.max(0, containerW - NOTE_W - 2 * PAD_X)
  const slotSpan = BAND_H - NOTE_MAX_H - PAD_Y

  for (const year of yearsDesc) {
    const inYear = [...(byYear.get(year) ?? [])].sort((a, b) => b.dateMs - a.dateMs)
    const n = inYear.length
    for (let idx = 0; idx < n; idx++) {
      const t = inYear[idx]!
      const bandIndex = yearRank.get(year) ?? 0
      const bandKey = String(year)
      const u = unitFloat(t.slug, 'x')
      const v = unitFloat(t.slug, 'y')
      const centerX = (containerW - NOTE_W) / 2
      const newestInYear = idx === 0
      const recentSpread = Math.min(RECENT_CENTER_SPREAD, xSpread)
      const x = newestInYear
        ? centerX + (u - 0.5) * recentSpread
        : PAD_X + u * xSpread
      /** Newest in the year at top of band; spread older entries downward with small jitter */
      const depthFrac = n <= 1 ? 0 : idx / Math.max(n - 1, 1)
      const verticalBase = depthFrac * slotSpan * 0.88
      const jitter = (v - 0.5) * Math.min(56, slotSpan * 0.08)
      const yPx = PAD_Y + bandIndex * BAND_H + verticalBase + jitter
      const rot = (unitFloat(t.slug, 'rot') - 0.5) * ROTATE_RANGE_DEG
      const override = options.overrides?.[t.slug]
      rows.push({
        slug: t.slug,
        bandIndex,
        bandKey,
        x: finiteOr(override?.x, x),
        y: finiteOr(override?.y, yPx),
        rotateDeg: finiteOr(override?.rotateDeg, rot),
        zIndex: finiteOr(override?.zIndex, 0),
        width: finiteOr(override?.width, NOTE_W),
        height: finiteOr(override?.height, NOTE_MAX_H),
        pinEmoji: typeof override?.pin === 'string' ? override.pin : undefined,
        pinX: finiteOr(override?.pinX, THOUGHT_PIN_DEFAULT_OFFSET),
        pinY: finiteOr(override?.pinY, THOUGHT_PIN_DEFAULT_OFFSET),
        tabIndex: 0,
      })
    }
  }

  const chron = [...inputs].sort((a, b) => a.dateMs - b.dateMs)
  const order = focusOrder === 'new-first' ? [...chron].reverse() : chron
  const rowMap = new Map(rows.map(r => [r.slug, r]))
  order.forEach((t, i) => {
    const row = rowMap.get(t.slug)
    if (!row)
      return
    row.tabIndex = 10 + i
    if (!row.zIndex)
      row.zIndex = order.length - i
  })

  return rows
}

export const THOUGHT_STICKY_NOTE_W = NOTE_W
export const THOUGHT_STICKY_NOTE_MAX_H = NOTE_MAX_H
export const THOUGHT_CARD_MIN_W = 200
export const THOUGHT_CARD_MIN_H = 120
export const THOUGHT_CARD_MAX_W = 560
export const THOUGHT_CARD_MAX_H = 720

/**
 * The canvas is unbounded: card coordinates are used verbatim as CSS `left`/`top`
 * (negatives included), so a saved layout is pixel-identical to the edited one.
 * Viewport centering is derived from the rendered cards instead of a world box.
 */
