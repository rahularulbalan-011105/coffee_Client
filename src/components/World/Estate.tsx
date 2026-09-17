import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Group,
} from 'three'
import { sceneState } from '../../animation/journey'
import { useKit } from './models'
import { getMaterials, PLANT_COLORS } from './materials'
import { BRANCH } from './layout'
import { rng } from './math'
import { Dust } from './Effects3D'
import { cameraFocus } from './CameraRig'

/* --------------------------------------------------------------- terrain */

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Ground height of the estate. Gentle terraces near the story path, hills beyond. */
export function terrainHeight(x: number, z: number) {
  const rolling = Math.sin(x * 0.018) * 2.0 + Math.sin(z * 0.023 + x * 0.01) * 2.4 + Math.sin((x + z) * 0.041) * 0.7
  const d = Math.hypot(x * 0.8, z + 60)
  const hills = smoothstep(160, 520, d) * (38 + 26 * Math.sin(x * 0.006) + 22 * Math.sin(z * 0.008 + 1.3))
  const nearFlat = smoothstep(10, 60, Math.hypot(x - BRANCH.x, z - BRANCH.z))
  return rolling * (0.25 + 0.75 * nearFlat) + hills - 0.6
}

function Terrain({ detail }: { detail: 'high' | 'low' }) {
  const geometry = useMemo(() => {
    const seg = detail === 'high' ? 140 : 70
    const g = new PlaneGeometry(1800, 1800, seg, seg)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, -500)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const soil = new Color('#2d2a1c')
    const green = new Color('#223f26')
    const lush = new Color('#335a33')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, terrainHeight(x, z))
      // Terrace rows read as soft stripes.
      const row = 0.5 + 0.5 * Math.sin(z * 0.32 + Math.sin(x * 0.02) * 2)
      c.copy(green).lerp(lush, row * 0.6).lerp(soil, (1 - row) * 0.25)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [detail])
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), [])
  return <mesh geometry={geometry} material={material} receiveShadow />
}

/* ---------------------------------------------------------------- ridges */

const ridgeVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vH;
  void main() {
    vUv = uv;
    vH = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const ridgeFragment = /* glsl */ `
  uniform vec3 uBody; uniform vec3 uRim; uniform vec3 uHaze; uniform float uHazeAmt; uniform float uTop; uniform float uOpacity;
  varying vec2 vUv;
  varying float vH;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float h = clamp(vH / uTop, 0.0, 1.0);
    vec3 col = mix(uBody * 0.75, uBody, h);
    // Tree-covered texture: fine speckle.
    col *= 0.9 + 0.2 * hash(floor(vUv * vec2(900.0, 60.0)));
    // Sun-kissed crest.
    col = mix(col, uRim, smoothstep(0.82, 1.0, h) * 0.35);
    // Valley mist pools low on each ridge.
    float mist = uHazeAmt + (1.0 - uHazeAmt) * (1.0 - smoothstep(0.0, 0.45, h)) * 0.85;
    col = mix(col, uHaze, clamp(mist, 0.0, 1.0));
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`

function Ridges() {
  const layers = useMemo(() => {
    const r = rng(4)
    const specs = [
      { z: -260, top: 70, amp: 30, haze: 0.28, body: '#1f3d27' },
      { z: -420, top: 120, amp: 50, haze: 0.45, body: '#2a4a33' },
      { z: -620, top: 180, amp: 70, haze: 0.62, body: '#3c5a45' },
      { z: -880, top: 250, amp: 90, haze: 0.78, body: '#58705d' },
    ]
    return specs.map((spec, li) => {
      const seg = 220
      const g = new PlaneGeometry(3200, 1, seg, 1)
      const pos = g.attributes.position
      const phase = r() * 100
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const top = pos.getY(i) > 0
        if (!top) {
          pos.setY(i, -60)
          continue
        }
        const n =
          Math.sin(x * 0.004 + phase) * 0.5 +
          Math.sin(x * 0.011 + phase * 1.7) * 0.28 +
          Math.sin(x * 0.029 + phase * 0.3) * 0.12 +
          Math.sin(x * 0.08 + phase) * 0.04
        pos.setY(i, spec.top - spec.amp + n * spec.amp)
      }
      const m = new ShaderMaterial({
        vertexShader: ridgeVertex,
        fragmentShader: ridgeFragment,
        transparent: true,
        depthWrite: li === 0,
        uniforms: {
          uBody: { value: new Color(spec.body) },
          uRim: { value: new Color('#e9d9a8') },
          uHaze: { value: new Color('#a9b49a') },
          uHazeAmt: { value: spec.haze },
          uTop: { value: spec.top + spec.amp * 0.5 },
          uOpacity: { value: 1 },
        },
      })
      return { geometry: g, material: m, z: spec.z, order: -5 - li }
    })
  }, [])

  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={l.material} position={[0, 0, l.z]} renderOrder={l.order} />
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- bushes */

interface Bush {
  x: number
  z: number
  y: number
  h: number
  r: number
  near: boolean
}

function layoutBushes(detail: 'high' | 'low') {
  const r = rng(21)
  const bushes: Bush[] = []
  const rowStep = detail === 'high' ? 19 : 26
  const colStep = detail === 'high' ? 12 : 17
  for (let z = 34; z > -300; z -= rowStep) {
    const curve = Math.sin(z * 0.02) * 12
    for (let x = -240; x <= 240; x += colStep) {
      const px = x + curve + (r() - 0.5) * 4
      const pz = z + (r() - 0.5) * 4
      // Keep the camera's flight path and the hero branch clear.
      if (px > -7 && px < 10 && pz > 11) continue
      if (Math.abs(px - BRANCH.x) < 4 && Math.abs(pz - BRANCH.z) < 5) continue
      const near = Math.hypot(px - 1, pz - 14) < (detail === 'high' ? 46 : 32)
      const h = 12 + r() * 6
      bushes.push({ x: px, z: pz, y: terrainHeight(px, pz), h, r: 4.2 + r() * 1.6, near })
    }
  }
  // The hero bush the branch belongs to.
  bushes.push({ x: BRANCH.x + 3.5, z: BRANCH.z - 8.5, y: terrainHeight(BRANCH.x, BRANCH.z), h: 16, r: 5.2, near: true })
  return bushes
}

const q = new Quaternion()
const eu = new Euler()
const v = new Vector3()
const sc = new Vector3()

function Bushes({ detail }: { detail: 'high' | 'low' }) {
  const leafGeo = useKit('leafLow')
  const cherryGeo = useKit('cherry')
  const blobGeo = useKit('blob')
  const blobLowGeo = useKit('blobLow')
  const m = getMaterials()
  const leafRef = useRef<InstancedMesh>(null)
  const blobRef = useRef<InstancedMesh>(null)
  const coreRef = useRef<InstancedMesh>(null)
  const cherryRef = useRef<InstancedMesh>(null)

  const data = useMemo(() => {
    const bushes = layoutBushes(detail)
    const r = rng(77)
    const leaves: Matrix4[] = []
    const leafColors: Color[] = []
    const cherries: Matrix4[] = []
    const cherryColors: Color[] = []
    const blobs: Matrix4[] = []
    const blobColors: Color[] = []
    const cores: Matrix4[] = []
    const coreColors: Color[] = []
    const perBush = detail === 'high' ? 70 : 36
    const up = new Vector3(0, 1, 0)
    const dir = new Vector3()
    const tip = new Vector3()
    const roll = new Quaternion()

    for (const b of bushes) {
      if (!b.near) {
        // Two soft canopy masses read as a pruned coffee bush from afar.
        for (let k = 0; k < 2; k++) {
          v.set(b.x + (r() - 0.5) * 1.5, b.y + b.h * (0.42 + k * 0.22), b.z + (r() - 0.5) * 1.5)
          q.setFromEuler(eu.set(0, r() * 6.28, 0))
          sc.set(b.r * (1.05 - k * 0.25), b.h * (0.36 - k * 0.08), b.r * (1.05 - k * 0.25))
          blobs.push(new Matrix4().compose(v, q, sc))
          blobColors.push(new Color(PLANT_COLORS.leaves[Math.floor(r() * 6)]).multiplyScalar(0.75 + r() * 0.3))
        }
        continue
      }
      // Dense canopy core: the leaves below dress its surface.
      const cy = b.y + b.h * 0.55
      const rx = b.r
      const ry = b.h * 0.45
      v.set(b.x, cy, b.z)
      q.setFromEuler(eu.set(0, r() * 6.28, 0))
      cores.push(new Matrix4().compose(v, q, new Vector3(rx * 0.82, ry * 0.84, rx * 0.82)))
      coreColors.push(new Color(PLANT_COLORS.leaves[Math.floor(r() * 6)]).multiplyScalar(0.55))
      for (let i = 0; i < perBush; i++) {
        // A point on the canopy surface, biased to the sides and top.
        const th = r() * Math.PI * 2
        const ph = Math.acos(1 - r() * 1.7)
        dir.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th))
        v.set(b.x + dir.x * rx * 0.95, cy + dir.y * ry * 0.95, b.z + dir.z * rx * 0.95)
        // Tip points outward, drooping slightly; random roll about the tip.
        tip.copy(dir).setY(dir.y * 0.4 - 0.25).normalize()
        q.setFromUnitVectors(up, tip)
        roll.setFromAxisAngle(tip, r() * Math.PI * 2)
        q.premultiply(roll)
        const s = 1.3 + r() * 0.7
        sc.set(s, s, s)
        leaves.push(new Matrix4().compose(v, q, sc))
        leafColors.push(new Color(PLANT_COLORS.leaves[Math.floor(r() * 6)]).multiplyScalar(0.8 + r() * 0.45))

        // Cherry clusters tucked in along the branches.
        if (r() < 0.14 && dir.y < 0.6) {
          const ripe = r()
          for (let k = 0; k < 5; k++) {
            const cv = new Vector3(v.x - dir.x * 0.35 + (r() - 0.5) * 0.25, v.y - 0.2 + (r() - 0.5) * 0.2, v.z - dir.z * 0.35 + (r() - 0.5) * 0.25)
            q.setFromEuler(eu.set(r(), r(), r()))
            const cs = 0.07 + r() * 0.02
            cherries.push(new Matrix4().compose(cv, q, new Vector3(cs, cs, cs)))
            cherryColors.push(PLANT_COLORS.cherryUnripe.clone().lerp(PLANT_COLORS.cherryRipe, Math.min(1, Math.max(0, ripe * 1.3 + (r() - 0.5) * 0.3))))
          }
        }
      }
    }
    return { leaves, leafColors, cherries, cherryColors, blobs, blobColors, cores, coreColors }
  }, [detail])

  useLayoutEffect(() => {
    const apply = (mesh: InstancedMesh | null, mats: Matrix4[], cols: Color[]) => {
      if (!mesh) return
      mats.forEach((mt, i) => {
        mesh.setMatrixAt(i, mt)
        mesh.setColorAt(i, cols[i])
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    apply(leafRef.current, data.leaves, data.leafColors)
    apply(blobRef.current, data.blobs, data.blobColors)
    apply(cherryRef.current, data.cherries, data.cherryColors)
    apply(coreRef.current, data.cores, data.coreColors)
  }, [data])

  // A breath of wind through the near bushes.
  useFrame(({ clock }) => {
    if (leafRef.current) leafRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.002
  })

  return (
    <group>
      <instancedMesh ref={leafRef} args={[leafGeo, m.leaf, data.leaves.length]} castShadow receiveShadow />
      <instancedMesh ref={blobRef} args={[blobLowGeo, m.foliage, data.blobs.length]} />
      <instancedMesh ref={coreRef} args={[blobGeo, m.foliage, data.cores.length]} />
      {data.cherries.length > 0 && <instancedMesh ref={cherryRef} args={[cherryGeo, m.cherry, data.cherries.length]} />}
    </group>
  )
}

/* ----------------------------------------------------------- shade trees */

function ShadeTrees({ detail }: { detail: 'high' | 'low' }) {
  const blobGeo = useKit('blob')
  const m = getMaterials()
  const trunkRef = useRef<InstancedMesh>(null)
  const crownRef = useRef<InstancedMesh>(null)
  const trunkGeo = useMemo(() => {
    const g = new CylinderGeometry(0.55, 1, 1, 7, 1, true)
    g.translate(0, 0.5, 0)
    return g
  }, [])

  const data = useMemo(() => {
    const r = rng(9)
    const trunks: Matrix4[] = []
    const crowns: Matrix4[] = []
    const crownColors: Color[] = []
    const count = detail === 'high' ? 46 : 22
    let placed = 0
    let guard = 0
    while (placed < count && guard++ < 2000) {
      const x = (r() - 0.5) * 420
      const z = 10 - r() * 330
      if (Math.abs(x - 0.5) < 14 && z > -30) continue
      const y = terrainHeight(x, z)
      const h = 80 + r() * 60
      trunks.push(new Matrix4().compose(new Vector3(x, y - 1, z), q.identity(), new Vector3(1.1 + r(), h, 1.1 + r())))
      const nCrowns = 3 + Math.floor(r() * 3)
      for (let k = 0; k < nCrowns; k++) {
        const cy = y + h * (0.45 + (k / nCrowns) * 0.55)
        crowns.push(
          new Matrix4().compose(
            new Vector3(x + (r() - 0.5) * 14, cy, z + (r() - 0.5) * 14),
            q.setFromEuler(eu.set(0, r() * 6, 0)),
            new Vector3(8 + r() * 10, 5 + r() * 5, 8 + r() * 10),
          ),
        )
        crownColors.push(new Color('#1c3522').lerp(new Color('#3a5a3a'), r()))
      }
      placed++
    }
    return { trunks, crowns, crownColors }
  }, [detail])

  useLayoutEffect(() => {
    const t = trunkRef.current
    const c = crownRef.current
    if (t) {
      data.trunks.forEach((mt, i) => t.setMatrixAt(i, mt))
      t.instanceMatrix.needsUpdate = true
      t.computeBoundingSphere()
    }
    if (c) {
      data.crowns.forEach((mt, i) => {
        c.setMatrixAt(i, mt)
        c.setColorAt(i, data.crownColors[i])
      })
      c.instanceMatrix.needsUpdate = true
      if (c.instanceColor) c.instanceColor.needsUpdate = true
      c.computeBoundingSphere()
    }
  }, [data])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, m.bark, data.trunks.length]} />
      <instancedMesh ref={crownRef} args={[blobGeo, m.foliage, data.crowns.length]} />
    </group>
  )
}

/* ------------------------------------------------------------------ mist */

const mistVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const mistFragment = /* glsl */ `
  uniform float uTime; uniform float uSeed; uniform vec3 uColor; uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
  void main() {
    vec2 p = vec2(vUv.x * 9.0 + uTime * 0.012 + uSeed, vUv.y * 1.6);
    float n = fbm(p + vec2(uTime * 0.008, 0.0)) * 1.15;
    float band = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float a = smoothstep(0.35, 0.8, n) * band;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`

function MistLayers() {
  const layers = useMemo(() => {
    const specs = [
      { z: -30, y: 6, w: 500, h: 22, o: 0.35 },
      { z: -90, y: 12, w: 800, h: 40, o: 0.5 },
      { z: -170, y: 18, w: 1100, h: 60, o: 0.55 },
      { z: -300, y: 28, w: 1600, h: 90, o: 0.6 },
    ]
    return specs.map((s, i) => ({
      ...s,
      material: new ShaderMaterial({
        vertexShader: mistVertex,
        fragmentShader: mistFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: i * 7.3 },
          uColor: { value: new Color('#d9dccb') },
          uOpacity: { value: s.o },
        },
      }),
    }))
  }, [])

  useFrame(({ clock }) => {
    for (const l of layers) l.material.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.y, l.z]} material={l.material} renderOrder={1 + i}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  )
}

/* --------------------------------------------------------------- sun rays */

const rayFragment = /* glsl */ `
  uniform float uTime; uniform float uOpacity; uniform vec3 uColor; uniform float uSeed;
  varying vec2 vUv;
  void main() {
    float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
    float flicker = 0.75 + 0.25 * sin(uTime * 0.3 + uSeed * 4.0);
    gl_FragColor = vec4(uColor * across * along * flicker * uOpacity, 1.0);
  }
`

function SunRays() {
  const group = useRef<Group>(null)
  const rays = useMemo(() => {
    const r = rng(3)
    return Array.from({ length: 6 }, (_, i) => ({
      x: -40 + i * 16 + r() * 8,
      w: 6 + r() * 10,
      material: new ShaderMaterial({
        vertexShader: mistVertex,
        fragmentShader: rayFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.08 + r() * 0.06 },
          uColor: { value: new Color('#ffe2a8') },
          uSeed: { value: r() * 10 },
        },
      }),
    }))
  }, [])

  useFrame(({ clock }) => {
    for (const ray of rays) ray.material.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group ref={group} position={[0, 40, -40]} rotation={[0, 0, 0.55]}>
      {rays.map((ray, i) => (
        <mesh key={i} position={[ray.x, 0, i * -6]} material={ray.material} renderOrder={20}>
          <planeGeometry args={[ray.w, 160]} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- estate */

/** Chikmagalur: terraced coffee under silver oaks, ridges fading into morning mist. */
export default function Estate({ detail }: { detail: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const pollenCentre = useMemo(() => new Vector3(), [])

  useFrame(() => {
    if (group.current) group.current.visible = sceneState.pos < 2.3
  }, -1)

  return (
    <group ref={group}>
      <Ridges />
      <Terrain detail={detail} />
      <Bushes detail={detail} />
      <ShadeTrees detail={detail} />
      <MistLayers />
      {detail === 'high' && <SunRays />}
      <Dust
        count={detail === 'high' ? 260 : 90}
        box={[60, 26, 50]}
        size={120}
        color="#f3e2b0"
        seed={5}
        center={() => pollenCentre.copy(cameraFocus)}
        opacity={() => (sceneState.pos < 2.2 ? 1 : 0)}
      />
    </group>
  )
}
