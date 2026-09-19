import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three'
import { sceneState } from '../../animation/journey'
import { applyFoliageNoise, getMaterials } from './materials'
import { BRANCH, ESTATE_SUN } from './layout'
import { rng, sub } from './math'

/**
 * Chikmagalur at the edge of a monsoon evening: terraced rows falling into a misty valley,
 * forested hills and tall silver oaks, ridges fading into a warm, rain-soaked sunset.
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
    const soil = new Color('#4e4a2c')
    const green = new Color('#4a7a38')
    const lush = new Color('#78a852')
    const forest = new Color('#35573a')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, terrainHeight(x, z))
      const away = Math.max(0, -z)
      const row = 0.5 + 0.5 * Math.sin(z * 0.48 + Math.sin(x * 0.02) * 2)
      c.copy(green).lerp(lush, row * 0.7).lerp(soil, (1 - row) * 0.2)
      c.lerp(forest, smoothstep(110, 200, away))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [detail])
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
    applyFoliageNoise(m, 0.6)
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
const HEDGE_GREENS = ['#5a8c4a', '#659852', '#528446', '#6fa05a', '#5e904d', '#568846']


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

function Terraces({ detail }: { detail: Detail }) {
  const m = getMaterials()
  const cardGeo = useMemo(() => new PlaneGeometry(1, 1), [])

  const data = useMemo(() => {
    const r = rng(21)
    const cards: Matrix4[] = []
    const cardCols: Color[] = []
    const farCards: Matrix4[] = []
    const farCols: Color[] = []
    const rowStep = detail === 'high' ? 12 : 16
    const along = detail === 'high' ? 6.5 : 8.5

    for (let z = 40; z > -150; z -= rowStep) {
      const halfWidth = 34 + Math.max(0, 44 - z) * 0.95
      for (let x = -halfWidth; x <= halfWidth; x += along * (1 + Math.max(0, -z) / 160)) {
        // Rows follow the contour of the slope.
        const pz = z + Math.sin(x * 0.02 + z * 0.1) * 4 + (r() - 0.5) * 1.2
        const px = x + (r() - 0.5) * 1.5
        if (px > -10 && px < 12 && pz > 6) continue // camera flight path
        if (Math.hypot(px - BRANCH.x, pz - BRANCH.z) < 9) continue
        const gy = terrainHeight(px, pz)
        const s = 1 + Math.max(0, -pz) / 200
        const dist = Math.hypot(px + 2, pz - 44)
        // Level of detail: many small sprigs up close, a few big ones far away.
        const n = dist < 40 ? (detail === 'high' ? 70 : 34) : dist < 90 ? (detail === 'high' ? 26 : 14) : detail === 'high' ? 12 : 7
        const size = (dist < 40 ? 3.2 : dist < 90 ? 4.6 : 6.2) * s
        const tint = new Color(HEDGE_GREENS[Math.floor(r() * HEDGE_GREENS.length)]).multiplyScalar(1.95)
        if (dist < 40) addBush(cards, cardCols, r, px, gy + 4 * s, pz, along * 0.62 * s, 3.8 * s, n, size, tint)
        else addBush(farCards, farCols, r, px, gy + 4 * s, pz, along * 0.62 * s, 3.8 * s, n, size, tint)
      }
    }

    // The hero bush the harvest branch belongs to.
    const hx = BRANCH.x + 3.5
    const hz = BRANCH.z - 8.5
    addBush(cards, cardCols, r, hx, terrainHeight(BRANCH.x, BRANCH.z) + 8.5, hz, 5.5, 8, detail === 'high' ? 85 : 45, 3.0, new Color('#5a9444').multiplyScalar(2))
    return { cards, cardCols, farCards, farCols }
  }, [detail])

  return (
    <group>
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
      const z = -110 - r() * 280
      const spread = 120 + Math.max(0, -z) * 1.1
      const x = (r() - 0.5) * spread * 2
      const y = terrainHeight(x, z)
      const sz = 9 + r() * 10
      const tint = new Color(darkGreens[Math.floor(r() * 4)]).multiplyScalar(2)
      addBush(cards, cardCols, r, x, y + sz * 0.5, z, sz, sz * 0.75, detail === 'high' ? 8 : 6, sz * 1.35, tint)
    }

    // A few tall silver oaks, as in the hills of Chikmagalur.
    const tree = (x: number, z: number, h: number) => {
      const y = terrainHeight(x, z)
      trunks.push(new Matrix4().compose(new Vector3(x, y - 1, z), new Quaternion(), new Vector3(0.6 + h / 140, h, 0.6 + h / 140)))
      const crowns = 2 + Math.floor(r() * 2)
      for (let k = 0; k < crowns; k++) {
        const cs = (5 + r() * 4) * (h / 70)
        const tint = new Color(darkGreens[Math.floor(r() * 4)]).multiplyScalar(2.2)
        addBush(cards, cardCols, r, x + (r() - 0.5) * cs, y + h * (0.72 + k * 0.14), z + (r() - 0.5) * cs, cs, cs * 0.6, detail === 'high' ? 14 : 8, cs * 0.9, tint)
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
      { z: -120, y: -16, w: 600, h: 40, o: 0.55 },
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

function ForegroundFoliage({ detail }: { detail: Detail }) {
  const m = getMaterials()
  const cardGeo = useMemo(() => new PlaneGeometry(1, 1), [])
  const below = useRef<Group>(null)
  const above = useRef<Group>(null)

  const data = useMemo(() => {
    const r = rng(61)
    const low: Matrix4[] = []
    const lowCols: Color[] = []
    const high: Matrix4[] = []
    const highCols: Color[] = []
    const count = detail === 'high' ? 34 : 18
    const tint = new Color('#86b85c')
    for (let i = 0; i < count; i++) {
      const x = -26 + (i / count) * 52 + (r() - 0.5) * 3
      const z = 34 + r() * 3.5
      const y = 25 + r() * 1.8
      const q = new Quaternion().setFromEuler(new Euler(-0.35 + (r() - 0.5) * 0.4, (r() - 0.5) * 0.9, (r() - 0.5) * 0.5))
      const sz = 5.5 + r() * 3
      low.push(new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sz, sz, sz)))
      lowCols.push(tint.clone().multiplyScalar(1.1 + r() * 0.8))
    }
    const hang = detail === 'high' ? 7 : 4
    for (let i = 0; i < hang; i++) {
      const q = new Quaternion().setFromEuler(new Euler(0.2, (r() - 0.5) * 0.6, Math.PI + (r() - 0.5) * 0.9))
      const sz = 4 + r() * 2
      high.push(new Matrix4().compose(new Vector3(-13 + r() * 9, 35.4 + r() * 1.4, 38 + r() * 2), q, new Vector3(sz, sz, sz)))
      highCols.push(tint.clone().multiplyScalar(0.7 + r() * 0.4))
    }
    return { low, lowCols, high, highCols }
  }, [detail])

  useFrame(() => {
    const k = sub(sceneState.pos, 0.02, 0.4)
    if (below.current) {
      below.current.position.y = -k * k * 12
      below.current.visible = k < 1
    }
    if (above.current) {
      above.current.position.y = k * k * 10
      above.current.visible = k < 1
    }
  })

  return (
    <>
      <group ref={below}>
        <Instances geometry={cardGeo} material={m.leafCard} mats={data.low} cols={data.lowCols} />
      </group>
      <group ref={above}>
        <Instances geometry={cardGeo} material={m.leafCard} mats={data.high} cols={data.highCols} />
      </group>
    </>
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
      <ForegroundFoliage detail={detail} />
    </group>
  )
}
