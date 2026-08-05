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
  rotateLeftBtn?: HTMLButtonElement | null
  rotateRightBtn?: HTMLButtonElement | null
  saveBtn?: HTMLButtonElement | null
  editStatusEl?: HTMLElement | null
  enableEditing?: boolean
  initialScale?: number
}

function normalizeWheelDeltaY(e: WheelEvent): number {
  let dy = e.deltaY
  if (e.deltaMode === 1)
    dy *= 16
  else if (e.deltaMode === 2)
    dy *= 120
  return dy
}

function parseCssPx(raw: string): number {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

function readCardX(card: HTMLElement): number {
  const raw = card.style.getPropertyValue('--edit-x')
  if (raw)
    return parseCssPx(raw)
  const dataX = Number.parseFloat(card.dataset.x ?? '')
  if (Number.isFinite(dataX))
    return dataX
  return parseCssPx(getComputedStyle(card).left)
}

function readCardY(card: HTMLElement): number {
  const raw = card.style.getPropertyValue('--edit-y')
  if (raw)
    return parseCssPx(raw)
  const dataY = Number.parseFloat(card.dataset.y ?? '')
  if (Number.isFinite(dataY))
    return dataY
  return parseCssPx(getComputedStyle(card).top)
}

function readCardRotate(card: HTMLElement): number {
  return Number.parseFloat(card.dataset.rotate ?? '') || 0
}

function setCardPosition(card: HTMLElement, x: number, y: number) {
  card.dataset.x = String(x)
  card.dataset.y = String(y)
  card.style.setProperty('--edit-x', `${x}px`)
  card.style.setProperty('--edit-y', `${y}px`)
}

function setCardRotate(card: HTMLElement, rotateDeg: number) {
  card.dataset.rotate = String(rotateDeg)
  card.style.setProperty('--rotate-deg', `${rotateDeg}deg`)
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

  function canEditLayout() {
    return Boolean(chrome?.enableEditing && window.matchMedia('(min-width: 768px)').matches)
  }

  function flushTransform() {
    world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
  }

  let cachedViewportRect: DOMRect | undefined

  function onResize() {
    cachedViewportRect = undefined
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

  function expectedCenterTranslate() {
    const vr = viewportRect()
    return {
      x: (vr.width - world.offsetWidth * defaultScale) / 2,
      y: (vr.height - world.offsetHeight * defaultScale) / 2,
    }
  }

  function isDefaultView() {
    if (Math.abs(scale - defaultScale) > 0.002)
      return false
    const want = expectedCenterTranslate()
    return Math.abs(tx - want.x) < 0.75 && Math.abs(ty - want.y) < 0.75
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
    }
    const editActionLocked = !canEditLayout() || !editMode || !selectedCard
    if (c.rotateLeftBtn)
      c.rotateLeftBtn.disabled = editActionLocked
    if (c.rotateRightBtn)
      c.rotateRightBtn.disabled = editActionLocked
    if (c.saveBtn)
      c.saveBtn.disabled = !canEditLayout() || !editMode || saveState === 'saving' || saveState === 'idle' || saveState === 'saved'
    if (c.editStatusEl) {
      c.editStatusEl.textContent = {
        idle: '',
        dirty: 'Unsaved',
        saving: 'Saving',
        saved: 'Saved',
        error: 'Save failed',
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
  }

  function recenterContentInViewport() {
    const vr = viewportRect()
    tx = (vr.width - world.offsetWidth * scale) / 2
    ty = (vr.height - world.offsetHeight * scale) / 2
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
    if (!e.ctrlKey && wheelShouldPassToScrollableTarget(e.target, e))
      return
    e.preventDefault()
    const rect = viewportRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    hoverMx = mx
    hoverMy = my
    hasHover = true
    const dy = normalizeWheelDeltaY(e)
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
  }

  function selectCard(card: HTMLElement | null) {
    if (selectedCard === card)
      return
    selectedCard?.removeAttribute('data-selected')
    selectedCard = card
    selectedCard?.setAttribute('data-selected', 'true')
    syncChrome()
  }

  function setEditMode(next: boolean) {
    if (next && !canEditLayout())
      return
    editMode = next
    viewport.closest<HTMLElement>('#thoughts-root')?.setAttribute('data-edit-mode', editMode ? 'true' : 'false')
    if (editMode) {
      selectCard(selectedCard ?? world.querySelector<HTMLElement>('.thought-canvas-card[data-slug]'))
    }
    else {
      selectCard(null)
    }
    syncChrome()
  }

  function readLayoutPayload() {
    const cards: Record<string, { x: number, y: number, rotateDeg: number }> = {}
    for (const card of world.querySelectorAll<HTMLElement>('.thought-canvas-card[data-slug]')) {
      const slug = card.dataset.slug
      if (!slug)
        continue
      cards[slug] = {
        x: readCardX(card),
        y: readCardY(card),
        rotateDeg: readCardRotate(card),
      }
    }
    return { version: 1, cards }
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
        for (const card of world.querySelectorAll<HTMLElement>('.thought-canvas-card[data-slug]')) {
          const slug = card.dataset.slug
          const row = slug ? saved.layout.cards[slug] : undefined
          if (!row)
            continue
          setCardPosition(card, row.x, row.y)
          setCardRotate(card, row.rotateDeg)
        }
      }
      saveState = 'saved'
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

  function rotateSelected(delta: number) {
    if (!editMode || !selectedCard)
      return
    setCardRotate(selectedCard, roundedRotate(readCardRotate(selectedCard) + delta))
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

  function onRotateLeftClick() {
    rotateSelected(-1)
  }

  function onRotateRightClick() {
    rotateSelected(1)
  }

  function onSaveClick() {
    void saveLayout()
  }

  function onWorldPointerDown(e: PointerEvent) {
    if (!editMode)
      return
    if (e.button !== 0)
      return
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
    cardDrag = {
      card: el,
      pointerId: e.pointerId,
      x: readCardX(el),
      y: readCardY(el),
      lastX: e.clientX,
      lastY: e.clientY,
    }
    el.setPointerCapture(e.pointerId)
    el.classList.add('z-[50]', 'shadow-lg', 'cursor-grabbing')
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
    setCardPosition(cardDrag.card, cardDrag.x, cardDrag.y)
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
    c.classList.remove('z-[50]', 'shadow-lg', 'cursor-grabbing')
    if (!dragging)
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
    cardRotateDrag = null
    if (!dragging && !cardDrag)
      document.body.classList.remove('select-none')
    markDirty()
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0)
      return

    const target = e.target as HTMLElement
    if (editMode && target.closest('.thought-canvas-card'))
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

  chrome?.zoomOutBtn?.addEventListener('click', onZoomOutClick)
  chrome?.zoomInBtn?.addEventListener('click', onZoomInClick)
  chrome?.resetBtn?.addEventListener('click', onResetClick)
  chrome?.editBtn?.addEventListener('click', onEditClick)
  chrome?.rotateLeftBtn?.addEventListener('click', onRotateLeftClick)
  chrome?.rotateRightBtn?.addEventListener('click', onRotateRightClick)
  chrome?.saveBtn?.addEventListener('click', onSaveClick)

  recenterContentInViewport()
  {
    const rect = viewportRect()
    hoverMx = rect.width / 2
    hoverMy = rect.height / 2
    hasHover = false
  }
  flushNow()

  const cleanup: Cleanup = {
    destroy() {
      isDestroyed = true
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
        c.classList.remove('z-[50]', 'shadow-lg', 'cursor-grabbing')
        cardDrag = null
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
      chrome?.rotateLeftBtn?.removeEventListener('click', onRotateLeftClick)
      chrome?.rotateRightBtn?.removeEventListener('click', onRotateRightClick)
      chrome?.saveBtn?.removeEventListener('click', onSaveClick)
      viewport.style.touchAction = ''
      delete (viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey]
      world.style.transform = ''
    },
  }
  ;(viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey] = cleanup
  return cleanup
}
