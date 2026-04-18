import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

/** Local `yyyy-MM-dd` */
export const YMD = /^\d{4}-\d{2}-\d{2}$/

export function parseYmd(s: string): Date | null {
  if (!YMD.test(s))
    return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function formatYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function daysInclusive(fromStr: string, toStr: string): number {
  const a = parseYmd(fromStr)
  const b = parseYmd(toStr)
  if (!a || !b)
    return 1
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86400000) + 1
}

export function addDaysStr(ymdStr: string, delta: number): string {
  const d = parseYmd(ymdStr)
  if (!d)
    return ymdStr
  d.setDate(d.getDate() + delta)
  return formatYmd(d)
}

export function clampToMax(ymdStr: string, maxStr: string): string {
  if (!maxStr || !ymdStr)
    return ymdStr
  return ymdStr > maxStr ? maxStr : ymdStr
}

export function normalizeRange(from: string, to: string): { from: string, to: string } {
  if (!from && !to)
    return { from: '', to: '' }
  if (from && !to)
    return { from, to: from }
  if (!from && to)
    return { from: to, to }
  if (from > to)
    return { from: to, to: from }
  return { from, to }
}

/** Trigger / button label for a range (local dates). */
export function formatRangeLabel(from: string, to: string): string {
  if (!from || !to)
    return 'Pick a date range'
  const a = parseYmd(from)
  const b = parseYmd(to)
  if (!a || !b)
    return 'Pick a date range'
  const f = format(a, 'MMM d, yyyy')
  const t = format(b, 'MMM d, yyyy')
  return from === to ? f : `${f} – ${t}`
}

const weekOpts = { weekStartsOn: 0 as const }

/** Sun–Sat week containing `todayYmd`, end clamped to `todayYmd`. */
export function rangeCurrentWeek(todayYmd: string): { from: string, to: string } {
  const cap = parseYmd(todayYmd) ?? new Date()
  const from = formatYmd(startOfWeek(cap, weekOpts))
  let to = formatYmd(endOfWeek(cap, weekOpts))
  if (todayYmd)
    to = clampToMax(to, todayYmd)
  return normalizeRange(from, to)
}

/** First day of month containing `todayYmd` through `todayYmd` or month end. */
export function rangeCurrentMonth(todayYmd: string): { from: string, to: string } {
  const cap = parseYmd(todayYmd) ?? new Date()
  const from = formatYmd(startOfMonth(cap))
  let to = formatYmd(endOfMonth(cap))
  if (todayYmd)
    to = clampToMax(to, todayYmd)
  return { from, to }
}

/** Full calendar month before the one containing `todayYmd`. */
export function rangePreviousMonth(todayYmd: string): { from: string, to: string } {
  const cap = parseYmd(todayYmd) ?? new Date()
  const ref = startOfMonth(subMonths(cap, 1))
  const from = formatYmd(ref)
  const to = formatYmd(endOfMonth(ref))
  return normalizeRange(from, to)
}
