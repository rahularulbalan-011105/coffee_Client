/**
 * DOM-side colour story: tints the readability vignette over the footage as the journey moves
 * from plantation green to espresso.
 */
const KEYS: [number, [number, number, number]][] = [
  [0, [18, 30, 22]],
  [1.6, [18, 30, 22]],
  [2.2, [34, 38, 28]],
  [2.7, [24, 20, 13]],
  [3.6, [18, 12, 9]],
  [4.6, [11, 7, 5]],
  [10, [11, 7, 5]],
]

export function tintAt(pos: number): [number, number, number] {
  let i = 0
  while (i < KEYS.length - 2 && pos > KEYS[i + 1][0]) i++
  const [a, ca] = KEYS[i]
  const [b, cb] = KEYS[i + 1]
  const t = Math.min(1, Math.max(0, (pos - a) / (b - a)))
  const s = t * t * (3 - 2 * t)
  return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * s)) as [number, number, number]
}
