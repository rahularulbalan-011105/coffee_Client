import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three'
import { sceneState } from '../../animation/journey'
import { leafMatTextures } from './foliageTextures'
import { applyFoliageNoise, getMaterials } from './materials'
import { BRANCH, ESTATE_SUN } from './layout'
import { rng } from './math'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Chikmagalur on a misty, overcast morning: coffee planted in hedgerows along the contours of
 * the slope, the same rows striping the far hillsides, forest on the crests and tall silver
 * oaks standing over the estate, ridges fading into grey cloud.
 */

type Detail = 'high' | 'low'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Ground height. The story starts on a slope that drops into a valley, with hills beyond. */
export function terrainHeight(x: number, z: number) {
  const away = Math.max(0, -z)
  const valley = -smoothstep(0, 150, away) * 36
  const lateral = -0.07 * x * smoothstep(0, 90, away)
  const leftHill = smoothstep(-20, -220, x) * smoothstep(10, 140, away) * 42
  const farHills = smoothstep(170, 340, away) * (78 + 34 * Math.sin(x * 0.011 + 0.6) + 22 * Math.sin(x * 0.031))
  const rolling = Math.sin(x * 0.045 + z * 0.02) * 1.6 + Math.sin(z * 0.06 - x * 0.013) * 1.2
  const nearFlat = smoothstep(8, 40, Math.hypot(x - BRANCH.x, z - BRANCH.z))
  return (valley + lateral + leftHill + farHills + rolling) * nearFlat
}

/** Where the far hillsides are planted (1) rather than left to forest (0). */
export function plantedMask(x: number, z: number) {
  const n = Math.sin(x * 0.017 + 1.3) * 0.6 + Math.sin(z * 0.013 + 0.4) * 0.6 + Math.sin((x + z) * 0.009) * 0.4
  return smoothstep(-0.1, 0.3, n)
}
const PLANTED_GLSL = /* glsl */ `
  float plantedMask(vec2 p) {
    float n = sin(p.x * 0.017 + 1.3) * 0.6 + sin(p.y * 0.013 + 0.4) * 0.6 + sin((p.x + p.y) * 0.009) * 0.4;
    return smoothstep(-0.1, 0.3, n);
  }
`

/* --------------------------------------------------------------- shared shader bits */

const HAZE_GLSL = /* glsl */ `
  uniform vec3 uSun; uniform vec3 uSunColor; uniform vec3 uHaze;
  vec3 sunHaze(vec3 col, vec3 worldPos, float amount) {
    vec3 v = normalize(worldPos - cameraPosition);
    float glow = pow(max(dot(v, uSun), 0.0), 8.0);
    vec3 haze = mix(uHaze, uSunColor, glow * 0.7);
    return mix(col, haze, clamp(amount, 0.0, 1.0));
  }
`

const sunUniforms = () => ({
  uSun: { value: ESTATE_SUN.clone() },
  uSunColor: { value: new Color('#e6e8e3') },
  uHaze: { value: new Color('#b2b9af') },
})

/* ---------------------------------------------------------------- terrain */

function Terrain({ detail }: { detail: Detail }) {
  const geometry = useMemo(() => {
    const seg = detail === 'high' ? 150 : 56
    const g = new PlaneGeometry(1800, 1800, seg, seg)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, -560)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const soil = new Color('#8a7650')
    const grass = new Color('#8fa86a')
    const forest = new Color('#35573a')
    const slopes = new Float32Array(pos.count)
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = terrainHeight(x, z)
      pos.setY(i, y)
      const away = Math.max(0, -z)
      // Paths between the rows: grass worn to soil in places.
      const worn = 0.5 + 0.5 * Math.sin(x * 0.13 + z * 0.07) * Math.sin(z * 0.21 - x * 0.05)
      c.copy(grass).lerp(soil, worn * 0.45)
      c.lerp(forest, smoothstep(110, 200, away) * (1 - plantedMask(x, z)))
      colors.set([c.r, c.g, c.b], i * 3)
      slopes[i] = Math.hypot(terrainHeight(x + 2, z) - y, terrainHeight(x, z + 2) - y) / 2
    }
    g.setAttribute('aSlope', new BufferAttribute(slopes, 1))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [detail])
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
    applyFoliageNoise(m, 0.6)
    // On the far slopes the coffee is too small to model: paint its hedgerows as contour
    // stripes (rows follow constant height, so they bend with every fold of the hill).
    const foliage = m.onBeforeCompile
    m.onBeforeCompile = (shader, renderer) => {
      foliage(shader, renderer)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aSlope;\nvarying float vSlope;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvSlope = aSlope;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying float vSlope;\n${PLANTED_GLSL}`)
        .replace(
          'diffuseColor.rgb *= 0.5 + folN * 0.9;',
          `float away = max(0.0, -vFolPos.z);
          float planted = smoothstep(95.0, 140.0, away) * plantedMask(vFolPos.xz) * smoothstep(0.08, 0.2, vSlope);
          float period = 2.2 * (1.0 + away / 260.0);
          float rowC = vFolPos.y / period + folNoise(vFolPos * 0.04) * 0.35;
          float row = fract(rowC);
          float hedge = smoothstep(0.2, 0.32, row) * smoothstep(0.86, 0.74, row);
          // Too fine to resolve far away: settle to the average instead of shimmering.
          hedge = mix(hedge, 0.55, clamp(fwidth(rowC) * 1.5, 0.0, 1.0));
          vec3 rows = mix(vec3(0.42, 0.40, 0.27), vec3(0.24, 0.40, 0.2), hedge);
          diffuseColor.rgb = mix(diffuseColor.rgb, rows, planted);
          diffuseColor.rgb *= 0.5 + folN * 0.9;`,
        )
    }
    m.customProgramCacheKey = () => 'estate-terrain-rows'
    return m
  }, [])
  return <mesh geometry={geometry} material={material} receiveShadow />
}

/* -------------------------------------------------------------- mountains */

const ridgeVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vH;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vH = position.y;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const ridgeFragment = /* glsl */ `
  uniform vec3 uBody; uniform float uHazeAmt; uniform float uTop; uniform float uBase;
  varying vec2 vUv; varying float vH; varying vec3 vWorld;
  ${HAZE_GLSL}
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float h = clamp((vH - uBase) / (uTop - uBase), 0.0, 1.0);
    vec3 col = uBody * (0.7 + 0.3 * h);
    // Forest texture on the slopes.
    col *= 0.85 + 0.3 * hash(floor(vUv * vec2(1400.0, 90.0)));
    // Low mist pooling in the folds, thinning towards the crest.
    float mist = uHazeAmt + (1.0 - uHazeAmt) * (1.0 - smoothstep(0.0, 0.55, h)) * 0.9;
    col = sunHaze(col, vWorld, mist);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

function Mountains() {
  const layers = useMemo(() => {
    const r = rng(4)
    const specs = [
      { z: -390, base: 20, top: 120, haze: 0.3, body: '#3f6a3c', treeline: 1 },
      { z: -560, base: 40, top: 190, haze: 0.5, body: '#557a53', treeline: 0.6 },
      { z: -780, base: 60, top: 270, haze: 0.68, body: '#6f8a70', treeline: 0.3 },
      { z: -1080, base: 80, top: 340, haze: 0.84, body: '#8f9d92', treeline: 0 },
    ]
    return specs.map((spec, li) => {
      const seg = 360
      const g = new PlaneGeometry(4200, 1, seg, 1)
      const pos = g.attributes.position
      const phase = r() * 100
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        if (pos.getY(i) < 0) {
          pos.setY(i, spec.base - 80)
          continue
        }
        // Ridged noise gives rounded Western Ghats peaks with sharper saddles.
        const ridge = (f: number, p: number) => 1 - Math.abs(Math.sin(x * f + p))
        let n = ridge(0.0042, phase) * 0.55 + ridge(0.011, phase * 1.7) * 0.28 + ridge(0.027, phase * 0.3) * 0.12
        n = Math.pow(n, 1.6)
        // A fringe of canopy along the skyline on the nearer ridges.
        const trees = spec.treeline * (Math.sin(x * 0.9 + phase) * 0.5 + Math.sin(x * 2.3) * 0.3 + 0.8) * 1.6
        pos.setY(i, spec.base + n * (spec.top - spec.base) + trees)
      }
      const m = new ShaderMaterial({
        vertexShader: ridgeVertex,
        fragmentShader: ridgeFragment,
        depthWrite: li === 0,
        transparent: li > 0,
        uniforms: {
          ...sunUniforms(),
          uBody: { value: new Color(spec.body) },
          uHazeAmt: { value: spec.haze },
          uTop: { value: spec.top },
          uBase: { value: spec.base - 30 },
        },
      })
      return { geometry: g, material: m, z: spec.z, order: -5 - li }
    })
  }, [])

  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={l.material} position={[0, 0, l.z]} renderOrder={l.order} frustumCulled={false} />
      ))}
    </group>
  )
}

/* --------------------------------------------------------- instancing helper */

function Instances({
  geometry,
  material,
  mats,
  cols,
  shadow,
}: {
  geometry: BufferGeometry
  material: Material
  mats: Matrix4[]
  cols: Color[]
  shadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    mats.forEach((mt, i) => {
      m.setMatrixAt(i, mt)
      if (cols[i]) m.setColorAt(i, cols[i])
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [mats, cols])
  if (mats.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, mats.length]} castShadow={shadow} receiveShadow={shadow} />
}

const up = new Vector3(0, 1, 0)
const HEDGE_GREENS = ['#4a7c3c', '#558844', '#447238', '#5e924b', '#4f8240', '#48793a']


/* ------------------------------------------------------------ foliage cards */

const cardBasisX = new Vector3()
const cardBasisY = new Vector3()
const cardBasisZ = new Vector3()
const cardRot = new Matrix4()

/**
 * A bush made of leaf cards: each card is a painted sprig, placed on (and inside) an
 * ellipsoid and turned outwards. Inner cards are darker — cheap ambient occlusion.
 */
function addBush(
  out: Matrix4[],
  cols: Color[],
  r: () => number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  cards: number,
  size: number,
  tint: Color,
) {
  const dir = new Vector3()
  for (let i = 0; i < cards; i++) {
    const th = r() * Math.PI * 2
    const ph = Math.acos(1 - r() * 1.75)
    dir.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th))
    const depth = 0.35 + 0.65 * Math.sqrt(r())
    const pos = new Vector3(cx + dir.x * rx * depth, cy + dir.y * ry * depth, cz + dir.z * rx * depth)
    // Face outwards, sprig stems pointing roughly down into the bush.
    cardBasisZ.copy(dir).add(new Vector3((r() - 0.5) * 0.6, (r() - 0.5) * 0.4, (r() - 0.5) * 0.6)).normalize()
    cardBasisX.crossVectors(up, cardBasisZ)
    if (cardBasisX.lengthSq() < 1e-4) cardBasisX.set(1, 0, 0)
    cardBasisX.normalize()
    cardBasisY.crossVectors(cardBasisZ, cardBasisX)
    cardRot.makeBasis(cardBasisX, cardBasisY, cardBasisZ)
    const roll = new Quaternion().setFromAxisAngle(cardBasisZ, (r() - 0.5) * 1.1)
    const qq = new Quaternion().setFromRotationMatrix(cardRot).premultiply(roll)
    const sz = size * (0.75 + r() * 0.5)
    out.push(new Matrix4().compose(pos, qq, new Vector3(sz, sz, sz)))
    cols.push(tint.clone().multiplyScalar((0.5 + 0.7 * depth) * (0.85 + r() * 0.3)))
  }
}

/* ------------------------------------------------------------ terraced rows */

/**
 * Coffee hedgerows along the slope. Each row is a solid rounded hedge (so there are no
 * see-through gaps) clad in leaf sprigs turned outwards from the row, with a slight swell
 * at every plant. Paths of grass and soil run between the rows.
 */
function Terraces({ detail }: { detail: Detail }) {
  const m = getMaterials()
  const cardGeo = useMemo(() => new PlaneGeometry(1, 1), [])
  const coreMaterial = useMemo(() => {
    // The hedge body is clad in a seamless mat of painted coffee leaves.
    const mat = leafMatTextures()
    return new MeshStandardMaterial({
      map: mat.map,
      normalMap: mat.normal,
      normalScale: new Vector2(1.1, 1.1),
      color: new Color('#b8d3a2'),
      roughness: 0.55,
      metalness: 0,
      envMapIntensity: 0.5,
    })
  }, [])

  const data = useMemo(() => {
    const r = rng(21)
    const cards: Matrix4[] = []
    const cardCols: Color[] = []
    const farCards: Matrix4[] = []
    const farCols: Color[] = []
    const cores: BufferGeometry[] = []
    const rowStep = detail === 'high' ? 15 : 18
    const radius = 3.1
    // Hedge centre above the ground: about five units of bush stand above the path.
    const lift = 0.9
    const dir = new Vector3()
    const tangent = new Vector3()
    const side = new Vector3()

    const blocked = (x: number, z: number) => (x > -11 && x < 13 && z > 4) || Math.hypot(x - BRANCH.x, z - BRANCH.z) < 12

    for (let z0 = 42; z0 > -120; z0 -= rowStep) {
      const halfWidth = 40 + Math.max(0, 44 - z0)
      // Follow the lie of the land: a gentle, row-specific curve.
      const bend = (x: number) => Math.sin(x * 0.018 + z0 * 0.1) * 4.5 + Math.sin(x * 0.047 + z0) * 1.2
      let run: Vector3[] = []
      const flush = () => {
        if (run.length >= 4) {
          const curve = new CatmullRomCurve3(run)
          const len = curve.getLength()
          const tube = new TubeGeometry(curve, Math.max(6, Math.round(len / 1.2)), radius, 12, false)
          // Individual plants: each bush swells out of the row, with a lumpy, uneven crown.
          const tp = tube.attributes.position
          const tn = tube.attributes.normal
          const uv = tube.attributes.uv
          const seed = r() * 100
          for (let k = 0; k < tp.count; k++) {
            const along = uv.getX(k) * len
            const around = uv.getY(k) * Math.PI * 2
            const plant = Math.sin((along / 4.6) * Math.PI * 2 + seed)
            const bulge =
              0.16 * plant * plant +
              0.07 * Math.sin(around * 3 + along * 0.9 + seed) +
              0.05 * Math.sin(along * 2.3 + around * 5 + seed * 2) -
              0.08
            tp.setXYZ(k, tp.getX(k) + tn.getX(k) * radius * bulge, tp.getY(k) + tn.getY(k) * radius * bulge, tp.getZ(k) + tn.getZ(k) * radius * bulge)
            // One leaf tile per ~4.5 units along the row and four around it.
            uv.setXY(k, uv.getX(k) * (len / 4.5), uv.getY(k) * 4)
          }
          tube.computeVertexNormals()
          cores.push(tube)
          // Leaf sprigs over the upper surface of the hedge.
          const mid = run[Math.floor(run.length / 2)]
          const near = Math.hypot(mid.x + 2, mid.z - 44) < 70
          const density = near ? (detail === 'high' ? 7.5 : 3.8) : detail === 'high' ? 2.4 : 1.2
          const count = Math.round(len * density)
          for (let i = 0; i < count; i++) {
            const t = r()
            const p = curve.getPointAt(t)
            curve.getTangentAt(t, tangent)
            side.crossVectors(tangent, up).normalize()
            // Upper half of the hedge only (the rest is in the ground or in shade).
            const a = (r() - 0.5) * Math.PI * 1.05
            const plant = 0.92 + 0.12 * Math.sin(t * len * 0.9)
            dir.copy(up).multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)).addScaledVector(tangent, (r() - 0.5) * 0.4).normalize()
            const pos = p.clone().addScaledVector(dir, radius * (0.85 + r() * 0.25) * plant)
            cardBasisZ.copy(dir).add(new Vector3((r() - 0.5) * 0.5, (r() - 0.5) * 0.3, (r() - 0.5) * 0.5)).normalize()
            cardBasisX.crossVectors(up, cardBasisZ)
            if (cardBasisX.lengthSq() < 1e-4) cardBasisX.copy(tangent)
            cardBasisX.normalize()
            cardBasisY.crossVectors(cardBasisZ, cardBasisX)
            cardRot.makeBasis(cardBasisX, cardBasisY, cardBasisZ)
            const q = new Quaternion().setFromRotationMatrix(cardRot).premultiply(new Quaternion().setFromAxisAngle(cardBasisZ, (r() - 0.5) * 1.2))
            const sz = (near ? 3.3 : 5) * (0.8 + r() * 0.4)
            const shade = (0.8 + 0.3 * Math.cos(a)) * (0.9 + r() * 0.2)
            const tint = new Color(HEDGE_GREENS[Math.floor(r() * HEDGE_GREENS.length)]).multiplyScalar(1.95 * shade)
            ;(near ? cards : farCards).push(new Matrix4().compose(pos, q, new Vector3(sz, sz, sz)))
            ;(near ? cardCols : farCols).push(tint)
          }
        }
        run = []
      }
      for (let x = -halfWidth; x <= halfWidth; x += 3) {
        const z = z0 + bend(x)
        if (blocked(x, z)) {
          flush()
          continue
        }
        run.push(new Vector3(x, terrainHeight(x, z) + lift, z))
      }
      flush()
    }

    // The hero bush the harvest branch belongs to.
    const hx = BRANCH.x + 3.5
    const hz = BRANCH.z - 8.5
    const hy = terrainHeight(BRANCH.x, BRANCH.z) + 8.5
    addBush(cards, cardCols, r, hx, hy, hz, 5.5, 8, detail === 'high' ? 420 : 200, 2.4, new Color('#4f8a3e').multiplyScalar(2))
    // Its body, so the bush reads as one plant rather than a cloud of loose sprigs.
    const body = new SphereGeometry(1, 20, 14)
    body.scale(5.5 * 0.62, 8 * 0.62, 5.5 * 0.62).translate(hx, hy, hz)
    const buv = body.attributes.uv
    for (let k = 0; k < buv.count; k++) buv.setXY(k, buv.getX(k) * 6, buv.getY(k) * 4)
    cores.push(body)
    const core = mergeGeometries(cores)
    cores.forEach((g) => g.dispose())
    return { cards, cardCols, farCards, farCols, core }
  }, [detail])

  return (
    <group>
      <mesh geometry={data.core} material={coreMaterial} receiveShadow />
      <Instances geometry={cardGeo} material={m.leafCard} mats={data.cards} cols={data.cardCols} />
      <Instances geometry={cardGeo} material={m.leafCardFar} mats={data.farCards} cols={data.farCols} />
    </group>
  )
}

/* ------------------------------------------------------------- forest + trees */

const NO_COLORS: Color[] = []

function Forest({ detail }: { detail: Detail }) {
  const m = getMaterials()
  const cardGeo = useMemo(() => new PlaneGeometry(1, 1), [])
  const trunkGeo = useMemo(() => {
    const g = new CylinderGeometry(0.35, 0.8, 1, 6, 1, true)
    g.translate(0, 0.5, 0)
    return g
  }, [])

  const data = useMemo(() => {
    const r = rng(9)
    const cards: Matrix4[] = []
    const cardCols: Color[] = []
    const trunks: Matrix4[] = []
    const darkGreens = ['#35603a', '#40703f', '#2f5733', '#4a7a4a']

    // Forest canopy across the valley and the far hills: clumps of sprig cards.
    const clumps = detail === 'high' ? 300 : 150
    for (let i = 0; i < clumps; i++) {
      const z = -190 - r() * 220
      const spread = 120 + Math.max(0, -z) * 1.1
      const x = (r() - 0.5) * spread * 2
      // Forest keeps the crests and the unplanted folds; the planted slopes stay open.
      if (plantedMask(x, z) > 0.5 && r() < 0.85) continue
      const y = terrainHeight(x, z)
      const sz = 9 + r() * 10
      const tint = new Color(darkGreens[Math.floor(r() * 4)]).multiplyScalar(2)
      addBush(cards, cardCols, r, x, y + sz * 0.5, z, sz, sz * 0.75, detail === 'high' ? 22 : 10, sz * 0.9, tint)
    }

    // A few tall silver oaks, as in the hills of Chikmagalur.
    const tree = (x: number, z: number, h: number) => {
      const y = terrainHeight(x, z)
      trunks.push(new Matrix4().compose(new Vector3(x, y - 1, z), new Quaternion(), new Vector3(0.6 + h / 140, h, 0.6 + h / 140)))
      // Silver oak: a narrow, feathery column of foliage over the upper half of the trunk.
      const tiers = 5
      for (let k = 0; k < tiers; k++) {
        const t = k / (tiers - 1)
        const cs = (4.2 - t * 2.2) * (h / 70) * (0.9 + r() * 0.2)
        const tint = new Color(darkGreens[Math.floor(r() * 4)]).multiplyScalar(2.1 + t * 0.3)
        addBush(cards, cardCols, r, x + (r() - 0.5) * 0.6, y + h * (0.5 + t * 0.48), z + (r() - 0.5) * 0.6, cs, cs * 0.9, detail === 'high' ? 26 : 12, cs * 0.75, tint)
      }
    }
    const scattered = detail === 'high' ? 6 : 3
    for (let i = 0; i < scattered; i++) {
      const z = -20 - r() * 100
      const x = (r() > 0.5 ? 1 : -1) * (30 + r() * (40 + Math.max(0, -z)))
      tree(x, z, 45 + r() * 30)
    }
    const far = detail === 'high' ? 22 : 10
    for (let i = 0; i < far; i++) {
      const z = -130 - r() * 230
      const x = (r() - 0.5) * (260 + Math.max(0, -z))
      tree(x, z, 55 + r() * 45)
    }
    return { cards, cardCols, trunks }
  }, [detail])

  return (
    <group>
      <Instances geometry={cardGeo} material={m.canopyCard} mats={data.cards} cols={data.cardCols} />
      <Instances geometry={trunkGeo} material={m.bark} mats={data.trunks} cols={NO_COLORS} />
    </group>
  )
}

/* ---------------------------------------------------------------- waterfall */

const simpleVertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const fallFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float cols = floor(vUv.x * 18.0);
    float speed = 0.6 + hash(vec2(cols, 1.0)) * 0.6;
    float streak = hash(vec2(cols, floor(vUv.y * 22.0 + uTime * speed * 6.0)));
    float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    float a = (0.45 + streak * 0.55) * edge * fade;
    gl_FragColor = vec4(vec3(0.86, 0.87, 0.84), a * 0.8);
  }
`

function Waterfall() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: simpleVertex,
        fragmentShader: fallFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
      }),
    [],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  const x = 175
  const z = -250
  const y = terrainHeight(x, z)
  return (
    <mesh position={[x, y + 26, z + 14]} rotation-y={-0.35} material={material} renderOrder={2}>
      <planeGeometry args={[5, 44]} />
    </mesh>
  )
}

/* -------------------------------------------------------------------- mist */

const mistVertex = /* glsl */ `
  varying vec2 vUv; varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const mistFragment = /* glsl */ `
  uniform float uTime; uniform float uSeed; uniform float uOpacity;
  varying vec2 vUv; varying vec3 vWorld;
  ${HAZE_GLSL}
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
  void main() {
    vec2 p = vec2(vUv.x * 10.0 + uTime * 0.01 + uSeed, vUv.y * 1.8);
    float n = fbm(p) * 1.15;
    float band = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
    float a = smoothstep(0.3, 0.8, n) * band;
    vec3 col = sunHaze(vec3(0.72, 0.7, 0.66), vWorld, 0.75);
    gl_FragColor = vec4(col, a * uOpacity);
  }
`

function MistLayers({ detail }: { detail: Detail }) {
  const layers = useMemo(() => {
    const all = [
      { z: -120, y: -16, w: 600, h: 40, o: 0.3 },
      { z: -230, y: 6, w: 900, h: 60, o: 0.6 },
      { z: -360, y: 40, w: 1400, h: 80, o: 0.55 },
      { z: -520, y: 80, w: 2000, h: 110, o: 0.5 },
      { z: -720, y: 120, w: 2800, h: 140, o: 0.45 },
    ]
    const specs = detail === 'high' ? all : [all[0], all[2], all[3]]
    return specs.map((s, i) => ({
      ...s,
      material: new ShaderMaterial({
        vertexShader: mistVertex,
        fragmentShader: mistFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { ...sunUniforms(), uTime: { value: 0 }, uSeed: { value: i * 7.3 }, uOpacity: { value: s.o } },
      }),
    }))
  }, [detail])

  useFrame(({ clock }) => {
    for (const l of layers) l.material.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.y, l.z]} material={l.material} renderOrder={1 + i} frustumCulled={false}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------- estate */

export default function Estate({ detail }: { detail: Detail }) {
  const group = useRef<Group>(null)

  useFrame(() => {
    if (group.current) group.current.visible = sceneState.pos < 2.3
  }, -1)

  return (
    <group ref={group}>
      <Mountains />
      <Terrain detail={detail} />
      <Terraces detail={detail} />
      <Forest detail={detail} />
      <Waterfall />
      <MistLayers detail={detail} />
    </group>
  )
}
