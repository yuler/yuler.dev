interface Cleanup {
  destroy: () => void
}

const viewportKey = '__thoughtsCanvasCleanup' as const

export function initThoughtsCanvas(viewport: HTMLElement, world: HTMLElement): Cleanup {
  const prev = (viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey]
  prev?.destroy()

  let scale = 1
  let tx = 0
  let ty = 0
  let dragging = false
  let lastX = 0
  let lastY = 0

  function apply() {
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const delta = -e.deltaY * 0.0012
    const next = Math.min(1.65, Math.max(0.38, scale + delta))
    scale = next
    apply()
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0)
      return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    viewport.setPointerCapture(e.pointerId)
    viewport.classList.add('cursor-grabbing')
  }

  function onMove(e: PointerEvent) {
    if (!dragging)
      return
    tx += e.clientX - lastX
    ty += e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    apply()
  }

  function onUp(e: PointerEvent) {
    dragging = false
    viewport.classList.remove('cursor-grabbing')
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
  apply()

  const cleanup: Cleanup = {
    destroy() {
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
      delete (viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey]
      world.style.transform = ''
    },
  }
  ;(viewport as HTMLElement & { [viewportKey]?: Cleanup })[viewportKey] = cleanup
  return cleanup
}
