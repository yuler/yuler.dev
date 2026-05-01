import { fnv1a32 } from './fnv1a32'

/** 便签纸背景：同一 slug 稳定、轻微渐变模拟纸本 */
export function stickyBackground(slug: string): string {
  const hue = fnv1a32(slug) % 360
  const hi = `hsl(${hue} 78% 94%)`
  const mid = `hsl(${hue} 68% 89%)`
  const lo = `hsl(${hue} 56% 82%)`
  return `linear-gradient(168deg, ${hi} 0%, ${mid} 48%, ${lo} 100%)`
}

/** 半透明胶带条的轻微倾斜，与便签整体旋转独立 */
export function stickyTapeRotateDeg(slug: string): number {
  const h = fnv1a32(`${slug}\0tape`)
  return ((h % 10_000) / 10_000 - 0.5) * 18
}
