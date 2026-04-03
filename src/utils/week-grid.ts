import { formatDate } from './date'

export interface WeekRangeWithIndex { start: string, end: string, index: number }

/**
 * Calendar weeks from Jan 1 for a given year: first segment ends on the nearest Saturday,
 * then 7-day chunks (52 more iterations → 53 rows total, same as previous inline logic).
 */
export function getWeekRangesForYear(year: number): [string, string][] {
  const jan1 = new Date(year, 0, 1)
  const jan1Day = jan1.getDay()
  const firstWeekEnd = new Date(year, 0, 1 + ((6 - jan1Day + 7) % 7 || 6))
  const firstWeek: [string, string] = [formatDate(jan1), formatDate(firstWeekEnd)]
  const weeks: [string, string][] = [firstWeek]
  let lastEnd = new Date(firstWeek[1])
  for (let i = 0; i < 51; i++) {
    const start = new Date(lastEnd)
    start.setDate(start.getDate() + 1)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    weeks.push([formatDate(start), formatDate(end)])
    lastEnd = end
  }
  return weeks
}

export function getWeekRangesWithIndex(year: number): WeekRangeWithIndex[] {
  return getWeekRangesForYear(year).map(([start, end], i) => ({
    start,
    end,
    index: i + 1,
  }))
}
