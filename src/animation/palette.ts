/**
 * DOM-side colour story (kept free of three.js so it can live in the main bundle).
 * Used to tint the readability vignette and the no-WebGL poster as the journey moves
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

/** Poster fallback: a warmer, lighter version of the same story. */
const POSTER: [number, string, string][] = [
  [0, '#5c7560', '#16261c'],
  [1.5, '#6d7b4f', '#1d2a1c'],
  [2.5, '#8a7a52', '#231c12'],
  [3.5, '#6b4424', '#170e09'],
  [5.5, '#4a2a17', '#0e0806'],
  [7.5, '#6a4a22', '#0b0705'],
  [10, '#6a4a22', '#0b0705'],
]

export function posterAt(pos: number) {
  let i = 0
  while (i < POSTER.length - 1 && pos >= POSTER[i + 1][0]) i++
  return { glow: POSTER[i][1], base: POSTER[i][2] }
}
