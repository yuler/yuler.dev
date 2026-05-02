interface Cleanup {
  destroy: () => void
}

const viewportKey = '__thoughtsCanvasCleanup' as const

/** 滚轮与 +/- 按钮共用：最小 50%，最大 150% */
export const THOUGHTS_CANVAS_SCALE_MIN = 0.5
export const THOUGHTS_CANVAS_SCALE_MAX = 1.5

const ZOOM_STEP_RATIO = 1.25

/** 指数缩放的灵敏度（越大，同样 delta 缩放越多） */
const WHEEL_ZOOM_SENSITIVITY = 0.0035

export interface ThoughtsCanvasChromeOptions {
  zoomOutBtn?: HTMLButtonElement | null
  zoomInBtn?: HTMLButtonElement | null
  zoomLevelEl?: HTMLElement | null
  resetBtn?: HTMLButtonElement | null
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

  const root = viewport.closest('#thoughts-root') as HTMLElement | null
  let readyOuter = 0
  let readyInner = 0

  let scale = 1
  let tx = 0
  let ty = 0
  let dragging = false
  let lastX = 0
  let lastY = 0
  let rafId = 0
  /** 最近一次指针在 viewport 内位置（用于 +/- 围绕“当前鼠标附近”缩放） */
  let hoverMx = 0
  let hoverMy = 0
  let hasHover = false

  function flushTransform() {
    world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
  }

  function viewportRect() {
    return viewport.getBoundingClientRect()
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
      x: (vr.width - world.offsetWidth * scale) / 2,
      y: (vr.height - world.offsetHeight * scale) / 2,
    }
  }

  function isDefaultView() {
    if (Math.abs(scale - 1) > 0.002)
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

  function setCanvasStage(stage: 'boot' | 'ready') {
    if (!root)
      return
    if (stage === 'boot')
      root.dataset.thoughtsCanvasStage = 'boot'
    else
      delete root.dataset.thoughtsCanvasStage
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
   * 以视口内一点 (mx, my) 为锚缩放（鼠标 / 触控板位置用 client 相对 viewport）。
   * 依赖 world 为 `transform-origin: 0 0` 且 `translate3d(tx,ty,0) scale(s)`。
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
    const vr = viewport.getBoundingClientRect()
    tx = (vr.width - world.offsetWidth * scale) / 2
    ty = (vr.height - world.offsetHeight * scale) / 2
  }

  function onWheel(e: WheelEvent) {
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
    scale = 1
    recenterContentInViewport()
    flushNow()
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0)
      return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    viewport.setPointerCapture(e.pointerId)
    viewport.classList.add('cursor-grabbing')
    setHoverFromClient(e.clientX, e.clientY)
  }

  function onMove(e: PointerEvent) {
    setHoverFromClient(e.clientX, e.clientY)
    if (!dragging)
      return
    tx += e.clientX - lastX
    ty += e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    scheduleFlush()
  }

  function onUp(e: PointerEvent) {
    dragging = false
    viewport.classList.remove('cursor-grabbing')
    flushNow()
    try {
      viewport.releasePointerCapture(e.pointerId)
    }
    catch {
      /* ignore */
    }
  }

  viewport.style.touchAction = 'none'
  viewport.addEventListener('wheel', onWheel, { passive: false })
  viewport.addEventListener('pointerdown', onDown)
  viewport.addEventListener('pointermove', onMove)
  viewport.addEventListener('pointerup', onUp)
  viewport.addEventListener('pointercancel', onUp)

  chrome?.zoomOutBtn?.addEventListener('click', onZoomOutClick)
  chrome?.zoomInBtn?.addEventListener('click', onZoomInClick)
  chrome?.resetBtn?.addEventListener('click', onResetClick)

  setCanvasStage('boot')

  recenterContentInViewport()
  {
    const rect = viewportRect()
    hoverMx = rect.width / 2
    hoverMy = rect.height / 2
    hasHover = false
  }
  flushNow()

  readyOuter = requestAnimationFrame(() => {
    readyOuter = 0
    readyInner = requestAnimationFrame(() => {
      readyInner = 0
      setCanvasStage('ready')
    })
  })

  const cleanup: Cleanup = {
    destroy() {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      if (readyOuter) {
        cancelAnimationFrame(readyOuter)
        readyOuter = 0
      }
      if (readyInner) {
        cancelAnimationFrame(readyInner)
        readyInner = 0
      }
      setCanvasStage('ready')
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
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
