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

  function flushTransform() {
    world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
  }

  let cachedViewportRect: DOMRect | undefined

  function onResize() {
    cachedViewportRect = undefined
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

  function onDown(e: PointerEvent) {
    if (e.button !== 0)
      return

    const target = e.target as HTMLElement
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
      document.body.classList.remove('select-none')
      dragging = false
      viewport.classList.remove('cursor-grabbing')
      flushNow()
      if (viewport.hasPointerCapture(e.pointerId)) {
        viewport.releasePointerCapture(e.pointerId)
      }
    }
  }

  viewport.style.touchAction = 'none'
  viewport.addEventListener('wheel', onWheel, { passive: false })
  viewport.addEventListener('pointerdown', onDown)
  viewport.addEventListener('pointermove', onMove)
  viewport.addEventListener('pointerup', onUp)
  viewport.addEventListener('pointercancel', onUp)
  window.addEventListener('resize', onResize)

  chrome?.zoomOutBtn?.addEventListener('click', onZoomOutClick)
  chrome?.zoomInBtn?.addEventListener('click', onZoomInClick)
  chrome?.resetBtn?.addEventListener('click', onResetClick)

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
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
      window.removeEventListener('resize', onResize)
      chrome?.zoomOutBtn?.removeEventListener('click', onZoomOutClick)
      chrome?.zoomInBtn?.removeEventListener('click', onZoomInClick)
      chrome?.resetBtn?.removeEventListener('click', onResetClick)
      viewport.style.touchAction = ''
      delete (viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey]
      world.style.transform = ''
    },
  }
  ;(viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey] = cleanup
  return cleanup
}
