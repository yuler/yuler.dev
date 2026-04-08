import type { Map } from 'leaflet'
import L from 'leaflet'

export type BasemapProvider = 'amap' | 'carto'

/**
 * Primary: Carto (global CDN, WGS-84, smaller labels).
 * Fallback: Amap (大陆网络更稳, GCJ-02).
 * Resolved at runtime via {@link resolveBasemapProvider}.
 */
let _provider: BasemapProvider = 'amap'

// ── Carto (legacy / global) ───────────────────────────────────────────────

const CARTO_LIGHT_ALL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const CARTO_LIGHT_NOLABELS = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

const CARTO_ATTRIBUTION
  = '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" rel="noopener noreferrer">CARTO</a>'

const TILE_OPTIONS_CARTO = {
  maxZoom: 20,
  subdomains: 'abcd',
  tileSize: 256,
  zoomOffset: 0,
  fadeAnimation: false,
} as const

// ── 高德 (mainland-friendly) ──────────────────────────────────────────────

/**
 * - style=7：标准矢量路网。
 * - scl=1 含道路注记；scl=2 仅路网无文字（海报底图）。
 * - `tileSize: 128` + `zoomOffset: 1`：请求 z+1 级 256px 瓦片，缩至 128px CSS 显示。
 *   Retina (DPR 2) 下 128 CSS = 256 物理像素，1:1 无拉伸；注记视觉约为原来的 50%。
 */
const AMAP_LIGHT_LABELED
  = 'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&scl=1&x={x}&y={y}&z={z}'

const AMAP_LIGHT_NO_LABELS
  = 'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7=&scl=2&x={x}&y={y}&z={z}'

const AMAP_ATTRIBUTION = 'Map &copy; <a href="https://www.amap.com/" rel="noopener noreferrer">高德地图</a>'

const TILE_OPTIONS_AMAP = {
  maxZoom: 20,
  maxNativeZoom: 18,
  subdomains: '1234',
  tileSize: 128,
  zoomOffset: 1,
  fadeAnimation: false,
} as const

// ── Provider auto-detection (Carto → Amap fallback) ─────────────────────

const PROBE_TIMEOUT_MS = 3000
const PROVIDER_STORAGE_KEY = 'basemap-provider'

function probeCarto(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.src = ''
      resolve(false)
    }, PROBE_TIMEOUT_MS)
    img.onload = () => {
      clearTimeout(timer)
      resolve(true)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    img.src = 'https://a.basemaps.cartocdn.com/light_all/0/0/0.png'
  })
}

function probeAmap(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.src = ''
      resolve(false)
    }, PROBE_TIMEOUT_MS)
    img.onload = () => {
      clearTimeout(timer)
      resolve(true)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    img.src = 'https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&scl=1&x=0&y=0&z=1'
  })
}

let _probePromise: Promise<BasemapProvider> | null = null

/**
 * Probe Carto tile CDN; fall back to Amap when unreachable or slow (> 3 s).
 * Result is cached per session (`sessionStorage`) and per module.
 * Call once before creating any map; subsequent calls return the cached result.
 */
export function getProvider(): BasemapProvider {
  return _provider
}

export function setProvider(provider: BasemapProvider): void {
  _provider = provider
  try {
    sessionStorage.setItem(PROVIDER_STORAGE_KEY, provider)
  }
  catch {}
  _probePromise = Promise.resolve(provider)
}

export const BASEMAP_CHANGED_EVENT = 'basemap-provider-changed'

export function toggleProvider(): BasemapProvider {
  const next: BasemapProvider = _provider === 'carto' ? 'amap' : 'carto'
  setProvider(next)
  document.dispatchEvent(new CustomEvent(BASEMAP_CHANGED_EVENT))
  return next
}

export function syncProviderIcon(btn: HTMLElement, provider: BasemapProvider): void {
  const cartoIcon = btn.querySelector('.provider-icon-carto')
  const amapIcon = btn.querySelector('.provider-icon-amap')
  if (provider === 'carto') {
    cartoIcon?.classList.remove('hidden')
    amapIcon?.classList.add('hidden')
    btn.title = 'Switch to Amap'
  }
  else {
    cartoIcon?.classList.add('hidden')
    amapIcon?.classList.remove('hidden')
    btn.title = 'Switch to Carto'
  }
}

export function resolveBasemapProvider(): Promise<BasemapProvider> {
  if (_probePromise)
    return _probePromise

  _probePromise = (async () => {
    try {
      const cached = sessionStorage.getItem(PROVIDER_STORAGE_KEY)
      if (cached === 'carto' || cached === 'amap') {
        _provider = cached
        return cached
      }
    }
    catch {}

    const preferred = _provider
    const preferredOk = preferred === 'amap' ? await probeAmap() : await probeCarto()

    if (preferredOk) {
      _provider = preferred
    }
    else {
      _provider = preferred === 'amap' ? 'carto' : 'amap'
    }

    try {
      sessionStorage.setItem(PROVIDER_STORAGE_KEY, _provider)
    }
    catch {}

    return _provider
  })()

  return _probePromise
}

/** 与 {@link nudgeZoomOutAfterFit} 合用，否则 `setZoom(12.55)` 会被默认 `zoomSnap: 1` 吃掉。 */
export const LEAFLET_MAP_OPTIONS_FRACTIONAL_ZOOM = { zoomSnap: 0.05 } as const

/** 关闭缩放过渡（滚轮/控件瞬时变级）。 */
export const LEAFLET_MAP_OPTIONS_ZOOM_ANIMATION = {
  zoomAnimation: true,
  markerZoomAnimation: true,
} as const

/**
 * 活动路线大图：整数缩放 + 无缩放动画 + Canvas 折线 + 滚轮灵敏度，减轻滚轮时瓦片/矢量反复重绘导致的卡顿。
 * （细粒度 `zoomSnap: 0.05` 会让每次滚轮触发多段小缩放，比动画本身更容易卡。）
 */
export const LEAFLET_MAP_OPTIONS_ACTIVITY_ROUTE = {
  ...LEAFLET_MAP_OPTIONS_ZOOM_ANIMATION,
  zoomSnap: 1,
  zoomDelta: 1,
  preferCanvas: true,
  fadeAnimation: false,
  /** 越大 = 同样滚动距离下缩放变化越小（Leaflet 默认 60）。 */
  wheelPxPerZoomLevel: 260,
  wheelDebounceTime: 72,
} as const

/**
 * 在 `fitBounds` 后略为缩小缩放级，整图（含瓦片里烤死的道路字）在屏幕上会略小。不改变 `tileSize`。
 */
export function nudgeZoomOutAfterFit(map: Map, delta = 0.45): void {
  const z = map.getZoom()
  map.setZoom(Math.max(z - delta, map.getMinZoom()), { animate: false })
}

/**
 * `labels: false` — 浅色路网、无注记（海报）。
 * `labels: true` — 浅色底图 + 注记（路线/地点卡片）。
 * `provider` — 覆盖 {@link resolveBasemapProvider} 的结果，便于单次调试。
 */
export function addLightBasemapTiles(
  map: Map,
  options: { labels: boolean, attribution?: string, provider?: BasemapProvider },
): L.TileLayer {
  const provider = options.provider ?? _provider

  if (provider === 'carto') {
    const url = options.labels ? CARTO_LIGHT_ALL : CARTO_LIGHT_NOLABELS
    return L.tileLayer(url, {
      attribution: options.attribution ?? CARTO_ATTRIBUTION,
      ...TILE_OPTIONS_CARTO,
    }).addTo(map)
  }

  const url = options.labels ? AMAP_LIGHT_LABELED : AMAP_LIGHT_NO_LABELS
  return L.tileLayer(url, {
    attribution: options.attribution ?? AMAP_ATTRIBUTION,
    ...TILE_OPTIONS_AMAP,
  }).addTo(map)
}

// ── WGS-84 → GCJ-02 coordinate conversion (for Amap) ───────────────────

const GCJ_A = 6378245.0
const GCJ_EE = 0.006_693_421_622_965_943

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function _transformLat(x: number, y: number): number {
  let r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  r += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  r += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0
  r += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320.0 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0
  return r
}

function _transformLng(x: number, y: number): number {
  let r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  r += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  r += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0
  r += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0
  return r
}

function wgs84ToGcj02(wgsLat: number, wgsLng: number): [lat: number, lng: number] {
  if (outOfChina(wgsLat, wgsLng))
    return [wgsLat, wgsLng]
  let dLat = _transformLat(wgsLng - 105.0, wgsLat - 35.0)
  let dLng = _transformLng(wgsLng - 105.0, wgsLat - 35.0)
  const radLat = (wgsLat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - GCJ_EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic)) * Math.PI)
  dLng = (dLng * 180.0) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [wgsLat + dLat, wgsLng + dLng]
}

/**
 * WGS-84 GPS 坐标 → 当前底图坐标系。高德用 GCJ-02，Carto 用 WGS-84（直接返回）。
 */
export function toMapCoords(wgsLat: number, wgsLng: number, provider?: BasemapProvider): [lat: number, lng: number] {
  const p = provider ?? _provider
  if (p === 'amap')
    return wgs84ToGcj02(wgsLat, wgsLng)
  return [wgsLat, wgsLng]
}
