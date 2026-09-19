import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { rng } from './math'

/**
 * Small procedural textures generated once at runtime. They keep the bundle free of
 * image downloads; each can be replaced by a KTX2 texture from /assets/textures later.
 */

const cache = new Map<string, Texture>()

export function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, srgb = false) {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = 4
  if (srgb) tex.colorSpace = SRGBColorSpace
  cache.set(key, tex)
  return tex
}

/** Lathe-spun metal: fine horizontal streaks (lathe UV v runs along the profile). */
export function brushedRoughness() {
  return make('brushed', 256, (ctx, s) => {
    const r = rng(7)
    ctx.fillStyle = 'rgb(120,120,120)'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 900; i++) {
      const y = r() * s
      const v = 90 + r() * 80
      ctx.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`
      ctx.fillRect(0, y, s, 0.6 + r() * 1.4)
    }
    // A few soft hand-polish smudges.
    for (let i = 0; i < 18; i++) {
      const g = ctx.createRadialGradient(r() * s, r() * s, 0, r() * s, r() * s, 20 + r() * 50)
      g.addColorStop(0, 'rgba(70,70,70,0.25)')
      g.addColorStop(1, 'rgba(70,70,70,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, s, s)
    }
  })
}

/** Tileable ripple normal map for liquid surfaces. */
export function rippleNormal() {
  return make('ripple', 256, (ctx, s) => {
    const img = ctx.createImageData(s, s)
    const h = (x: number, y: number) => {
      const u = (x / s) * Math.PI * 2
      const v = (y / s) * Math.PI * 2
      return (
        Math.sin(u * 3 + Math.cos(v * 2) * 1.3) * 0.5 +
        Math.sin(v * 4 + Math.sin(u * 2) * 1.1) * 0.35 +
        Math.sin((u + v) * 6) * 0.12
      )
    }
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = h(x + 1, y) - h(x - 1, y)
        const dy = h(x, y + 1) - h(x, y - 1)
        const nx = -dx * 2
        const ny = -dy * 2
        const nz = 1
        const l = Math.hypot(nx, ny, nz)
        const i = (y * s + x) * 4
        img.data[i] = ((nx / l) * 0.5 + 0.5) * 255
        img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255
        img.data[i + 2] = ((nz / l) * 0.5 + 0.5) * 255
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  })
}

/** Filter-coffee froth: soft cream base with clusters of tiny bubbles. Used as map + alpha. */
export function foamTexture() {
  return make(
    'foam',
    512,
    (ctx, s) => {
      const r = rng(21)
      const base = ctx.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.5)
      base.addColorStop(0, '#e9d2ae')
      base.addColorStop(0.7, '#d9b98c')
      base.addColorStop(1, '#b8895a')
      ctx.fillStyle = base
      ctx.fillRect(0, 0, s, s)
      for (let i = 0; i < 2600; i++) {
        const x = r() * s
        const y = r() * s
        const rad = Math.pow(r(), 3) * 9 + 0.8
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${150 + r() * 60},${105 + r() * 50},${70 + r() * 40},${0.25 + r() * 0.35})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,244,225,0.55)'
        ctx.fill()
      }
    },
    true,
  )
}

/**
 * The edge of a pool of fresh decoction: a meniscus catching the light where the coffee
 * climbs the wall, and fine tan bubbles gathered against it (with a few drifting clusters).
 */
export function rimBubblesTexture() {
  return make(
    'rim-bubbles',
    1024,
    (ctx, s) => {
      const r = rng(64)
      const c = s / 2
      ctx.clearRect(0, 0, s, s)
      // Slightly darker band just inside the meniscus, then the bright meniscus line.
      ctx.lineWidth = s * 0.02
      ctx.strokeStyle = 'rgba(20,8,2,0.35)'
      ctx.beginPath()
      ctx.arc(c, c, c * 0.95, 0, Math.PI * 2)
      ctx.stroke()
      ctx.lineWidth = s * 0.008
      ctx.strokeStyle = 'rgba(255,214,160,0.55)'
      ctx.beginPath()
      ctx.arc(c, c, c * 0.985, 0, Math.PI * 2)
      ctx.stroke()
      const bubble = (x: number, y: number, rad: number) => {
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${120 + r() * 50},${70 + r() * 35},${34 + r() * 25},${0.55 + r() * 0.3})`
        ctx.fill()
        ctx.lineWidth = Math.max(0.6, rad * 0.25)
        ctx.strokeStyle = 'rgba(40,18,6,0.55)'
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,240,220,0.75)'
        ctx.fill()
      }
      // Dense against the wall, thinning inwards.
      for (let i = 0; i < 1400; i++) {
        const a = r() * Math.PI * 2
        const d = c * (0.975 - Math.pow(r(), 2.2) * 0.2)
        bubble(c + Math.cos(a) * d, c + Math.sin(a) * d, 1.2 + Math.pow(r(), 3) * 7)
      }
      // A few loose clusters drifting on the surface.
      for (let k = 0; k < 7; k++) {
        const a = r() * Math.PI * 2
        const d = c * (0.2 + r() * 0.55)
        const cx = c + Math.cos(a) * d
        const cy = c + Math.sin(a) * d
        for (let i = 0; i < 18; i++) bubble(cx + (r() - 0.5) * 34, cy + (r() - 0.5) * 34, 1 + Math.pow(r(), 3) * 5)
      }
    },
    true,
  )
}

/** Dark stone table top with faint mineral variation. */
export function tableTexture() {
  return make(
    'table',
    512,
    (ctx, s) => {
      const r = rng(3)
      ctx.fillStyle = '#17100c'
      ctx.fillRect(0, 0, s, s)
      for (let i = 0; i < 220; i++) {
        const g = ctx.createRadialGradient(r() * s, r() * s, 0, r() * s, r() * s, 30 + r() * 120)
        const light = r() > 0.5
        g.addColorStop(0, light ? 'rgba(60,42,30,0.18)' : 'rgba(5,3,2,0.25)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, s, s)
      }
      for (let i = 0; i < 6000; i++) {
        const v = r() * 50
        ctx.fillStyle = `rgba(${v + 20},${v + 12},${v + 6},0.25)`
        ctx.fillRect(r() * s, r() * s, 1, 1)
      }
    },
    true,
  )
}

/** Perforated base of the filter's upper chamber. */
export function perforatedTexture() {
  return make(
    'perforated',
    256,
    (ctx, s) => {
      ctx.fillStyle = '#b9b6b0'
      ctx.fillRect(0, 0, s, s)
      ctx.fillStyle = '#16100c'
      const step = 14
      for (let y = step / 2; y < s; y += step) {
        for (let x = step / 2; x < s; x += step) {
          const dx = x - s / 2
          const dy = y - s / 2
          if (Math.hypot(dx, dy) > s * 0.36) continue
          ctx.beginPath()
          ctx.arc(x, y, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },
    true,
  )
}

/** Soft round sprite for particles. */
export function softDotTexture() {
  return make('dot', 64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

/** Scattered raindrops as a normal map (for a wet clearcoat on leaves). */
export function dropletNormal() {
  return make('droplets', 256, (ctx, s) => {
    const r = rng(90)
    ctx.fillStyle = 'rgb(128,128,255)'
    ctx.fillRect(0, 0, s, s)
    const img = ctx.getImageData(0, 0, s, s)
    for (let k = 0; k < 90; k++) {
      const cx = r() * s
      const cy = r() * s
      const rad = 2 + Math.pow(r(), 2) * 9
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
        for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
          const dx = (x - cx) / rad
          const dy = (y - cy) / rad
          const d2 = dx * dx + dy * dy
          if (d2 > 1) continue
          const nz = Math.sqrt(1 - d2)
          const i = ((((y % s) + s) % s) * s + (((x % s) + s) % s)) * 4
          img.data[i] = (dx * 0.5 + 0.5) * 255
          img.data[i + 1] = (-dy * 0.5 + 0.5) * 255
          img.data[i + 2] = (nz * 0.5 + 0.5) * 255
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  })
}
