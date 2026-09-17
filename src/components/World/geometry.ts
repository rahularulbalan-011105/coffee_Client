import { IcosahedronGeometry, LatheGeometry, PlaneGeometry, SphereGeometry, Vector2, type BufferGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { DABARA, TUMBLER } from './layout'

type P = [number, number]
const v = (pts: P[]) => pts.map(([x, y]) => new Vector2(x, y))
const geoCache = new Map<string, BufferGeometry>()

function cached(key: string, create: () => BufferGeometry) {
  let g = geoCache.get(key)
  if (!g) {
    g = create()
    geoCache.set(key, g)
  }
  return g
}

/* ------------------------------------------------------------------ profiles */

const { height: TH, radiusTop: RT, radiusBottom: RB } = TUMBLER

/** Tumbler inner wall (radius at height), used to size its liquid surface. */
export const TUMBLER_INNER: P[] = [
  [RB - 0.008, 0.03],
  [RT - 0.008, TH - 0.012],
]

const TUMBLER_PROFILE: P[] = [
  [0, 0],
  [RB - 0.004, 0],
  [RB + 0.008, 0.006],
  [RB + 0.01, 0.016],
  [RB + 0.002, 0.026],
  [RB, 0.04],
  [RB + 0.006, 0.05],
  [RB + 0.001, 0.058],
  [RT - 0.004, TH - 0.06],
  [RT + 0.004, TH - 0.05],
  [RT - 0.002, TH - 0.042],
  [RT, TH - 0.012],
  [RT + 0.007, TH - 0.003],
  [RT + 0.004, TH + 0.003],
  [RT - 0.004, TH],
  ...[...TUMBLER_INNER].reverse(),
  [0, 0.03],
]

export const DABARA_INNER: P[] = [
  [0.2, 0.018],
  [0.24, 0.05],
  [0.272, 0.1],
  [0.29, 0.14],
  [0.302, 0.166],
]

const DABARA_PROFILE: P[] = [
  [0, 0],
  [0.18, 0],
  [0.205, 0.004],
  [0.218, 0.014],
  [0.255, 0.05],
  [0.284, 0.1],
  [0.3, 0.14],
  [0.312, 0.158],
  [DABARA.rim, DABARA.height],
  [DABARA.rim + 0.008, DABARA.height + 0.007],
  [DABARA.rim - 0.004, DABARA.height + 0.011],
  ...[...DABARA_INNER].reverse(),
  [0, 0.014],
]

const FILTER_LOWER: P[] = [
  [0, 0],
  [0.28, 0],
  [0.296, 0.008],
  [0.3, 0.03],
  [0.3, 0.04],
  [0.305, 0.05],
  [0.3, 0.06],
  [0.3, 0.57],
  [0.312, 0.6],
  [0.318, 0.615],
  [0.31, 0.622],
  [0.29, 0.61],
  [0.29, 0.02],
  [0, 0.02],
]

const FILTER_UPPER: P[] = [
  [0.262, 0],
  [0.27, 0.1],
  [0.276, 0.116],
  [0.326, 0.12],
  [0.334, 0.13],
  [0.33, 0.14],
  [0.29, 0.142],
  [0.29, 0.575],
  [0.302, 0.592],
  [0.298, 0.602],
  [0.28, 0.598],
  [0.279, 0.14],
  [0.258, 0.12],
  [0.252, 0.004],
]

const FILTER_LID: P[] = [
  [0.305, 0],
  [0.312, 0.012],
  [0.3, 0.03],
  [0.27, 0.06],
  [0.2, 0.095],
  [0.1, 0.115],
  [0, 0.12],
]

const PRESS_DISC: P[] = [
  [0, 0.05],
  [0.08, 0.042],
  [0.18, 0.024],
  [0.245, 0.006],
  [0.25, 0],
  [0.24, 0],
  [0, 0.034],
]

const GRINDER_BODY: P[] = [
  [0.2, 0.2],
  [0.3, 0.215],
  [0.318, 0.24],
  [0.302, 0.272],
  [0.268, 0.3],
  [0.258, 0.34],
  [0.262, 0.66],
  [0.29, 0.7],
  [0.302, 0.75],
  [0.296, 0.8],
  [0.25, 0.86],
  [0.19, 0.92],
  [0.155, 0.97],
  [0.14, 1.02],
  [0.17, 1.06],
  [0.26, 1.13],
  [0.35, 1.22],
  [0.41, 1.3],
  [0.43, 1.335],
  [0.438, 1.345],
  [0.42, 1.35],
  [0.4, 1.31],
  [0.34, 1.235],
  [0.25, 1.145],
  [0.16, 1.075],
  [0.11, 1.045],
  [0.0, 1.04],
]

export const tumblerGeometry = (seg = 64) => cached(`tumbler${seg}`, () => new LatheGeometry(v(TUMBLER_PROFILE), seg))
export const dabaraGeometry = (seg = 72) => cached(`dabara${seg}`, () => new LatheGeometry(v(DABARA_PROFILE), seg))
export const filterLowerGeometry = (seg = 56) => cached(`fl${seg}`, () => new LatheGeometry(v(FILTER_LOWER), seg))
export const filterUpperGeometry = (seg = 56) => cached(`fu${seg}`, () => new LatheGeometry(v(FILTER_UPPER), seg))
export const filterLidGeometry = (seg = 56) => cached(`lid${seg}`, () => new LatheGeometry(v(FILTER_LID), seg))
export const pressDiscGeometry = (seg = 48) => cached(`press${seg}`, () => new LatheGeometry(v(PRESS_DISC), seg))
export const grinderBodyGeometry = (seg = 56) => cached(`grinder${seg}`, () => new LatheGeometry(v(GRINDER_BODY), seg))

/** Radius of a vessel's inner wall at height y (linear interpolation of the profile). */
export function innerRadiusAt(profile: P[], y: number) {
  if (y <= profile[0][1]) return profile[0][0]
  for (let i = 1; i < profile.length; i++) {
    const [r1, y1] = profile[i]
    const [r0, y0] = profile[i - 1]
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0)
  }
  return profile[profile.length - 1][0]
}

/* ---------------------------------------------------------------- coffee bean */

/**
 * Roasted bean: a flattened ellipsoid, one flat face carved with the S-shaped centre
 * cut, plus low-frequency irregularity so no two instances read as copies once scaled.
 * Local size ≈ 0.056 wide × 0.04 thick × 0.09 long.
 */
export function beanGeometry(detail: 'high' | 'low' = 'high') {
  return cached(`bean-${detail}`, () => {
    const sphere = detail === 'high' ? new SphereGeometry(1, 28, 20) : new SphereGeometry(1, 16, 12)
    sphere.deleteAttribute('uv')
    sphere.deleteAttribute('normal')
    const g = mergeVertices(sphere)
    sphere.dispose()
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let y = pos.getY(i)
      let z = pos.getZ(i)
      const flat = y > 0
      // Flat face on +Y, domed back on -Y.
      if (flat) y *= 0.42 + 0.18 * (1 - Math.abs(x))
      else y *= 0.62
      // Centre cut: a narrow S-curve groove across the flat face.
      if (flat) {
        const cx = 0.14 * Math.sin(z * 2.6)
        const d = x - cx
        const along = 1 - Math.pow(Math.abs(z), 3)
        y -= 0.34 * Math.exp(-(d * d) / 0.006) * along * (0.6 + y)
        // Lips of the groove slightly raised.
        y += 0.05 * Math.exp(-((Math.abs(d) - 0.12) ** 2) / 0.004) * along
      }
      // Irregular silhouette.
      const n = 1 + 0.045 * Math.sin(x * 5.1 + z * 3.3) + 0.03 * Math.sin(z * 7.7 - y * 4.1)
      x *= 0.62 * n
      z *= 1.0 * n
      y *= 0.9
      pos.setXYZ(i, x * 0.045, y * 0.045, z * 0.045)
    }
    g.computeVertexNormals()
    return g
  })
}

/* ------------------------------------------------------------- plantation */

/**
 * Coffee leaf: glossy ellipse with a drip tip, folded along the midrib and gently
 * arched. Base at the origin, tip at +Y, length 1.
 */
export function leafGeometry(detail: 'high' | 'low' = 'high') {
  return cached(`leaf-${detail}`, () => {
    const g = detail === 'high' ? new PlaneGeometry(1, 1, 4, 10) : new PlaneGeometry(1, 1, 2, 6)
    g.translate(0, 0.5, 0)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const width = Math.pow(Math.sin(Math.PI * Math.min(1, y * 1.02)), 0.75) * (1 - 0.25 * y) * 0.42
      const nx = x * 2 * width
      let z = -Math.abs(nx) * 0.45 + y * y * 0.28
      z += Math.sin(y * 16) * 0.018 * Math.abs(nx) * 3
      pos.setXYZ(i, nx, y, z)
    }
    g.computeVertexNormals()
    return g
  })
}

/** Coffee cherry: slightly oval drupe with a small calyx dimple. Radius 1. */
export function cherryGeometry(detail: 'high' | 'low' = 'high') {
  return cached(`cherry-${detail}`, () => {
    const sphere = detail === 'high' ? new SphereGeometry(1, 20, 14) : new SphereGeometry(1, 12, 8)
    sphere.deleteAttribute('uv')
    sphere.deleteAttribute('normal')
    const g = mergeVertices(sphere)
    sphere.dispose()
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      let y = pos.getY(i)
      const z = pos.getZ(i)
      y *= 1.12
      if (y > 0.9) y -= (y - 0.9) * 1.6
      pos.setXYZ(i, x, y, z)
    }
    g.computeVertexNormals()
    return g
  })
}

/** Soft, lumpy canopy blob for distant bushes and shade-tree crowns. */
export function blobGeometry(detail: 'high' | 'low' = 'high') {
  return cached(`blob-${detail}`, () => {
    const g = new IcosahedronGeometry(1, detail === 'high' ? 2 : 1)
    g.deleteAttribute('normal')
    g.deleteAttribute('uv')
    const m = mergeVertices(g)
    g.dispose()
    const pos = m.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const n = 1 + 0.16 * Math.sin(x * 5.3 + y * 2.1) + 0.12 * Math.sin(z * 6.1 - x * 3.7) + 0.08 * Math.sin(y * 9.3 + z * 4.2)
      pos.setXYZ(i, x * n, Math.max(-0.35, y) * n, z * n)
    }
    m.computeVertexNormals()
    return m
  })
}

/** Roaster hopper: inverted brass funnel. */
export function roasterHopperGeometry(seg = 48) {
  return cached(`hopper${seg}`, () =>
    new LatheGeometry(
      v([
        [0.09, 0],
        [0.12, 0.06],
        [0.18, 0.14],
        [0.36, 0.42],
        [0.46, 0.6],
        [0.48, 0.64],
        [0.46, 0.64],
        [0.34, 0.44],
        [0.16, 0.16],
        [0.07, 0.06],
      ]),
      seg,
    ),
  )
}

/**
 * Every mesh that ships in /models/coffee-kit.glb. The build script serialises these,
 * and the runtime can fall back to them if the GLB is unavailable.
 */
export function buildKit(detail: 'high' | 'low' = 'high'): Record<string, BufferGeometry> {
  const hi = detail === 'high'
  return {
    bean: beanGeometry(detail),
    cherry: cherryGeometry(detail),
    leaf: leafGeometry(detail),
    leafLow: leafGeometry('low'),
    // Canopy cores are few and close to camera: always the smoother blob.
    blob: blobGeometry('high'),
    blobLow: blobGeometry('low'),
    tumbler: tumblerGeometry(hi ? 72 : 36),
    dabara: dabaraGeometry(hi ? 96 : 40),
    filterLower: filterLowerGeometry(hi ? 64 : 32),
    filterUpper: filterUpperGeometry(hi ? 64 : 32),
    filterLid: filterLidGeometry(hi ? 64 : 32),
    pressDisc: pressDiscGeometry(hi ? 64 : 32),
    grinderBody: grinderBodyGeometry(hi ? 64 : 32),
    roasterHopper: roasterHopperGeometry(hi ? 48 : 24),
  }
}

export type KitName = keyof ReturnType<typeof buildKit>
