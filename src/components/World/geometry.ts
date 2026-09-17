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

/* Traditional brass set (after the reference): outer profile first, then the inner wall. */

const TUMBLER_OUTER: P[] = [
  [0, 0],
  [RB - 0.004, 0],
  [RB, 0.004],
  [RB + 0.002, 0.016],
  [RB + (RT - RB) * 0.25, TH * 0.25],
  [RB + (RT - RB) * 0.5, TH * 0.5],
  [RB + (RT - RB) * 0.75, TH * 0.75],
  [RT, TH - 0.03],
  [RT + 0.006, TH - 0.014],
  [RT + 0.016, TH - 0.003],
  [RT + 0.021, TH + 0.002],
]

/** Tumbler inner wall (radius at height), used to size its liquid surface. */
export const TUMBLER_INNER: P[] = [
  [RB - 0.007, 0.024],
  [RT - 0.007, TH - 0.03],
  [RT + 0.004, TH - 0.008],
]

const TUMBLER_PROFILE: P[] = [...TUMBLER_OUTER, [RT + 0.017, TH + 0.005], ...[...TUMBLER_INNER].reverse(), [0, 0.024]]

const DH = DABARA.height
const DR = DABARA.radius

const DABARA_OUTER: P[] = [
  [0, 0],
  [DR - 0.035, 0],
  [DR - 0.02, 0.004],
  [DR - 0.013, 0.02],
  [DR - 0.008, DH * 0.35],
  [DR - 0.004, DH * 0.7],
  [DR, DH - 0.016],
  [DR + 0.012, DH - 0.01],
  [DABARA.rim - 0.01, DH - 0.006],
  [DABARA.rim, DH - 0.002],
  [DABARA.rim + 0.003, DH + 0.003],
]

export const DABARA_INNER: P[] = [
  [DR - 0.04, 0.014],
  [DR - 0.022, 0.03],
  [DR - 0.016, DH * 0.35],
  [DR - 0.012, DH * 0.7],
  [DR - 0.008, DH - 0.004],
]

const DABARA_PROFILE: P[] = [
  ...DABARA_OUTER,
  [DABARA.rim - 0.004, DH + 0.006],
  [DR + 0.01, DH + 0.004],
  ...[...DABARA_INNER].reverse(),
  [0, 0.014],
]

/** The coffee that fills the dabara: its interior as a closed solid (cut at the level at runtime). */
export function dabaraLiquidGeometry() {
  return cached('dabara-liquid', () =>
    new LatheGeometry(
      v([
        [0, DABARA_INNER[0][1] + 0.002],
        ...DABARA_INNER.map(([r, y]) => [r - 0.004, y] as P),
        [0, DH - 0.004],
      ]),
      48,
    ),
  )
}

/**
 * Lathe whose v coordinate follows height on the outer wall (0 at the base, 1 at the rim),
 * so an engraved band can be placed by height. Inner surfaces get v = 0 (plain metal).
 */
function vesselLathe(profile: P[], outerCount: number, height: number, seg: number) {
  const g = new LatheGeometry(v(profile), seg)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  const n = profile.length
  for (let i = 0; i < pos.count; i++) {
    const j = i % n
    uv.setY(i, j < outerCount ? Math.min(1, Math.max(0, pos.getY(i) / height)) : 0)
  }
  uv.needsUpdate = true
  return g
}

/* Brass filter (after the reference): two flush cylinders and a stepped cap with a ball knob. */

const FILTER_LOWER_OUTER: P[] = [
  [0, 0],
  [0.29, 0],
  [0.298, 0.006],
  [0.3, 0.02],
  [0.3, 0.6],
  [0.302, 0.614],
  [0.298, 0.622],
]
const FILTER_LOWER: P[] = [...FILTER_LOWER_OUTER, [0.29, 0.62], [0.29, 0.02], [0, 0.02]]

// Upper chamber, local y = 0 at its base (which slides 0.12 into the lower chamber).
const FILTER_UPPER_OUTER: P[] = [
  [0.284, 0],
  [0.286, 0.118],
  [0.3, 0.121],
  [0.3, 0.588],
  [0.302, 0.598],
  [0.296, 0.604],
]
const FILTER_UPPER: P[] = [...FILTER_UPPER_OUTER, [0.284, 0.6], [0.276, 0.12], [0.274, 0.004]]

// Lid, local y = 0 at the chamber rim: a skirt over the rim, a step, a low dome.
const FILTER_LID: P[] = [
  [0.296, -0.038],
  [0.308, -0.034],
  [0.309, 0.03],
  [0.304, 0.04],
  [0.272, 0.046],
  [0.268, 0.058],
  [0.2, 0.072],
  [0.1, 0.08],
  [0, 0.082],
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

export const tumblerGeometry = (seg = 64) => cached(`tumbler${seg}`, () => vesselLathe(TUMBLER_PROFILE, TUMBLER_OUTER.length, TH, seg))
export const dabaraGeometry = (seg = 72) => cached(`dabara${seg}`, () => vesselLathe(DABARA_PROFILE, DABARA_OUTER.length, DH, seg))
export const filterLowerGeometry = (seg = 56) => cached(`fl${seg}`, () => vesselLathe(FILTER_LOWER, FILTER_LOWER_OUTER.length, 0.62, seg))
export const filterUpperGeometry = (seg = 56) => cached(`fu${seg}`, () => vesselLathe(FILTER_UPPER, FILTER_UPPER_OUTER.length, 0.6, seg))
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
export function beanGeometry(detail: 'high' | 'low' | 'tiny' = 'high') {
  return cached(`bean-${detail}`, () => {
    const sphere =
      detail === 'high' ? new SphereGeometry(1, 28, 20) : detail === 'low' ? new SphereGeometry(1, 16, 12) : new SphereGeometry(1, 12, 8)
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
    const g = detail === 'high' ? new PlaneGeometry(1, 1, 8, 16) : new PlaneGeometry(1, 1, 6, 12)
    g.translate(0, 0.5, 0)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      // Broad elliptic blade with a drip tip.
      const width = Math.pow(Math.sin(Math.PI * Math.min(1, y * 1.02)), 0.6) * (1 - 0.3 * y * y) * 0.4
      const nx = x * 2 * width
      // Gentle V-fold along the midrib, smooth arch along the length, slight wavy margin.
      let z = -Math.abs(nx) * 0.18 + y * y * 0.16
      z += Math.sin(y * 18) * 0.012 * Math.abs(x) * 2
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
