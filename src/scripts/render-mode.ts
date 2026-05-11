function initRenderModes() {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-render-root]:not([data-render-bound])'))

  for (const root of roots) {
    root.dataset.renderBound = 'true'

    const switchId = root.dataset.renderSwitch
    const eventName = root.dataset.renderEvent ?? 'render-mode:change'
    const defaultMode = root.dataset.defaultMode ?? 'preview'
    const modeSwitch = switchId ? document.getElementById(switchId) : null
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-mode-panel]'))

    function setMode(mode: string) {
      root.dataset.mode = mode

      for (const panel of panels) {
        const shouldShow = panel.dataset.modePanel === mode
        panel.classList.toggle('hidden', !shouldShow)
      }
    }

    modeSwitch?.addEventListener(eventName, (event) => {
      const nextMode = (event as CustomEvent<{ value?: string }>).detail?.value ?? defaultMode
      setMode(nextMode)
    })

    setMode(root.dataset.mode ?? defaultMode)
  }
}

initRenderModes()

const htmlRoot = document.documentElement
if (!htmlRoot.dataset.renderModePageLoadBound) {
  htmlRoot.dataset.renderModePageLoadBound = 'true'
  document.addEventListener('astro:page-load', initRenderModes)
}
