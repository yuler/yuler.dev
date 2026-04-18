import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {
  clampToMax,
  formatRangeLabel,
  formatYmd,
  normalizeRange,
  parseYmd,
  rangeCurrentMonth,
  rangeCurrentWeek,
  rangePreviousMonth,
  YMD,
} from '../utils/workouts-date-range'

interface RangeSnapshot { from: string, to: string, awaiting: boolean }

export function initWorkoutsDateRange(root: HTMLElement): void {
  const listSel = root.dataset.selectorList || '#activity-list'
  const countSel = root.dataset.selectorCount || '#activity-count'
  const emptySel = root.dataset.selectorEmpty || '#empty-state'
  const todayCap = root.dataset.today || ''

  const popover = root.querySelector<HTMLElement>('[data-dr-popover]')
  const trigger = root.querySelector<HTMLButtonElement>('[data-dr-trigger]')
  const labelEl = root.querySelector<HTMLElement>('[data-dr-label]')
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-dr-clear]')
  const monthLabel = root.querySelector<HTMLElement>('[data-dr-month-label]')
  const monthPrev = root.querySelector<HTMLButtonElement>('[data-dr-month-prev]')
  const monthNext = root.querySelector<HTMLButtonElement>('[data-dr-month-next]')
  const grid = root.querySelector<HTMLElement>('[data-dr-grid]')

  const items = document.querySelectorAll(`${listSel} > li`)
  const activityCount = document.querySelector(countSel)
  const emptyState = document.querySelector(emptySel)
  const total = items.length

  if (
    !popover
    || !trigger
    || !labelEl
    || !clearBtn
    || !monthLabel
    || !monthPrev
    || !monthNext
    || !grid
    || !activityCount
    || !emptyState
  ) {
    return
  }

  const dom = {
    popover,
    trigger,
    labelEl,
    clearBtn,
    monthLabel,
    monthPrev,
    monthNext,
    grid,
    activityCount,
    emptyState,
  }

  let viewMonth = startOfMonth(new Date())
  let rangeFrom = ''
  let rangeTo = ''
  let awaitingTo = false

  let openSnapshot: RangeSnapshot = { from: '', to: '', awaiting: false }

  function readUrlRange(): { from: string, to: string } {
    const params = new URLSearchParams(window.location.search)
    const qFrom = params.get('from')
    const qTo = params.get('to')
    if (qFrom && qTo && YMD.test(qFrom) && YMD.test(qTo))
      return normalizeRange(qFrom, qTo)
    const dFrom = root.dataset.initialFrom || ''
    const dTo = root.dataset.initialTo || ''
    if (dFrom && dTo && YMD.test(dFrom) && YMD.test(dTo))
      return normalizeRange(dFrom, dTo)
    return { from: '', to: '' }
  }

  function applyFilter(from: string | null, to: string | null): void {
    let visible = 0
    items.forEach((li) => {
      const row = li as HTMLElement
      const date = row.getAttribute('data-date')
      if (!from || !to || (date && date >= from && date <= to)) {
        row.style.display = ''
        visible++
      }
      else {
        row.style.display = 'none'
      }
    })
    dom.activityCount.textContent = (from ? visible : total) + (visible === 1 ? ' activity' : ' activities')
    dom.emptyState.classList.toggle('hidden', visible > 0)
  }

  function syncUrl(from: string, to: string): void {
    if (from && to)
      history.replaceState(null, '', `?from=${from}&to=${to}`)
    else
      history.replaceState(null, '', window.location.pathname)
  }

  function updateTriggerEmptyState(): void {
    dom.trigger.dataset.empty = !rangeFrom || !rangeTo ? 'true' : 'false'
    dom.labelEl.textContent = formatRangeLabel(rangeFrom, rangeTo)
  }

  function applySnapshot(s: RangeSnapshot): void {
    rangeFrom = s.from
    rangeTo = s.to
    awaitingTo = s.awaiting
    if (!rangeFrom) {
      applyFilter(null, null)
      syncUrl('', '')
    }
    else if (awaitingTo) {
      applyFilter(rangeFrom, rangeFrom)
      syncUrl(rangeFrom, rangeFrom)
    }
    else {
      const n = normalizeRange(rangeFrom, rangeTo)
      applyFilter(n.from, n.to)
      syncUrl(n.from, n.to)
    }
    updateTriggerEmptyState()
    renderCalendar()
  }

  function setRange(from: string, to: string): void {
    const n = normalizeRange(from, to)
    let f = n.from
    let t = n.to
    if (todayCap && f)
      f = clampToMax(f, todayCap)
    if (todayCap && t)
      t = clampToMax(t, todayCap)
    if (f && t && f > t) {
      const x = f
      f = t
      t = x
    }
    rangeFrom = f
    rangeTo = t
    awaitingTo = Boolean(f && !t)

    if (f && t) {
      applyFilter(f, t)
      syncUrl(f, t)
    }
    else {
      applyFilter(null, null)
      syncUrl('', '')
    }
    updateTriggerEmptyState()
    renderCalendar()
  }

  function closePopover(): void {
    try {
      const p = dom.popover
      if ('hidePopover' in p && typeof p.hidePopover === 'function')
        p.hidePopover()
    }
    catch {
      /* noop */
    }
  }

  function positionPopoverNearTrigger(): void {
    const t = dom.trigger.getBoundingClientRect()
    const pad = 8
    const panelWidth = Math.min(window.innerWidth - 32, 20 * 16)
    let left = t.left
    const top = t.bottom + pad
    const maxLeft = window.innerWidth - panelWidth - 16
    if (left > maxLeft)
      left = Math.max(16, maxLeft)
    if (left < 16)
      left = 16
    dom.popover.style.top = `${top}px`
    dom.popover.style.left = `${left}px`
  }

  function onRepositionPopover(): void {
    if (dom.popover.matches(':popover-open'))
      positionPopoverNearTrigger()
  }

  function onEscape(ev: KeyboardEvent): void {
    if (ev.key !== 'Escape')
      return
    if (!dom.popover.matches(':popover-open'))
      return
    ev.preventDefault()
    applySnapshot(openSnapshot)
    closePopover()
  }

  function updatePresetActiveIndicators(): void {
    const capStr = todayCap || formatYmd(new Date())
    const weekR = rangeCurrentWeek(capStr)
    const monthR = rangeCurrentMonth(capStr)
    const prevR = rangePreviousMonth(capStr)
    const canMatch = !awaitingTo && Boolean(rangeFrom && rangeTo)
    const cur = canMatch ? normalizeRange(rangeFrom, rangeTo) : { from: '', to: '' }

    root.querySelectorAll<HTMLButtonElement>('[data-dr-preset]').forEach((btn) => {
      const kind = btn.dataset.drPreset
      let match = false
      if (canMatch) {
        if (kind === 'week')
          match = cur.from === weekR.from && cur.to === weekR.to
        else if (kind === 'month')
          match = cur.from === monthR.from && cur.to === monthR.to
        else if (kind === 'prev-month')
          match = cur.from === prevR.from && cur.to === prevR.to
      }
      if (match) {
        btn.dataset.active = 'true'
        btn.setAttribute('aria-pressed', 'true')
      }
      else {
        btn.removeAttribute('data-active')
        btn.removeAttribute('aria-pressed')
      }
    })
  }

  function renderCalendar(): void {
    const cap = todayCap ? parseYmd(todayCap) : null
    const first = startOfMonth(viewMonth)
    const last = endOfMonth(viewMonth)
    const gridStart = startOfWeek(first, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(last, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

    dom.monthLabel.textContent = format(first, 'MMMM yyyy')

    dom.grid.replaceChildren()
    const frag = document.createDocumentFragment()
    for (const d of days) {
      const ymd = formatYmd(d)
      const inMonth = d >= first && d <= last
      const isFuture = cap ? d > cap : false
      const isToday = todayCap ? ymd === todayCap : ymd === formatYmd(new Date())

      const hasFull = Boolean(rangeFrom && rangeTo)
      const isSingle = hasFull && rangeFrom === rangeTo
      const isLo = hasFull && ymd === rangeFrom
      const isHi = hasFull && ymd === rangeTo
      const isSpanMid = hasFull && !isSingle && ymd > rangeFrom && ymd < rangeTo
      const isRangeMid = !isFuture && isSpanMid
      const isRangeEndpoint = !isFuture && (
        (hasFull && (isLo || isHi))
        || (!hasFull && awaitingTo && ymd === rangeFrom)
      )

      const textCls = isRangeMid || isRangeEndpoint
        ? 'text-white'
        : (inMonth ? 'text-gray-900' : 'text-gray-400')

      let interactionCls = 'cursor-pointer hover:bg-gray-100'
      if (isFuture)
        interactionCls = 'cursor-not-allowed opacity-40'
      else if (isRangeMid)
        interactionCls = 'cursor-pointer hover:bg-gray-400'
      else if (isRangeEndpoint)
        interactionCls = 'cursor-pointer hover:bg-gray-800'

      let rangeShapeCls = ''
      if (isRangeMid) {
        rangeShapeCls = 'bg-gray-300'
      }
      else if (!isFuture && isSingle && hasFull && ymd === rangeFrom) {
        rangeShapeCls = 'bg-gray-900 font-medium'
      }
      else if (!isFuture && !isSingle && isLo) {
        rangeShapeCls = 'bg-gray-900 font-medium'
      }
      else if (!isFuture && !isSingle && isHi) {
        rangeShapeCls = 'bg-gray-900 font-medium'
      }
      else if (!isFuture && !hasFull && awaitingTo && ymd === rangeFrom) {
        rangeShapeCls = 'bg-gray-900 font-medium'
      }

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.dataset.date = ymd
      btn.textContent = String(d.getDate())
      btn.className = [
        'relative flex size-9 items-center justify-center rounded-none font-mono text-xs transition-colors',
        textCls,
        interactionCls,
        isToday ? 'ring-1 ring-gray-400 ring-inset' : '',
        rangeShapeCls,
      ].filter(Boolean).join(' ')

      if (isFuture) {
        btn.disabled = true
      }
      else {
        btn.addEventListener('click', () => onDayClick(ymd))
      }
      frag.appendChild(btn)
    }
    dom.grid.appendChild(frag)
    updatePresetActiveIndicators()
  }

  function onDayClick(ymd: string): void {
    if (todayCap && ymd > todayCap)
      return

    if (!rangeFrom || !awaitingTo) {
      rangeFrom = ymd
      rangeTo = ''
      awaitingTo = true
      applyFilter(rangeFrom, rangeFrom)
      syncUrl(rangeFrom, rangeFrom)
      updateTriggerEmptyState()
      renderCalendar()
      return
    }

    const b = ymd
    const a = rangeFrom
    const lo = a <= b ? a : b
    const hi = a <= b ? b : a
    let f = lo
    let t = hi
    if (todayCap) {
      f = clampToMax(f, todayCap)
      t = clampToMax(t, todayCap)
    }
    rangeFrom = f
    rangeTo = t
    awaitingTo = false
    applyFilter(f, t)
    syncUrl(f, t)
    updateTriggerEmptyState()
    renderCalendar()
    closePopover()
  }

  function applyPreset(kind: 'week' | 'month' | 'prev-month'): void {
    const capStr = todayCap || formatYmd(new Date())
    let from = ''
    let to = ''
    if (kind === 'week') {
      const r = rangeCurrentWeek(capStr)
      from = r.from
      to = r.to
    }
    else if (kind === 'month') {
      const r = rangeCurrentMonth(capStr)
      from = r.from
      to = r.to
    }
    else {
      const r = rangePreviousMonth(capStr)
      from = r.from
      to = r.to
    }
    setRange(from, to)
    const anchor = parseYmd(from)
    if (anchor)
      viewMonth = startOfMonth(anchor)
    renderCalendar()
    closePopover()
  }

  dom.clearBtn.addEventListener('click', () => {
    rangeFrom = ''
    rangeTo = ''
    awaitingTo = false
    setRange('', '')
    closePopover()
  })

  dom.monthPrev.addEventListener('click', () => {
    viewMonth = addMonths(viewMonth, -1)
    renderCalendar()
  })

  dom.monthNext.addEventListener('click', () => {
    viewMonth = addMonths(viewMonth, 1)
    if (todayCap) {
      const cap = parseYmd(todayCap)
      if (cap && startOfMonth(viewMonth) > startOfMonth(cap))
        viewMonth = startOfMonth(cap)
    }
    renderCalendar()
  })

  dom.trigger.addEventListener('click', () => {
    const n = normalizeRange(rangeFrom, rangeTo)
    if (n.from) {
      const anchor = parseYmd(n.from)
      if (anchor)
        viewMonth = startOfMonth(anchor)
    }
    else if (todayCap) {
      const cap = parseYmd(todayCap)
      if (cap)
        viewMonth = startOfMonth(cap)
    }
    else {
      viewMonth = startOfMonth(new Date())
    }
    renderCalendar()
  })

  /** Fires before the popover is shown so the first paint already has top/left set. */
  dom.popover.addEventListener('beforetoggle', (ev) => {
    const e = ev as ToggleEvent
    if (e.newState === 'open')
      positionPopoverNearTrigger()
  })

  dom.popover.addEventListener('toggle', (ev) => {
    const e = ev as ToggleEvent
    if (e.newState === 'open') {
      openSnapshot = { from: rangeFrom, to: rangeTo, awaiting: awaitingTo }
      positionPopoverNearTrigger()
      window.addEventListener('scroll', onRepositionPopover, true)
      window.addEventListener('resize', onRepositionPopover)
      window.addEventListener('keydown', onEscape, true)
    }
    else {
      window.removeEventListener('scroll', onRepositionPopover, true)
      window.removeEventListener('resize', onRepositionPopover)
      window.removeEventListener('keydown', onEscape, true)
    }
  })

  root.querySelectorAll<HTMLButtonElement>('[data-dr-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.drPreset
      if (kind === 'week' || kind === 'month' || kind === 'prev-month')
        applyPreset(kind)
    })
  })

  const initial = readUrlRange()
  if (initial.from && initial.to) {
    rangeFrom = initial.from
    rangeTo = initial.to
    awaitingTo = false
    const anchor = parseYmd(initial.from)
    if (anchor)
      viewMonth = startOfMonth(anchor)
    applyFilter(initial.from, initial.to)
    syncUrl(initial.from, initial.to)
  }
  else {
    rangeFrom = ''
    rangeTo = ''
    awaitingTo = false
    applyFilter(null, null)
  }
  updateTriggerEmptyState()
  renderCalendar()
}
