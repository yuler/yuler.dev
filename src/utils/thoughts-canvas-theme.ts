function fnv1a32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 便签纸背景：同一 slug 稳定、对比度适合深灰正文 */
export function stickyBackground(slug: string): string {
  const hue = fnv1a32(slug) % 360
  return `hsl(${hue} 72% 92%)`
}
