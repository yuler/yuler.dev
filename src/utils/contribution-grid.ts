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
   * Rolling mode: always true (every cell is in range).
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

function endOfWeekSaturday(d: Date): Date {
  return addDays(startOfWeekSunday(d), 6)
}

/**
 * GitHub-style rolling window: same calendar date last year → end of the week that contains `reference` (local).
 * Columns are full weeks (Sun–Sat); first column starts on the Sunday of the week that contains the anniversary.
 */
export function getRollingYearContributionColumns(reference: Date = new Date()): ContributionCalendarDay[][] {
  const ref = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12, 0, 0, 0)
  const oneYearBefore = new Date(ref)
  oneYearBefore.setFullYear(ref.getFullYear() - 1)

  const gridStart = startOfWeekSunday(oneYearBefore)
  const gridEnd = endOfWeekSaturday(ref)

  const columns: ContributionCalendarDay[][] = []
  let weekStart = new Date(gridStart)
  while (weekStart.getTime() <= gridEnd.getTime()) {
    const col: ContributionCalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      col.push({ date: formatDate(d), inYear: true })
    }
    columns.push(col)
    weekStart = addDays(weekStart, 7)
  }
  return columns
}
