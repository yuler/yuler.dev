import { fnv1a32 } from './fnv1a32'

/** 便签纸背景：同一 slug 稳定、对比度适合深灰正文 */
export function stickyBackground(slug: string): string {
  const hue = fnv1a32(slug) % 360
  return `hsl(${hue} 72% 92%)`
}
