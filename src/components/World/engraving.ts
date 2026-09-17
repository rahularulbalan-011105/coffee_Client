import { RepeatWrapping, SRGBColorSpace } from 'three'
import { make } from './textures'

/**
 * Hand-engraved band for the brass dabara and tumbler: rows of punched dots framing a
 * zigzag, like traditional Kumbakonam brassware. One tile is drawn and repeated around
 * the vessel. v runs with height (see vesselLathe), so bands are placed by height.
 */

interface BandSpec {
  /** Band rows as [centre v, kind]. v = 0 at the base, 1 at the rim. */
  rows: [number, 'dots' | 'zigzag' | 'line' | 'wave' | 'dashes'][]
}

const TILE = 512

function drawBand(ctx: CanvasRenderingContext2D, spec: BandSpec, ink: string, width: number) {
  const s = TILE
  const yOf = (v: number) => (1 - v) * s // canvas y (texture flipY)
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [v, kind] of spec.rows) {
    const y = yOf(v)
    if (kind === 'dots') {
      const n = 14
      for (let i = 0; i < n; i++) {
        ctx.beginPath()
        ctx.arc(((i + 0.5) / n) * s, y, width * 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (kind === 'dashes') {
      const n = 22
      ctx.lineWidth = width * 0.8
      for (let i = 0; i < n; i++) {
        const x = (i / n) * s
        ctx.beginPath()
        ctx.moveTo(x + 3, y)
        ctx.lineTo(x + s / n - 8, y)
        ctx.stroke()
      }
    } else if (kind === 'wave') {
      // Gentle running wave, with a dot tucked under every crest.
      const waves = 4
      const amp = s * 0.012
      ctx.lineWidth = width
      ctx.beginPath()
      for (let i = 0; i <= 96; i++) {
        const x = (i / 96) * s
        const yy = y + Math.sin((i / 96) * Math.PI * 2 * waves) * amp
        if (i === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
      for (let i = 0; i < waves; i++) {
        ctx.beginPath()
        ctx.arc(((i + 0.25) / waves) * s, y + amp * 2.4, width * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (kind === 'line') {
      ctx.lineWidth = width * 0.8
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(s, y)
      ctx.stroke()
    } else {
      // Zigzag: two teeth per tile, with a punched dot inside every valley.
      const teeth = 4
      const amp = s * 0.018
      ctx.lineWidth = width
      ctx.beginPath()
      for (let i = 0; i <= teeth * 2; i++) {
        const x = (i / (teeth * 2)) * s
        const yy = y + (i % 2 === 0 ? amp : -amp)
        if (i === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
      for (let i = 0; i < teeth * 2; i++) {
        const x = ((i + 0.5) / (teeth * 2)) * s
        const up = i % 2 === 0
        ctx.beginPath()
        ctx.arc(x, y + (up ? amp * 1.9 : -amp * 1.9), width * 0.75, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function engravingTextures(key: string, spec: BandSpec, repeat: number) {
  // Colour: satin brass tint; engraved cuts are darker and slightly warmer.
  const map = make(
    `${key}-map`,
    TILE,
    (ctx, s) => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, s, s)
      drawBand(ctx, spec, 'rgba(120, 82, 30, 0.85)', 3.2)
    },
    true,
  )
  // Bump: cuts are recessed.
  const bump = make(`${key}-bump`, TILE, (ctx, s) => {
    ctx.fillStyle = 'rgb(200,200,200)'
    ctx.fillRect(0, 0, s, s)
    drawBand(ctx, spec, 'rgb(40,40,40)', 3.6)
  })
  for (const t of [map, bump]) {
    t.wrapS = RepeatWrapping
    t.repeat.set(repeat, 1)
    t.needsUpdate = true
  }
  map.colorSpace = SRGBColorSpace
  return { map, bump }
}

/** Dabara: a wide band across the middle of the wall. */
export const dabaraEngraving = () =>
  engravingTextures(
    'engrave-dabara',
    {
      rows: [
        [0.66, 'dots'],
        [0.585, 'zigzag'],
        [0.5, 'dots'],
        [0.415, 'zigzag'],
        [0.335, 'dots'],
      ],
    },
    9,
  )

/** Tumbler: a narrower band in the upper half. */
export const tumblerEngraving = () =>
  engravingTextures(
    'engrave-tumbler',
    {
      rows: [
        [0.74, 'dots'],
        [0.69, 'zigzag'],
        [0.635, 'dots'],
        [0.6, 'zigzag'],
        [0.55, 'dots'],
      ],
    },
    6,
  )

/** Filter chambers: the same hand-engraved language — dotted rows around a running wave. */
const filterBand = (v: number): BandSpec['rows'] => [
  [v + 0.035, 'dots'],
  [v, 'wave'],
  [v - 0.035, 'dashes'],
]

/** Lower chamber (v over its 0.62 height): two bands. */
export const filterLowerEngraving = () =>
  engravingTextures('engrave-filter-lower', { rows: [...filterBand(0.8), ...filterBand(0.42)] }, 10)

/** Upper chamber (v over its 0.6 height; the lowest 20% hides inside the lower chamber). */
export const filterUpperEngraving = () =>
  engravingTextures('engrave-filter-upper', { rows: [...filterBand(0.83), ...filterBand(0.45)] }, 10)
