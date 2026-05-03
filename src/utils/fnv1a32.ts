/** FNV-1a 32-bit hash for deterministic pseudo-random layouts from strings. */
export function fnv1a32(input: string): number {
  let h = 0x811C9DC5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
