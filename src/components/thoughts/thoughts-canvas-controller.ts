interface Cleanup {
  destroy: () => void
}

const viewportKey = '__thoughtsCanvasCleanup' as const

/** Shared by wheel and +/- buttons: min 50%, max 150% */
export const THOUGHTS_CANVAS_SCALE_MIN = 0.5
export const THOUGHTS_CANVAS_SCALE_MAX = 1.5

const ZOOM_STEP_RATIO = 1.25

/** Exponential zoom sensitivity (larger = more zoom for same delta) */
const WHEEL_ZOOM_SENSITIVITY = 0.0035

export interface ThoughtsCanvasChromeOptions {
  zoomOutBtn?: HTMLButtonElement | null
  zoomInBtn?: HTMLButtonElement | null
  zoomLevelEl?: HTMLElement | null
  resetBtn?: HTMLButtonElement | null
  editBtn?: HTMLButtonElement | null
  saveBtn?: HTMLButtonElement | null
  editStatusEl?: HTMLElement | null
  enableEditing?: boolean
  initialScale?: number
}

function normalizeWheelDelta(delta: number, deltaMode: number): number {
  if (deltaMode === 1)
    return delta * 16
  if (deltaMode === 2)
    return delta * 120
  return delta
}

const CARD_SELECTOR = '.thought-canvas-card[data-slug]'

const CARD_MIN_W = 200
const CARD_MIN_H = 120
const CARD_MAX_W = 560
const CARD_MAX_H = 720

/** Clicking a card pin walks through these, then back to unpinned. */
const PIN_EMOJIS = ['📌', '📍', '⭐', '❤️', '✨'] as const

const PIN_DEFAULT_OFFSET = 8
const PIN_SIZE = 28

/** Below this movement a pin gesture counts as a click rather than a drag. */
const PIN_DRAG_THRESHOLD = 3

export interface ThoughtsCanvasView {
  cx: number
  cy: number
}

function parseCssPx(raw: string): number {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

/**
 * The canvas is unbounded, so a card's `left`/`top` *are* its stored coordinates
 * (negatives included). There is no origin to normalise against, which is what
 * keeps a saved layout pixel-identical to the one that was edited.
 *
 * `preferVisual` reads what is currently rendered instead of the dataset, which
 * matters while a pointer gesture is in flight.
 */
function readCardPos(card: HTMLElement, preferVisual = false): { x: number, y: number } {
  if (!preferVisual) {
    const dataX = Number.parseFloat(card.dataset.x ?? '')
    const dataY = Number.parseFloat(card.dataset.y ?? '')
    if (Number.isFinite(dataX) && Number.isFinite(dataY))
      return { x: dataX, y: dataY }
  }
  const rawX = card.style.getPropertyValue('--edit-x')
  const rawY = card.style.getPropertyValue('--edit-y')
  if (rawX && rawY)
    return { x: parseCssPx(rawX), y: parseCssPx(rawY) }
  const st = getComputedStyle(card)
  return { x: parseCssPx(st.left), y: parseCssPx(st.top) }
}

function readCardRotate(card: HTMLElement): number {
  return Number.parseFloat(card.dataset.rotate ?? '') || 0
}

function readCardZIndex(card: HTMLElement): number {
  return Number.parseInt(card.dataset.zIndex ?? '', 10) || 1
}

function readCardWidth(card: HTMLElement): number {
  const raw = card.style.getPropertyValue('--edit-w')
  if (raw)
    return parseCssPx(raw)
  const dataW = Number.parseFloat(card.dataset.width ?? '')
  if (Number.isFinite(dataW))
    return dataW
  return card.offsetWidth
}

function readCardHeight(card: HTMLElement): number {
  const raw = card.style.getPropertyValue('--edit-h')
  if (raw)
    return parseCssPx(raw)
  const dataH = Number.parseFloat(card.dataset.height ?? '')
  if (Number.isFinite(dataH))
    return dataH
  return card.offsetHeight
}

/** Dataset and CSS are written from the same rounded value so saving cannot drift. */
function setCardPos(card: HTMLElement, x: number, y: number) {
  const roundedX = Math.round(x * 100) / 100
  const roundedY = Math.round(y * 100) / 100
  card.dataset.x = String(roundedX)
  card.dataset.y = String(roundedY)
  card.style.setProperty('--edit-x', `${roundedX}px`)
  card.style.setProperty('--edit-y', `${roundedY}px`)
}

function setCardRotate(card: HTMLElement, rotateDeg: number) {
  card.dataset.rotate = String(rotateDeg)
  card.style.setProperty('--rotate-deg', `${rotateDeg}deg`)
}

function setCardZIndex(card: HTMLElement, zIndex: number) {
  card.dataset.zIndex = String(zIndex)
  card.style.zIndex = String(zIndex)
}

function setCardSize(card: HTMLElement, width: number, height: number) {
  card.dataset.width = String(width)
  card.dataset.height = String(height)
  card.style.setProperty('--edit-w', `${width}px`)
  card.style.setProperty('--edit-h', `${height}px`)
  card.style.width = `${width}px`
  card.style.height = `${height}px`
  card.style.maxHeight = `${height}px`
}

/**
 * The pin button always stays in the DOM: with an emoji it is the visible pin,
 * without one it is the faded placeholder that only shows for the selected card
 * while editing (see the `[data-empty]` rules in thoughts.astro).
 */
function pinElement(card: HTMLElement): HTMLButtonElement {
  const existing = card.querySelector<HTMLButtonElement>('.thought-canvas-pin')
  if (existing)
    return existing
  const pin = document.createElement('button')
  pin.type = 'button'
  pin.className = 'thought-canvas-pin absolute z-[80] select-none text-2xl leading-none drop-shadow-sm'
  card.prepend(pin)
  return pin
}

function setCardPin(card: HTMLElement, emoji: string | null) {
  const pin = pinElement(card)
  if (emoji) {
    card.dataset.pinEmoji = emoji
    pin.dataset.empty = 'false'
    pin.textContent = emoji
    pin.setAttribute('aria-label', 'Pinned thought')
    return
  }
  delete card.dataset.pinEmoji
  pin.dataset.empty = 'true'
  pin.textContent = PIN_EMOJIS[0]
  pin.setAttribute('aria-label', 'Pin this thought')
}

function readPinPos(card: HTMLElement): { x: number, y: number } {
  const x = Number.parseFloat(card.dataset.pinX ?? '')
  const y = Number.parseFloat(card.dataset.pinY ?? '')
  return {
    x: Number.isFinite(x) ? x : PIN_DEFAULT_OFFSET,
    y: Number.isFinite(y) ? y : PIN_DEFAULT_OFFSET,
  }
}

/** Keeps the pin inside the card, since the card clips its overflow. */
function setPinPos(card: HTMLElement, x: number, y: number) {
  const maxX = Math.max(0, readCardWidth(card) - PIN_SIZE)
  const maxY = Math.max(0, readCardHeight(card) - PIN_SIZE)
  const clampedX = Math.round(Math.min(maxX, Math.max(0, x)))
  const clampedY = Math.round(Math.min(maxY, Math.max(0, y)))
  card.dataset.pinX = String(clampedX)
  card.dataset.pinY = String(clampedY)
  const pin = pinElement(card)
  pin.style.left = `${clampedX}px`
  pin.style.top = `${clampedY}px`
}

function nextPinEmoji(current: string | undefined): string | null {
  if (!current)
    return PIN_EMOJIS[0]
  const idx = PIN_EMOJIS.indexOf(current as typeof PIN_EMOJIS[number])
  if (idx < 0)
    return PIN_EMOJIS[0]
  return PIN_EMOJIS[idx + 1] ?? null
}

export function initThoughtsCanvas(
  viewport: HTMLElement,
  world: HTMLElement,
  chrome?: ThoughtsCanvasChromeOptions,
): Cleanup {
  const prev = (viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey]
  prev?.destroy()

  const defaultScale = chrome?.initialScale ?? 1
  let scale = defaultScale
  let tx = 0
  let ty = 0
  let dragging = false
  let pointerDown = false
  let lastX = 0
  let lastY = 0
  let rafId = 0
  /** Last pointer position in viewport (used for +/- zooming around "current mouse area") */
  let hoverMx = 0
  let hoverMy = 0
  let hasHover = false
  let editMode = false
  let selectedCard: HTMLElement | null = null
  let saveState: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' = 'idle'
  let isDestroyed = false
  let savedResetTimer = 0
  let viewDirty = false

  let cardDrag: {
    card: HTMLElement
    pointerId: number
    x: number
    y: number
    lastX: number
    lastY: number
  } | null = null
  let cardRotateDrag: {
    card: HTMLElement
    handle: HTMLElement
    pointerId: number
    startPointerAngle: number
    startRotate: number
  } | null = null
  let cardResizeDrag: {
    card: HTMLElement
    handle: HTMLElement
    pointerId: number
    originW: number
    originH: number
    startClientX: number
    startClientY: number
  } | null = null
  let pinDrag: {
    card: HTMLElement
    pin: HTMLElement
    pointerId: number
    originX: number
    originY: number
    startClientX: number
    startClientY: number
    moved: boolean
  } | null = null

  function canEditLayout() {
    return Boolean(chrome?.enableEditing && window.matchMedia('(min-width: 768px)').matches)
  }

  function cardElements() {
    return [...world.querySelectorAll<HTMLElement>(CARD_SELECTOR)]
  }

  function cardBox(card: HTMLElement) {
    const { x, y } = readCardPos(card, true)
    return { minX: x, minY: y, maxX: x + readCardWidth(card), maxY: y + readCardHeight(card) }
  }

  /**
   * What the default view is centered on: the newest thought, falling back to every
   * card. Cards can be thousands of pixels apart, so fitting the whole spread would
   * leave the newest thought off-screen.
   *
   * Cached because `syncChrome` consults it on every pan/zoom frame and measuring
   * cards forces a style recalc.
   */
  let cachedViewTarget: { minX: number, minY: number, maxX: number, maxY: number } | null | undefined

  function invalidateViewTarget() {
    cachedViewTarget = undefined
  }

  function viewTarget() {
    if (cachedViewTarget !== undefined)
      return cachedViewTarget
    const focus = world.querySelector<HTMLElement>(`${CARD_SELECTOR}[data-canvas-focus]`)
    if (focus) {
      cachedViewTarget = cardBox(focus)
      return cachedViewTarget
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const card of cardElements()) {
      const box = cardBox(card)
      minX = Math.min(minX, box.minX)
      minY = Math.min(minY, box.minY)
      maxX = Math.max(maxX, box.maxX)
      maxY = Math.max(maxY, box.maxY)
    }
    cachedViewTarget = Number.isFinite(minX) && Number.isFinite(minY) ? { minX, minY, maxX, maxY } : null
    return cachedViewTarget
  }

  function flushTransform() {
    world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
  }

  /** While authoring, the framing is part of the layout, so panning counts as an edit. */
  function markViewDirty() {
    if (!editMode)
      return
    if (saveState !== 'dirty')
      markDirty()
    viewDirty = true
  }

  let cachedViewportRect: DOMRect | undefined

  function onResize() {
    cachedViewportRect = undefined
    // Crossing the md breakpoint swaps which coordinate custom property applies.
    invalidateViewTarget()
    if (!canEditLayout() && editMode)
      setEditMode(false)
    else
      syncChrome()
  }

  function viewportRect() {
    if (!cachedViewportRect)
      cachedViewportRect = viewport.getBoundingClientRect()
    return cachedViewportRect
  }

  function setHoverFromClient(clientX: number, clientY: number) {
    const rect = viewportRect()
    hoverMx = clientX - rect.left
    hoverMy = clientY - rect.top
    hasHover = Number.isFinite(hoverMx) && Number.isFinite(hoverMy)
  }

  function hoverAnchor(): { mx: number, my: number } {
    const rect = viewportRect()
    if (hasHover) {
      return {
        mx: Math.min(rect.width, Math.max(0, hoverMx)),
        my: Math.min(rect.height, Math.max(0, hoverMy)),
      }
    }
    return { mx: rect.width / 2, my: rect.height / 2 }
  }

  /** Translate that puts a canvas point in the middle of the viewport. */
  function translateToCenter(cx: number, cy: number, atScale: number) {
    const vr = viewportRect()
    return { x: vr.width / 2 - cx * atScale, y: vr.height / 2 - cy * atScale }
  }

  function centerTranslate(atScale: number) {
    const box = viewTarget()
    if (!box)
      return { x: 0, y: 0 }
    return translateToCenter((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, atScale)
  }

  function isDefaultView() {
    if (Math.abs(scale - defaultScale) > 0.002)
      return false
    const want = centerTranslate(defaultScale)
    return Math.abs(tx - want.x) < 0.75 && Math.abs(ty - want.y) < 0.75
  }

  /** Current canvas framing center (world coords), for the layout file. */
  function currentView(): ThoughtsCanvasView | null {
    const vr = viewportRect()
    if (vr.width <= 0 || vr.height <= 0)
      return null
    return {
      cx: Math.round(((vr.width / 2 - tx) / scale) * 100) / 100,
      cy: Math.round(((vr.height / 2 - ty) / scale) * 100) / 100,
    }
  }

  function savedView(): ThoughtsCanvasView | null {
    const cx = Number.parseFloat(world.dataset.viewCx ?? '')
    const cy = Number.parseFloat(world.dataset.viewCy ?? '')
    if (![cx, cy].every(Number.isFinite))
      return null
    return { cx, cy }
  }

  function applySavedView(): boolean {
    const view = savedView()
    if (!view)
      return false
    const want = translateToCenter(view.cx, view.cy, scale)
    tx = want.x
    ty = want.y
    return true
  }

  function syncChrome() {
    const c = chrome
    if (!c)
      return
    if (c.zoomLevelEl)
      c.zoomLevelEl.textContent = `${Math.round(scale * 100)}%`
    if (c.zoomOutBtn)
      c.zoomOutBtn.disabled = scale <= THOUGHTS_CANVAS_SCALE_MIN + 0.002
    if (c.zoomInBtn)
      c.zoomInBtn.disabled = scale >= THOUGHTS_CANVAS_SCALE_MAX - 0.002
    if (c.resetBtn)
      c.resetBtn.disabled = isDefaultView()
    if (c.editBtn) {
      c.editBtn.disabled = !canEditLayout()
      c.editBtn.setAttribute('aria-pressed', editMode ? 'true' : 'false')
      c.editBtn.classList.toggle('bg-gray-900', editMode)
      c.editBtn.classList.toggle('text-white', editMode)
      c.editBtn.classList.toggle('hover:bg-gray-800', editMode)
      c.editBtn.textContent = !editMode ? 'Edit' : 'Done'
    }
    const showEdit = canEditLayout() && (!editMode || saveState === 'idle')
    const showSave = canEditLayout() && editMode && (saveState === 'dirty' || saveState === 'error')
    const showStatus = canEditLayout() && editMode && (saveState === 'saving' || saveState === 'saved')

    if (c.editBtn)
      c.editBtn.classList.toggle('hidden', !showEdit)
    if (c.saveBtn) {
      c.saveBtn.classList.toggle('hidden', !showSave)
      c.saveBtn.disabled = !showSave || saveState === 'saving'
      c.saveBtn.textContent = saveState === 'error' ? 'Retry' : 'Save'
    }
    if (c.editStatusEl) {
      c.editStatusEl.classList.toggle('hidden', !showStatus)
      c.editStatusEl.classList.toggle('flex', showStatus)
      c.editStatusEl.textContent = {
        idle: '',
        dirty: '',
        saving: 'Saving',
        saved: 'Saved',
        error: '',
      }[saveState]
    }
  }

  function flushNow() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    flushTransform()
    syncChrome()
  }

  function scheduleFlush() {
    if (rafId)
      return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      flushTransform()
      syncChrome()
    })
  }

  /**
   * Zoom anchored at a point (mx, my) in viewport.
   * Relies on world having `transform-origin: 0 0` and `translate3d(tx,ty,0) scale(s)`.
   */
  function setScaleAroundScreenPoint(mx: number, my: number, nextScale: number) {
    const clamped = Math.min(THOUGHTS_CANVAS_SCALE_MAX, Math.max(THOUGHTS_CANVAS_SCALE_MIN, nextScale))
    const wx = (mx - tx) / scale
    const wy = (my - ty) / scale
    scale = clamped
    tx = mx - wx * scale
    ty = my - wy * scale
    flushNow()
    markViewDirty()
  }

  function recenterContentInViewport() {
    const want = centerTranslate(scale)
    tx = want.x
    ty = want.y
  }

  /**
   * The saved view is the source of truth, so it is recomputed here rather than
   * adopted from the pre-paint transform: that script only exists to avoid a flash,
   * and trusting its measurement is how a per-reload drift creeps in.
   */
  function applyInitialView() {
    if (!applySavedView())
      recenterContentInViewport()
  }

  function initialiseView() {
    const vr = viewportRect()
    if (vr.width <= 0 || vr.height <= 0) {
      // Canvas is not laid out yet (still hidden): position once it has a size.
      requestAnimationFrame(() => {
        if (isDestroyed)
          return
        cachedViewportRect = undefined
        applyInitialView()
        flushNow()
      })
      return
    }
    applyInitialView()
    flushNow()
  }

  /** If wheel should be consumed by an internal scrollable area (like card content), don't preventDefault to avoid breaking scrolling */
  function wheelShouldPassToScrollableTarget(el: EventTarget | null, e: WheelEvent): boolean {
    let node = el instanceof HTMLElement ? el : null
    while (node && viewport.contains(node)) {
      if (node === viewport)
        break
      if (node.scrollHeight > node.clientHeight + 1) {
        const st = getComputedStyle(node)
        const oy = st.overflowY
        const canScrollY = oy === 'auto' || oy === 'scroll'
        if (canScrollY) {
          const dy = e.deltaY
          if (dy > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1)
            return true
          if (dy < 0 && node.scrollTop > 0)
            return true
        }
      }
      node = node.parentElement
    }
    return false
  }

  function onWheel(e: WheelEvent) {
    // CTRL+Wheel => zoom.
    // Otherwise => behave like vertical scroll/pan (cards can still scroll via wheelShouldPassToScrollableTarget()).
    if (!e.ctrlKey) {
      if (wheelShouldPassToScrollableTarget(e.target, e))
        return
      e.preventDefault()
      tx -= normalizeWheelDelta(e.deltaX, e.deltaMode)
      ty -= normalizeWheelDelta(e.deltaY, e.deltaMode)
      scheduleFlush()
      markViewDirty()
      return
    }

    e.preventDefault()
    const rect = viewportRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    hoverMx = mx
    hoverMy = my
    hasHover = true
    const dy = normalizeWheelDelta(e.deltaY, e.deltaMode)
    const factor = Math.exp(-dy * WHEEL_ZOOM_SENSITIVITY)
    const nextScale = Math.min(
      THOUGHTS_CANVAS_SCALE_MAX,
      Math.max(THOUGHTS_CANVAS_SCALE_MIN, scale * factor),
    )
    setScaleAroundScreenPoint(mx, my, nextScale)
  }

  function onZoomOutClick() {
    const { mx, my } = hoverAnchor()
    setScaleAroundScreenPoint(mx, my, scale / ZOOM_STEP_RATIO)
  }

  function onZoomInClick() {
    const { mx, my } = hoverAnchor()
    setScaleAroundScreenPoint(mx, my, scale * ZOOM_STEP_RATIO)
  }

  function onResetClick() {
    scale = defaultScale
    recenterContentInViewport()
    flushNow()
    markViewDirty()
  }

  function maxStackZIndex(): number {
    let max = 0
    for (const el of cardElements()) {
      max = Math.max(max, readCardZIndex(el))
    }
    return max
  }

  function bringToFront(el: HTMLElement): boolean {
    const current = readCardZIndex(el)
    const max = maxStackZIndex()
    if (current >= max)
      return false
    setCardZIndex(el, max + 1)
    return true
  }

  function focusCard(card: HTMLElement) {
    bringToFront(card)
    const pos = readCardPos(card, true)
    const cx = pos.x + readCardWidth(card) / 2
    const cy = pos.y + readCardHeight(card) / 2
    const vr = viewportRect()
    tx = vr.width / 2 - cx * scale
    ty = vr.height / 2 - cy * scale
    flushNow()
    card.setAttribute('data-pin-focus', 'true')
    window.setTimeout(() => card.removeAttribute('data-pin-focus'), 900)
  }

  function selectCard(card: HTMLElement | null, bumpZ = true) {
    if (selectedCard === card)
      return
    selectedCard?.removeAttribute('data-selected')
    selectedCard = card
    selectedCard?.setAttribute('data-selected', 'true')
    if (selectedCard && bumpZ && bringToFront(selectedCard))
      markDirty()
    syncChrome()
  }

  function setEditMode(next: boolean) {
    if (next && !canEditLayout())
      return
    editMode = next
    if (!editMode) {
      if (savedResetTimer) {
        window.clearTimeout(savedResetTimer)
        savedResetTimer = 0
      }
      saveState = 'idle'
    }
    viewport.closest<HTMLElement>('#thoughts-root')?.setAttribute('data-edit-mode', editMode ? 'true' : 'false')
    if (editMode) {
      selectCard(selectedCard ?? world.querySelector<HTMLElement>(CARD_SELECTOR), false)
    }
    else {
      selectCard(null)
    }
    syncChrome()
  }

  interface LayoutPayloadCard {
    x: number
    y: number
    rotateDeg: number
    zIndex: number
    width: number
    height: number
    pin?: string
    pinX?: number
    pinY?: number
  }

  function readLayoutPayload() {
    const cards: Record<string, LayoutPayloadCard> = {}
    for (const card of cardElements()) {
      const slug = card.dataset.slug
      if (!slug)
        continue
      const pos = readCardPos(card)
      const row: LayoutPayloadCard = {
        x: pos.x,
        y: pos.y,
        rotateDeg: readCardRotate(card),
        zIndex: readCardZIndex(card),
        width: readCardWidth(card),
        height: readCardHeight(card),
      }
      if (card.dataset.pinEmoji) {
        const pin = readPinPos(card)
        row.pin = card.dataset.pinEmoji
        row.pinX = pin.x
        row.pinY = pin.y
      }
      cards[slug] = row
    }
    const payload: { version: 1, view?: ThoughtsCanvasView, cards: Record<string, LayoutPayloadCard> } = {
      version: 1 as const,
      cards,
    }
    if (viewDirty) {
      const view = currentView()
      if (view)
        payload.view = view
    }
    return payload
  }

  async function saveLayout() {
    if (!canEditLayout())
      return
    saveState = 'saving'
    syncChrome()
    try {
      const res = await fetch('/__thoughts-canvas-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readLayoutPayload()),
      })
      if (isDestroyed)
        return
      if (!res.ok)
        throw new Error(`Save failed: ${res.status}`)
      const saved = await res.json()
      if (isDestroyed)
        return
      if (saved?.layout?.cards) {
        for (const card of cardElements()) {
          const slug = card.dataset.slug
          const row = slug ? saved.layout.cards[slug] : undefined
          if (!row)
            continue
          setCardPos(card, row.x, row.y)
          setCardRotate(card, row.rotateDeg)
          if (Number.isFinite(row.zIndex))
            setCardZIndex(card, row.zIndex)
          if (Number.isFinite(row.width) && Number.isFinite(row.height))
            setCardSize(card, row.width, row.height)
          const pinEmoji = typeof row.pin === 'string' && row.pin ? row.pin : null
          setCardPin(card, pinEmoji)
          if (pinEmoji)
            setPinPos(card, row.pinX ?? PIN_DEFAULT_OFFSET, row.pinY ?? PIN_DEFAULT_OFFSET)
        }
        invalidateViewTarget()
      }
      if (saved?.layout?.view) {
        world.dataset.viewCx = String(saved.layout.view.cx)
        world.dataset.viewCy = String(saved.layout.view.cy)
      }
      viewDirty = false
      saveState = 'saved'
      if (savedResetTimer)
        window.clearTimeout(savedResetTimer)
      savedResetTimer = window.setTimeout(() => {
        savedResetTimer = 0
        if (isDestroyed || saveState !== 'saved')
          return
        saveState = 'idle'
        syncChrome()
      }, 1500)
    }
    catch {
      if (isDestroyed)
        return
      saveState = 'error'
    }
    if (isDestroyed)
      return
    syncChrome()
  }

  function markDirty() {
    if (!canEditLayout())
      return
    saveState = 'dirty'
    syncChrome()
  }

  /** Walks 📌 → 📍 → ⭐ → ❤️ → ✨ → unpinned, so one control both sets and clears. */
  function cycleCardPin(card: HTMLElement) {
    const next = nextPinEmoji(card.dataset.pinEmoji)
    setCardPin(card, next)
    if (next) {
      const pin = readPinPos(card)
      setPinPos(card, pin.x, pin.y)
    }
    bringToFront(card)
    markDirty()
  }

  function clampRotate(rotateDeg: number): number {
    return Math.max(-18, Math.min(18, rotateDeg))
  }

  function roundedRotate(rotateDeg: number): number {
    return Math.round(clampRotate(rotateDeg) * 100) / 100
  }

  function cardPointerAngle(card: HTMLElement, e: PointerEvent): number {
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
  }

  function onEditClick() {
    setEditMode(!editMode)
  }

  function onSaveClick() {
    void saveLayout()
  }

  function onWorldPointerDown(e: PointerEvent) {
    if (e.button !== 0)
      return

    const cardPin = (e.target as HTMLElement).closest<HTMLElement>('.thought-canvas-pin')
    if (cardPin) {
      const card = cardPin.closest('.thought-canvas-card')
      if (!card || !world.contains(card))
        return
      e.preventDefault()
      e.stopPropagation()
      const el = card as HTMLElement
      if (!editMode) {
        if (el.dataset.pinEmoji)
          focusCard(el)
        return
      }
      // Editing: dragging repositions the pin, a click without movement cycles it.
      selectCard(el, false)
      const origin = readPinPos(el)
      pinDrag = {
        card: el,
        pin: cardPin,
        pointerId: e.pointerId,
        originX: origin.x,
        originY: origin.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
        moved: false,
      }
      cardPin.setPointerCapture(e.pointerId)
      document.body.classList.add('select-none')
      cardPin.addEventListener('pointermove', onPinPointerMove)
      cardPin.addEventListener('pointerup', onPinPointerEnd)
      cardPin.addEventListener('pointercancel', onPinPointerEnd)
      return
    }

    if (!editMode)
      return

    const resizeHandle = (e.target as HTMLElement).closest<HTMLElement>('.thought-canvas-resize-handle')
    if (resizeHandle) {
      const card = resizeHandle.closest('.thought-canvas-card')
      if (!card || !world.contains(card))
        return
      e.preventDefault()
      e.stopPropagation()
      const el = card as HTMLElement
      selectCard(el)
      cardResizeDrag = {
        card: el,
        handle: resizeHandle,
        pointerId: e.pointerId,
        originW: readCardWidth(el),
        originH: readCardHeight(el),
        startClientX: e.clientX,
        startClientY: e.clientY,
      }
      resizeHandle.setPointerCapture(e.pointerId)
      resizeHandle.classList.add('cursor-nwse-resize')
      document.body.classList.add('select-none')
      resizeHandle.addEventListener('pointermove', onCardResizePointerMove)
      resizeHandle.addEventListener('pointerup', onCardResizePointerEnd)
      resizeHandle.addEventListener('pointercancel', onCardResizePointerEnd)
      return
    }
    const rotateHandle = (e.target as HTMLElement).closest<HTMLElement>('.thought-canvas-rotate-handle')
    if (rotateHandle) {
      const card = rotateHandle.closest('.thought-canvas-card')
      if (!card || !world.contains(card))
        return
      e.preventDefault()
      e.stopPropagation()
      const el = card as HTMLElement
      selectCard(el)
      cardRotateDrag = {
        card: el,
        handle: rotateHandle,
        pointerId: e.pointerId,
        startPointerAngle: cardPointerAngle(el, e),
        startRotate: readCardRotate(el),
      }
      rotateHandle.setPointerCapture(e.pointerId)
      rotateHandle.classList.add('cursor-grabbing')
      document.body.classList.add('select-none')
      rotateHandle.addEventListener('pointermove', onCardRotatePointerMove)
      rotateHandle.addEventListener('pointerup', onCardRotatePointerEnd)
      rotateHandle.addEventListener('pointercancel', onCardRotatePointerEnd)
      return
    }
    const card = (e.target as HTMLElement).closest('.thought-canvas-card')
    if (!card || !world.contains(card))
      return
    e.stopPropagation()
    const el = card as HTMLElement
    selectCard(el)
    const pos = readCardPos(el, true)
    setCardPos(el, pos.x, pos.y)
    cardDrag = {
      card: el,
      pointerId: e.pointerId,
      x: pos.x,
      y: pos.y,
      lastX: e.clientX,
      lastY: e.clientY,
    }
    el.setPointerCapture(e.pointerId)
    el.classList.add('shadow-lg', 'cursor-grabbing')
    document.body.classList.add('select-none')
    el.addEventListener('pointermove', onCardPointerMove)
    el.addEventListener('pointerup', onCardPointerEnd)
    el.addEventListener('pointercancel', onCardPointerEnd)
  }

  function onCardPointerMove(e: PointerEvent) {
    if (!cardDrag || e.pointerId !== cardDrag.pointerId)
      return
    const dx = (e.clientX - cardDrag.lastX) / scale
    const dy = (e.clientY - cardDrag.lastY) / scale
    cardDrag.x += dx
    cardDrag.y += dy
    cardDrag.lastX = e.clientX
    cardDrag.lastY = e.clientY
    setCardPos(cardDrag.card, cardDrag.x, cardDrag.y)
    invalidateViewTarget()
  }

  function onCardPointerEnd(e: PointerEvent) {
    if (!cardDrag || e.pointerId !== cardDrag.pointerId)
      return
    const c = cardDrag.card
    c.removeEventListener('pointermove', onCardPointerMove)
    c.removeEventListener('pointerup', onCardPointerEnd)
    c.removeEventListener('pointercancel', onCardPointerEnd)
    if (c.hasPointerCapture(e.pointerId))
      c.releasePointerCapture(e.pointerId)
    cardDrag = null
    c.classList.remove('shadow-lg', 'cursor-grabbing')
    bringToFront(c)
    if (!dragging)
      document.body.classList.remove('select-none')
    markDirty()
  }

  function onPinPointerMove(e: PointerEvent) {
    if (!pinDrag || e.pointerId !== pinDrag.pointerId)
      return
    const dx = (e.clientX - pinDrag.startClientX) / scale
    const dy = (e.clientY - pinDrag.startClientY) / scale
    if (!pinDrag.moved && Math.abs(dx) < PIN_DRAG_THRESHOLD && Math.abs(dy) < PIN_DRAG_THRESHOLD)
      return
    // A drag on an unpinned placeholder should leave a real pin behind.
    if (!pinDrag.moved) {
      pinDrag.moved = true
      if (!pinDrag.card.dataset.pinEmoji)
        setCardPin(pinDrag.card, PIN_EMOJIS[0])
    }
    setPinPos(pinDrag.card, pinDrag.originX + dx, pinDrag.originY + dy)
  }

  function onPinPointerEnd(e: PointerEvent) {
    if (!pinDrag || e.pointerId !== pinDrag.pointerId)
      return
    const { card, pin, moved } = pinDrag
    pin.removeEventListener('pointermove', onPinPointerMove)
    pin.removeEventListener('pointerup', onPinPointerEnd)
    pin.removeEventListener('pointercancel', onPinPointerEnd)
    if (pin.hasPointerCapture(e.pointerId))
      pin.releasePointerCapture(e.pointerId)
    pinDrag = null
    if (!dragging && !cardDrag)
      document.body.classList.remove('select-none')
    if (moved) {
      bringToFront(card)
      markDirty()
      return
    }
    cycleCardPin(card)
  }

  function onCardResizePointerMove(e: PointerEvent) {
    if (!cardResizeDrag || e.pointerId !== cardResizeDrag.pointerId)
      return
    const dx = (e.clientX - cardResizeDrag.startClientX) / scale
    const dy = (e.clientY - cardResizeDrag.startClientY) / scale
    const nextW = Math.round(Math.min(CARD_MAX_W, Math.max(CARD_MIN_W, cardResizeDrag.originW + dx)))
    const nextH = Math.round(Math.min(CARD_MAX_H, Math.max(CARD_MIN_H, cardResizeDrag.originH + dy)))
    setCardSize(cardResizeDrag.card, nextW, nextH)
    invalidateViewTarget()
  }

  function onCardResizePointerEnd(e: PointerEvent) {
    if (!cardResizeDrag || e.pointerId !== cardResizeDrag.pointerId)
      return
    const handle = cardResizeDrag.handle
    handle.removeEventListener('pointermove', onCardResizePointerMove)
    handle.removeEventListener('pointerup', onCardResizePointerEnd)
    handle.removeEventListener('pointercancel', onCardResizePointerEnd)
    if (handle.hasPointerCapture(e.pointerId))
      handle.releasePointerCapture(e.pointerId)
    handle.classList.remove('cursor-nwse-resize')
    bringToFront(cardResizeDrag.card)
    cardResizeDrag = null
    if (!dragging && !cardDrag)
      document.body.classList.remove('select-none')
    markDirty()
  }

  function onCardRotatePointerMove(e: PointerEvent) {
    if (!cardRotateDrag || e.pointerId !== cardRotateDrag.pointerId)
      return
    const next = cardRotateDrag.startRotate + cardPointerAngle(cardRotateDrag.card, e) - cardRotateDrag.startPointerAngle
    setCardRotate(cardRotateDrag.card, roundedRotate(next))
  }

  function onCardRotatePointerEnd(e: PointerEvent) {
    if (!cardRotateDrag || e.pointerId !== cardRotateDrag.pointerId)
      return
    const handle = cardRotateDrag.handle
    handle.removeEventListener('pointermove', onCardRotatePointerMove)
    handle.removeEventListener('pointerup', onCardRotatePointerEnd)
    handle.removeEventListener('pointercancel', onCardRotatePointerEnd)
    if (handle.hasPointerCapture(e.pointerId))
      handle.releasePointerCapture(e.pointerId)
    handle.classList.remove('cursor-grabbing')
    bringToFront(cardRotateDrag.card)
    cardRotateDrag = null
    if (!dragging && !cardDrag && !cardResizeDrag)
      document.body.classList.remove('select-none')
    markDirty()
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0)
      return

    const target = e.target as HTMLElement
    if (editMode && target.closest('.thought-canvas-card'))
      return
    if (target.closest('.thought-canvas-pin'))
      return

    const onInteractive = target.closest(
      'a, button, input, textarea, select, img, [contenteditable="true"], [data-lightbox="true"]',
    )
    if (onInteractive)
      return

    pointerDown = true
    lastX = e.clientX
    lastY = e.clientY
    setHoverFromClient(e.clientX, e.clientY)
  }

  function onMove(e: PointerEvent) {
    setHoverFromClient(e.clientX, e.clientY)

    if (!pointerDown)
      return

    if (!dragging) {
      const dx = Math.abs(e.clientX - lastX)
      const dy = Math.abs(e.clientY - lastY)
      if (dx > 3 || dy > 3) {
        // Double check if a text selection somehow started (e.g. on touch devices via long press)
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) {
          pointerDown = false
          return
        }
        dragging = true
        viewport.setPointerCapture(e.pointerId)
        viewport.classList.add('cursor-grabbing')
        document.body.classList.add('select-none')
      }
      else {
        return
      }
    }

    tx += e.clientX - lastX
    ty += e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    scheduleFlush()
  }

  function onUp(e: PointerEvent) {
    pointerDown = false
    if (dragging) {
      dragging = false
      viewport.classList.remove('cursor-grabbing')
      flushNow()
      if (viewport.hasPointerCapture(e.pointerId)) {
        viewport.releasePointerCapture(e.pointerId)
      }
      if (!cardDrag)
        document.body.classList.remove('select-none')
    }
  }

  viewport.style.touchAction = 'none'
  viewport.addEventListener('wheel', onWheel, { passive: false })
  world.addEventListener('pointerdown', onWorldPointerDown)
  viewport.addEventListener('pointerdown', onDown)
  viewport.addEventListener('pointermove', onMove)
  viewport.addEventListener('pointerup', onUp)
  viewport.addEventListener('pointercancel', onUp)
  window.addEventListener('resize', onResize)

  scale = defaultScale
  initialiseView()
  {
    const rect = viewportRect()
    hoverMx = rect.width / 2
    hoverMy = rect.height / 2
    hasHover = false
  }

  chrome?.zoomOutBtn?.addEventListener('click', onZoomOutClick)
  chrome?.zoomInBtn?.addEventListener('click', onZoomInClick)
  chrome?.resetBtn?.addEventListener('click', onResetClick)
  chrome?.editBtn?.addEventListener('click', onEditClick)
  chrome?.saveBtn?.addEventListener('click', onSaveClick)

  const cleanup: Cleanup = {
    destroy() {
      isDestroyed = true
      if (savedResetTimer) {
        window.clearTimeout(savedResetTimer)
        savedResetTimer = 0
      }
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      if (cardDrag) {
        const c = cardDrag.card
        const pid = cardDrag.pointerId
        c.removeEventListener('pointermove', onCardPointerMove)
        c.removeEventListener('pointerup', onCardPointerEnd)
        c.removeEventListener('pointercancel', onCardPointerEnd)
        if (c.hasPointerCapture(pid))
          c.releasePointerCapture(pid)
        c.classList.remove('shadow-lg', 'cursor-grabbing')
        cardDrag = null
      }
      if (cardResizeDrag) {
        const handle = cardResizeDrag.handle
        const pid = cardResizeDrag.pointerId
        handle.removeEventListener('pointermove', onCardResizePointerMove)
        handle.removeEventListener('pointerup', onCardResizePointerEnd)
        handle.removeEventListener('pointercancel', onCardResizePointerEnd)
        if (handle.hasPointerCapture(pid))
          handle.releasePointerCapture(pid)
        handle.classList.remove('cursor-nwse-resize')
        cardResizeDrag = null
      }
      if (pinDrag) {
        const pin = pinDrag.pin
        const pid = pinDrag.pointerId
        pin.removeEventListener('pointermove', onPinPointerMove)
        pin.removeEventListener('pointerup', onPinPointerEnd)
        pin.removeEventListener('pointercancel', onPinPointerEnd)
        if (pin.hasPointerCapture(pid))
          pin.releasePointerCapture(pid)
        pinDrag = null
      }
      if (cardRotateDrag) {
        const handle = cardRotateDrag.handle
        const pid = cardRotateDrag.pointerId
        handle.removeEventListener('pointermove', onCardRotatePointerMove)
        handle.removeEventListener('pointerup', onCardRotatePointerEnd)
        handle.removeEventListener('pointercancel', onCardRotatePointerEnd)
        if (handle.hasPointerCapture(pid))
          handle.releasePointerCapture(pid)
        handle.classList.remove('cursor-grabbing')
        cardRotateDrag = null
      }
      dragging = false
      setEditMode(false)
      viewport.classList.remove('cursor-grabbing')
      document.body.classList.remove('select-none')
      viewport.removeEventListener('wheel', onWheel)
      world.removeEventListener('pointerdown', onWorldPointerDown)
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
      window.removeEventListener('resize', onResize)
      chrome?.zoomOutBtn?.removeEventListener('click', onZoomOutClick)
      chrome?.zoomInBtn?.removeEventListener('click', onZoomInClick)
      chrome?.resetBtn?.removeEventListener('click', onResetClick)
      chrome?.editBtn?.removeEventListener('click', onEditClick)
      chrome?.saveBtn?.removeEventListener('click', onSaveClick)
      viewport.style.touchAction = ''
      delete (viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey]
      world.style.transform = ''
    },
  }
  ;(viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey] = cleanup
  return cleanup
}
