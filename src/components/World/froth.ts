import { MeshPhysicalMaterial, Color, SphereGeometry, Vector2 } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rng } from './math'
import { make } from './textures'

/**
 * The froth crown on South Indian filter coffee: pale caramel, dense with tiny bubbles,
 * heaped just above the rim of the tumbler after the long pour.
 */

function paintBubbles(ctx: CanvasRenderingContext2D, s: number, seed: number, mode: 'color' | 'bump') {
  const r = rng(seed)
  if (mode === 'color') {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.55)
    g.addColorStop(0, '#f3e1c2')
    g.addColorStop(0.6, '#e6c79a')
    g.addColorStop(1, '#c79a66')
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = 'rgb(150,150,150)'
  }
  ctx.fillRect(0, 0, s, s)
  // Big, medium, then tiny bubbles.
  const layers: [number, number, number][] = [
    [260, 7, 3],
    [1400, 3.2, 1.2],
    [5200, 1.4, 0.5],
  ]
  for (const [count, maxR, minR] of layers) {
    for (let i = 0; i < count; i++) {
      const x = r() * s
      const y = r() * s
      const rad = minR + Math.pow(r(), 2) * (maxR - minR)
      if (mode === 'color') {
        // Bubble: slightly darker rim, bright specular dot.
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${150 + r() * 40},${105 + r() * 30},${62 + r() * 20},${0.28 + r() * 0.2})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, rad * 0.72, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(248,236,214,${0.55 + r() * 0.3})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x - rad * 0.3, y - rad * 0.3, Math.max(0.5, rad * 0.25), 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()
      } else {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
        g.addColorStop(0, 'rgb(235,235,235)')
        g.addColorStop(0.75, 'rgb(190,190,190)')
        g.addColorStop(1, 'rgb(90,90,90)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

export function frothTextures() {
  const map = make('froth-map', 1024, (ctx, s) => paintBubbles(ctx, s, 88, 'color'), true)
  const bump = make('froth-bump', 1024, (ctx, s) => paintBubbles(ctx, s, 88, 'bump'))
  // The dome's UVs wrap once around; repeat so each bubble reads at tumbler scale.
  map.repeat.set(3, 1.5)
  bump.repeat.set(3, 1.5)
  return { map, bump }
}

let material: MeshPhysicalMaterial | null = null

/** Creamy, matte froth with a soft sheen. */
export function frothMaterial() {
  if (material) return material
  const tex = frothTextures()
  material = new MeshPhysicalMaterial({
    map: tex.map,
    bumpMap: tex.bump,
    bumpScale: 5,
    // Light-caramel froth of decoction whipped with milk — not white cream.
    color: new Color('#c29d74'),
    roughness: 0.7,
    metalness: 0,
    sheen: 0.35,
    sheenColor: new Color('#e8c9a0'),
    sheenRoughness: 0.6,
    clearcoat: 0.15,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.25,
  })
  material.normalScale = new Vector2(1, 1)
  return material
}

let bubbleMat: MeshPhysicalMaterial | null = null

/** Glossy little bubbles of milk froth. Colour comes from per-instance tint. */
export function bubbleMaterial() {
  if (bubbleMat) return bubbleMat
  bubbleMat = new MeshPhysicalMaterial({
    color: new Color('#e9d6bb'),
    roughness: 0.4,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
    sheen: 0.2,
    sheenColor: new Color('#f4e4cc'),
    envMapIntensity: 0.35,
  })
  return bubbleMat
}

/** Where the froth surface is, for a point `t` (0 centre … 1 edge) across the crown. */
export const frothHeightAt = (t: number) => Math.pow(Math.sqrt(Math.max(0, 1 - t * t)), 0.45)

let dome: SphereGeometry | null = null

/** A soft, lumpy dome (radius 1, height 1) — clumps of foam rather than a perfect cap. */
export function frothDomeGeometry() {
  if (dome) return dome
  const base = new SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const merged = mergeVertices(base) as unknown as SphereGeometry
  const pos = merged.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const a = Math.atan2(z, x)
    // Gentle, soft undulation — bubbles of froth, strongest on top, none at the base edge
    // so the crown always sits inside the tumbler's mouth.
    const edge = Math.min(1, y * 3)
    const clumps = 1 + edge * (0.035 * Math.sin(a * 7 + y * 4) + 0.025 * Math.sin(a * 13 - y * 9) + 0.015 * Math.sin(a * 23 + y * 17))
    // Rises quickly at the edge, then a broad, gently domed top.
    const shoulder = Math.pow(y, 0.45)
    const r = Math.min(1, clumps)
    pos.setXYZ(i, x * r, shoulder * clumps, z * r)
  }
  merged.computeVertexNormals()
  dome = merged
  return merged
}
