import { formatDate } from './date'

function addDays(date: Date, delta: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

export interface ContributionCalendarDay {
  /** yyyy-MM-dd */
  date: string
  /**
   * True when the day is part of the plotted range.
   * Calendar-year mode: false for padding outside that year.
   * Rolling mode: false for grid padding before the anniversary or after `reference`.
   */
  inYear: boolean
}

/**
 * GitHub-style calendar: each column is one week, Sunday (row 0) → Saturday (row 6).
 * Includes leading/trailing days outside `year` so the grid is rectangular.
 */
export function getYearContributionColumns(year: number): ContributionCalendarDay[][] {
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  const gridStart = addDays(jan1, -jan1.getDay())
  const gridEnd = addDays(dec31, 6 - dec31.getDay())

  const columns: ContributionCalendarDay[][] = []
  let weekStart = new Date(gridStart)
  while (weekStart.getTime() <= gridEnd.getTime()) {
    const col: ContributionCalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const date = formatDate(d)
      const inYear = d.getFullYear() === year
      col.push({ date, inYear })
    }
    columns.push(col)
    weekStart = addDays(weekStart, 7)
  }
  return columns
}

function startOfWeekSunday(d: Date): Date {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  t.setDate(t.getDate() - t.getDay())
  return t
}

function rollingYearWindow(reference: Date) {
  const ref = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12, 0, 0, 0)
  const oneYearBefore = new Date(ref)
  oneYearBefore.setFullYear(ref.getFullYear() - 1)
  return {
    ref,
    oneYearBefore,
    rangeStart: formatDate(oneYearBefore),
    rangeEnd: formatDate(ref),
  }
}

/** Inclusive yyyy-MM-dd bounds for the rolling-year window (anniversary → reference day, local). */
export function getRollingYearWindowBounds(reference: Date = new Date()): { start: string; end: string } {
  const w = rollingYearWindow(reference)
  return { start: w.rangeStart, end: w.rangeEnd }
}

/**
 * GitHub-style rolling window: same calendar date last year → `reference` (local), inclusive.
 * Columns are full weeks (Sun–Sat) for layout; days outside [anniversary, reference] use `inYear: false`
 * so the UI does not paint cells for padding or future days in the current week.
 */
export function getRollingYearContributionColumns(reference: Date = new Date()): ContributionCalendarDay[][] {
  const { ref, oneYearBefore, rangeStart, rangeEnd } = rollingYearWindow(reference)

  const gridStart = startOfWeekSunday(oneYearBefore)
  const gridEnd = ref

  const columns: ContributionCalendarDay[][] = []
  let weekStart = new Date(gridStart)
  while (weekStart.getTime() <= gridEnd.getTime()) {
    const col: ContributionCalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const date = formatDate(d)
      const inYear = date >= rangeStart && date <= rangeEnd
      col.push({ date, inYear })
    }
    columns.push(col)
    weekStart = addDays(weekStart, 7)
  }
  return columns
}
