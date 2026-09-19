import { ClampToEdgeWrapping } from 'three'
import { rng } from './math'
import { make } from './textures'

/**
 * Hand-drawn (procedural) foliage art. Each cluster texture is a sprig of individually
 * painted coffee leaves — midrib, veins, wet gloss, crisp rim — on transparency, plus a
 * matching normal map. Bushes are built from many of these cards, so every leaf reads.
 */

interface LeafSpec {
  x: number
  y: number
  len: number
  angle: number
  color: string
  light: string
  shade: number
}

const LEAF_GREENS: [string, string][] = [
  ['#3f6e2e', '#72a64c'],
  ['#4a7f34', '#86ba5a'],
  ['#548845', '#90bd72'],
  ['#467a32', '#7fb356'],
  ['#5c8f43', '#9cc47a'],
  ['#3a6a2d', '#6a9e48'],
]

/** Coffee-leaf outline along +x from base (0,0) to tip (len,0): broad blade, drip tip. */
function leafPath(ctx: CanvasRenderingContext2D, len: number, w: number, half: 0 | 1 | -1 = 0) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  if (half !== 1) {
    ctx.bezierCurveTo(len * 0.18, -w * 1.05, len * 0.62, -w * 1.1, len * 0.9, -w * 0.18)
    ctx.quadraticCurveTo(len * 0.96, -w * 0.02, len, 0)
  } else {
    ctx.lineTo(len, 0)
  }
  if (half !== -1) {
    ctx.quadraticCurveTo(len * 0.96, w * 0.02, len * 0.9, w * 0.18)
    ctx.bezierCurveTo(len * 0.62, w * 1.1, len * 0.18, w * 1.05, 0, 0)
  } else {
    ctx.lineTo(0, 0)
  }
  ctx.closePath()
}

function paintLeaf(ctx: CanvasRenderingContext2D, l: LeafSpec, r: () => number) {
  const w = l.len * 0.3
  ctx.save()
  ctx.translate(l.x, l.y)
  ctx.rotate(l.angle)

  // Blade: darker edges, lighter along the midrib.
  const g = ctx.createLinearGradient(0, -w, 0, w)
  g.addColorStop(0, l.color)
  g.addColorStop(0.45, l.light)
  g.addColorStop(0.55, l.light)
  g.addColorStop(1, l.color)
  leafPath(ctx, l.len, w)
  ctx.fillStyle = g
  ctx.fill()

  // Leaves deeper in the sprig are shaded.
  const g2 = ctx.createLinearGradient(0, 0, l.len, 0)
  g2.addColorStop(0, `rgba(0,0,0,${0.25 + l.shade * 0.3})`)
  g2.addColorStop(0.5, `rgba(0,0,0,${l.shade * 0.25})`)
  g2.addColorStop(1, `rgba(0,0,0,${0.05 + l.shade * 0.25})`)
  ctx.fillStyle = g2
  ctx.fill()

  ctx.save()
  ctx.clip()
  // Lateral veins curving towards the tip.
  ctx.strokeStyle = 'rgba(190,220,140,0.28)'
  ctx.lineWidth = Math.max(1, l.len * 0.006)
  for (let i = 1; i <= 7; i++) {
    const t = i / 8.5
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(l.len * t, 0)
      ctx.quadraticCurveTo(l.len * (t + 0.06), s * w * 0.55, l.len * (t + 0.14), s * w * 0.85)
      ctx.stroke()
    }
  }
  // Wet gloss on one half.
  const hl = ctx.createRadialGradient(l.len * 0.45, -w * 0.35, 1, l.len * 0.45, -w * 0.35, l.len * 0.35)
  hl.addColorStop(0, `rgba(255,255,235,${0.16 + r() * 0.12})`)
  hl.addColorStop(1, 'rgba(255,255,235,0)')
  ctx.fillStyle = hl
  ctx.fillRect(0, -w, l.len, w * 2)
  // A few raindrops.
  for (let k = 0; k < 3; k++) {
    if (r() > 0.6) continue
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(l.len * (0.2 + r() * 0.6), (r() - 0.5) * w, 1.5 + r() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Midrib.
  ctx.strokeStyle = 'rgba(200,225,150,0.55)'
  ctx.lineWidth = Math.max(1.2, l.len * 0.012)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(l.len * 0.93, 0)
  ctx.stroke()

  // Crisp rim so leaves separate from one another.
  leafPath(ctx, l.len, w)
  ctx.strokeStyle = 'rgba(10,25,8,0.55)'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.restore()
}

/** Each blade is folded along its midrib: the two halves face slightly different ways. */
function paintLeafNormal(ctx: CanvasRenderingContext2D, l: LeafSpec) {
  const w = l.len * 0.3
  for (const half of [-1, 1] as const) {
    const px = -Math.sin(l.angle) * half
    const py = Math.cos(l.angle) * half
    const nx = px * 0.42
    const ny = -py * 0.42
    const nz = 0.9
    ctx.save()
    ctx.translate(l.x, l.y)
    ctx.rotate(l.angle)
    leafPath(ctx, l.len, w, half)
    const c = (v: number) => Math.round((v * 0.5 + 0.5) * 255)
    ctx.fillStyle = `rgb(${c(nx)},${c(ny)},${c(nz)})`
    ctx.fill()
    ctx.restore()
  }
}

function clusterLayout(size: number, seed: number, cherries: boolean) {
  const r = rng(seed)
  const leaves: LeafSpec[] = []
  const berries: { x: number; y: number; rad: number; color: string }[] = []
  const stems: { x0: number; y0: number; x1: number; y1: number }[] = []
  const centre = size / 2
  const stemCount = 9
  for (let s = 0; s < stemCount; s++) {
    const a = -Math.PI / 2 + (s / (stemCount - 1) - 0.5) * 2.6 + (r() - 0.5) * 0.3
    const x0 = centre + (r() - 0.5) * size * 0.1
    const y0 = size * 0.78
    const length = size * (0.3 + r() * 0.16)
    const x1 = x0 + Math.cos(a) * length
    const y1 = y0 + Math.sin(a) * length
    stems.push({ x0, y0, x1, y1 })
    const pairs = 4 + Math.floor(r() * 2)
    for (let p = 0; p < pairs; p++) {
      const t = 0.25 + (p / pairs) * 0.75
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      for (const side of [-1, 1]) {
        const [dark, light] = LEAF_GREENS[Math.floor(r() * LEAF_GREENS.length)]
        leaves.push({
          x,
          y,
          len: size * (0.13 + r() * 0.07) * (1.1 - t * 0.35),
          angle: a + side * (0.75 + r() * 0.45),
          color: dark,
          light,
          shade: r(),
        })
      }
      if (cherries && r() < 0.4) {
        const ripe = r()
        for (let k = 0; k < 5; k++) {
          const color = ripe > 0.55 ? (r() > 0.5 ? '#9b1419' : '#b52a1c') : ripe > 0.3 ? '#c67f28' : '#6c8f35'
          berries.push({
            x: x + (r() - 0.5) * size * 0.025,
            y: y + (r() - 0.5) * size * 0.025 + size * 0.008,
            rad: size * (0.009 + r() * 0.003),
            color,
          })
        }
      }
    }
    const [dark, light] = LEAF_GREENS[4]
    leaves.push({ x: x1, y: y1, len: size * 0.11, angle: a + (r() - 0.5) * 0.4, color: dark, light, shade: 0.1 })
  }
  // Paint deeper (darker) leaves first.
  leaves.sort((p, q) => q.shade - p.shade)
  return { leaves, berries, stems, r }
}

function buildClusterTextures(key: string, seed: number, cherries: boolean) {
  const size = 1024
  const map = make(
    `${key}-map`,
    size,
    (ctx) => {
      ctx.clearRect(0, 0, size, size)
      const { leaves, berries, stems, r } = clusterLayout(size, seed, cherries)
      ctx.strokeStyle = '#3b2d1c'
      ctx.lineCap = 'round'
      ctx.lineWidth = 5
      for (const s of stems) {
        ctx.beginPath()
        ctx.moveTo(s.x0, s.y0)
        ctx.lineTo(s.x1, s.y1)
        ctx.stroke()
      }
      const berryAt = Math.floor(leaves.length * 0.6)
      leaves.forEach((l, i) => {
        paintLeaf(ctx, l, r)
        if (i !== berryAt) return
        // Berries sit among the leaves rather than on top of all of them.
        for (const b of berries) {
          const g = ctx.createRadialGradient(b.x - b.rad * 0.35, b.y - b.rad * 0.35, 0.5, b.x, b.y, b.rad)
          g.addColorStop(0, 'rgba(255,230,210,0.9)')
          g.addColorStop(0.25, b.color)
          g.addColorStop(1, '#2a0806')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.rad, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    },
    true,
  )
  const normal = make(`${key}-normal`, size, (ctx) => {
    ctx.fillStyle = 'rgb(128,128,255)'
    ctx.fillRect(0, 0, size, size)
    for (const l of clusterLayout(size, seed, cherries).leaves) paintLeafNormal(ctx, l)
  })
  map.wrapS = map.wrapT = normal.wrapS = normal.wrapT = ClampToEdgeWrapping
  // Seen at a slant from above: sharpen with full anisotropic filtering.
  map.anisotropy = normal.anisotropy = 16
  return { map, normal }
}

/** A sprig of coffee leaves with a few cherries, for bush cards. */
export const coffeeClusterTextures = () => buildClusterTextures('cluster-coffee', 7, true)
/** A plain sprig for tree crowns and background canopy. */
export const canopyClusterTextures = () => buildClusterTextures('cluster-canopy', 19, false)

/** Detail for a single 3D leaf: u runs across the blade, v from base to tip. */
export function singleLeafTextures() {
  const map = make(
    'leaf-single-map',
    512,
    (ctx, s) => {
      const r = rng(5)
      const g = ctx.createLinearGradient(0, 0, s, 0)
      g.addColorStop(0, '#6f8f5c')
      g.addColorStop(0.44, '#c3d8a4')
      g.addColorStop(0.5, '#e4efc6')
      g.addColorStop(0.56, '#c3d8a4')
      g.addColorStop(1, '#6f8f5c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, s, s)
      ctx.strokeStyle = 'rgba(235,245,210,0.55)'
      ctx.lineWidth = 2
      for (let i = 0; i < 11; i++) {
        const v = s - (i / 11) * s * 0.95
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(s / 2, v)
          ctx.quadraticCurveTo(s / 2 + side * s * 0.18, v - s * 0.05, s / 2 + side * s * 0.46, v - s * 0.14)
          ctx.stroke()
        }
      }
      ctx.strokeStyle = 'rgba(245,250,225,0.9)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(s / 2, s)
      ctx.lineTo(s / 2, 0)
      ctx.stroke()
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        ctx.fillRect(r() * s, r() * s, 2, 2)
      }
    },
    true,
  )
  const normal = make('leaf-single-normal', 512, (ctx, s) => {
    const img = ctx.createImageData(s, s)
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const u = x / s - 0.5
        const vein = Math.sin((y / s) * 44 + Math.abs(u) * 30) * 0.025
        const nx = Math.sign(u) * 0.35 + vein
        const l = Math.hypot(nx, 1)
        const i = (y * s + x) * 4
        img.data[i] = ((nx / l) * 0.5 + 0.5) * 255
        img.data[i + 1] = 128
        img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  })
  return { map, normal }
}

/**
 * A seamless mat of overlapping coffee leaves (opaque, with shadowy gaps) for the body of
 * the hedgerows: wherever the sprig cards do not cover, the hedge still shows real leaves.
 */
export function leafMatTextures() {
  const size = 1024
  const layout = () => {
    const r = rng(83)
    const leaves: LeafSpec[] = []
    const n = 130
    for (let i = 0; i < n; i++) {
      const [color, light] = LEAF_GREENS[Math.floor(r() * LEAF_GREENS.length)]
      leaves.push({
        x: r() * size,
        y: r() * size,
        len: size * (0.2 + r() * 0.08),
        // Mostly pointing outwards and down, as leaves hang on a hedge.
        angle: Math.PI * 0.5 + (r() - 0.5) * 2.4,
        color,
        light,
        shade: Math.max(0, 0.7 - i / n),
      })
    }
    return { leaves, r }
  }
  // Draw each leaf, plus copies across the edges, so the tile wraps without seams.
  const wrapped = (draw: (l: LeafSpec) => void, leaves: LeafSpec[]) => {
    for (const l of leaves) {
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          if (l.x + dx < -l.len || l.x + dx > size + l.len || l.y + dy < -l.len || l.y + dy > size + l.len) continue
          draw({ ...l, x: l.x + dx, y: l.y + dy })
        }
      }
    }
  }
  const map = make(
    'leaf-mat-map',
    size,
    (ctx) => {
      ctx.fillStyle = '#1b3217'
      ctx.fillRect(0, 0, size, size)
      const { leaves, r } = layout()
      wrapped((l) => paintLeaf(ctx, l, r), leaves)
    },
    true,
  )
  const normal = make('leaf-mat-normal', size, (ctx) => {
    ctx.fillStyle = 'rgb(128,128,255)'
    ctx.fillRect(0, 0, size, size)
    wrapped((l) => paintLeafNormal(ctx, l), layout().leaves)
  })
  map.anisotropy = normal.anisotropy = 16
  return { map, normal }
}
