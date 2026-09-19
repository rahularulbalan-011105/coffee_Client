import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Group,
  type Points,
} from 'three'
import { sceneState } from '../../animation/journey'
import { useKit } from './models'
import { getMaterials } from './materials'
import { FILTER, GRINDER, STATIONS } from './layout'
import { rng, sub, window01 } from './math'

/* ----------------------------------------------------------- hopper bean pile */

function HopperPile({ detail }: { detail: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const beanGeo = useKit('bean')
  const count = detail === 'high' ? 34 : 18
  const matrices = useMemo(() => {
    const r = rng(8)
    const list: Matrix4[] = []
    for (let i = 0; i < count; i++) {
      const ring = Math.sqrt(r()) * 0.3
      const ang = r() * Math.PI * 2
      const pos = new Vector3(Math.cos(ang) * ring, (0.3 - ring) * 0.22 + r() * 0.02, Math.sin(ang) * ring)
      const rot = new Quaternion().setFromEuler(new Euler(r() * 6.28, r() * 6.28, r() * 6.28))
      const sc = 0.9 + r() * 0.25
      list.push(new Matrix4().compose(pos, rot, new Vector3(sc, sc, sc)))
    }
    return list
  }, [count])

  const setRef = (m: InstancedMesh | null) => {
    if (!m) return
    matrices.forEach((mat, i) => {
      m.setMatrixAt(i, mat)
      m.setColorAt(i, new Color(i % 3 ? '#35200f' : '#472a17'))
    })
    m.instanceMatrix.needsUpdate = true
  }

  useFrame(() => {
    const g = group.current
    if (!g) return
    const filled = sub(sceneState.toGrinder, 0.35, 0.95)
    const ground = sub(sceneState.grind, 0.3, 0.95)
    const amount = Math.max(0, filled - ground)
    g.visible = amount > 0.02
    // Pile rises inside the hopper cone; its footprint grows with the cone radius.
    g.position.y = GRINDER.throat + 0.02 + amount * 0.18
    const k = 0.35 + amount * 0.62
    g.scale.set(k, 0.4 + amount * 0.6, k)
    g.rotation.y = sceneState.grind * 9
  }, -1)

  return (
    <group ref={group}>
      <instancedMesh ref={setRef} args={[beanGeo, getMaterials().bean, count]} castShadow />
    </group>
  )
}

/* -------------------------------------------------------------- powder stream */

const PATH_POINTS = 14

const powderVertex = /* glsl */ `
  uniform float uProgress; uniform float uTime; uniform float uScale;
  uniform vec3 uPath[${PATH_POINTS}];
  attribute vec4 aSeed;
  varying float vAlpha; varying float vShade;

  vec3 pathAt(float t) {
    float f = clamp(t, 0.0, 1.0) * float(${PATH_POINTS - 1});
    int i = int(min(floor(f), float(${PATH_POINTS - 2})));
    float k = f - float(i);
    k = k * k * (3.0 - 2.0 * k);
    return mix(uPath[i], uPath[i + 1], k);
  }

  void main() {
    float start = aSeed.x * 0.74;
    float t = clamp((uProgress - start) / 0.26, 0.0, 1.0);
    float alive = step(0.0001, t) * (1.0 - step(0.9999, t));

    vec3 p = pathAt(t);
    // Swirling ribbon around the path: widest mid-flight, converging at both ends.
    float spread = sin(3.14159 * t);
    float ang = aSeed.y * 6.2831 + t * (8.0 + aSeed.z * 6.0) + uTime * 0.6;
    float rad = (0.03 + aSeed.w * 0.11) * spread;
    p += vec3(cos(ang) * rad, sin(ang * 1.3) * rad * 0.6, sin(ang) * rad);
    // Final settle: fan out across the filter chamber.
    float land = smoothstep(0.82, 1.0, t);
    p.x += (aSeed.y - 0.5) * 0.36 * land;
    p.z += (aSeed.z - 0.5) * 0.36 * land;

    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float grow = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.9, 1.0, t));
    float size = mix(0.006, 0.016, aSeed.w * aSeed.w);
    gl_PointSize = size * uScale * grow * alive / -mv.z;
    vAlpha = alive * mix(1.0, 0.45, aSeed.w);
    vShade = aSeed.z;
  }
`

const powderFragment = /* glsl */ `
  varying float vAlpha; varying float vShade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // Tiny faceted grain: lit from upper-left.
    float lit = clamp(0.55 - dot(c, vec2(0.7, 0.7)) * 1.2, 0.0, 1.0);
    vec3 base = mix(vec3(0.16, 0.085, 0.045), vec3(0.3, 0.17, 0.09), vShade);
    vec3 col = base * (0.55 + lit) + vec3(0.35, 0.2, 0.1) * pow(lit, 6.0) * 0.6;
    gl_FragColor = vec4(col, vAlpha * smoothstep(0.5, 0.3, d));
    #include <colorspace_fragment>
  }
`

export function PowderStream({ count }: { count: number }) {
  const ref = useRef<Points>(null)
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  const { geometry, material } = useMemo(() => {
    const g0 = STATIONS.grinder
    const f = STATIONS.filter
    const o = new Vector3().copy(g0).add(GRINDER.outlet)
    // Out of the chute, a swirling descent into the filter far below.
    const curve = new CatmullRomCurve3(
      [
        o.clone(),
        o.clone().add(new Vector3(0.12, -0.08, 0.03)),
        o.clone().add(new Vector3(0.32, -0.5, 0.12)),
        new Vector3(f.x - 0.3, g0.y - 1.0, f.z + 0.4),
        new Vector3(f.x + 0.25, g0.y - 2.0, f.z + 0.15),
        new Vector3(f.x - 0.05, f.y + 1.75, f.z + 0.02),
        new Vector3(f.x, f.y + 1.2, f.z),
        new Vector3(f.x, f.y + FILTER.moundBase + 0.12, f.z),
      ],
      false,
      'centripetal',
    )
    const pts = curve.getSpacedPoints(PATH_POINTS - 1)

    const r = rng(33)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = r()
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    const mat = new ShaderMaterial({
      vertexShader: powderVertex,
      fragmentShader: powderFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uScale: { value: 800 },
        uPath: { value: pts },
      },
    })
    return { geometry: geo, material: mat }
  }, [count])

  useFrame(({ clock, gl }) => {
    const pr = sceneState.powder
    material.uniforms.uProgress.value = pr
    material.uniforms.uTime.value = clock.elapsedTime
    const fovRad = (camera.fov * Math.PI) / 180
    material.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(fovRad / 2))
    if (ref.current) ref.current.visible = pr > 0.0005 && pr < 0.9995
  })

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />
}

/* --------------------------------------------------------------------- grinder */

export default function Grinder({ detail }: { detail: 'high' | 'low' }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const bodyGeo = useKit('grinderBody')
  const crank = useRef<Group>(null)
  const ring = useRef<Group>(null)
  const m = getMaterials()
  const seg = detail === 'high' ? 64 : 32

  useFrame(({ clock }) => {
    if (root.current) root.current.visible = sceneState.pos > 3.6 && sceneState.pos < 6.4
    const g = sceneState.grind
    const active = window01(g, 0.0, 1.0, 0.08)
    // Six slow turns of the crank, eased at both ends.
    const turn = g * Math.PI * 2 * 6
    if (crank.current) crank.current.rotation.y = -turn
    if (ring.current) ring.current.rotation.y = -turn * 0.5
    if (body.current) {
      const t = clock.elapsedTime
      body.current.rotation.z = Math.sin(t * 57) * 0.0035 * active
      body.current.rotation.x = Math.cos(t * 43) * 0.0025 * active
      body.current.position.y = Math.abs(Math.sin(t * 31)) * 0.002 * active
    }
  }, -1)

  return (
    <group ref={root} position={STATIONS.grinder}>
      <RoundedBox args={[0.66, 0.2, 0.66]} radius={0.025} smoothness={3} position={[0, 0.1, 0]} castShadow receiveShadow>
        <primitive object={m.wood} attach="material" />
      </RoundedBox>
      {/* Brass inlay strip around the base */}
      <mesh position={[0, 0.17, 0]} material={m.brassDark}>
        <boxGeometry args={[0.672, 0.012, 0.672]} />
      </mesh>

      <group ref={body}>
        <mesh geometry={bodyGeo} material={m.brass} castShadow receiveShadow />
        {/* Adjustment ring */}
        <group ref={ring} position={[0, 0.7, 0]}>
          <mesh material={m.brassDark} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.296, 0.012, 10, seg]} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh
              key={i}
              material={m.brassDark}
              position={[Math.cos((i / 12) * Math.PI * 2) * 0.305, 0, Math.sin((i / 12) * Math.PI * 2) * 0.305]}
            >
              <boxGeometry args={[0.012, 0.03, 0.012]} />
            </mesh>
          ))}
        </group>
        {/* Throat — dark opening where the burrs sit */}
        <mesh position={[0, GRINDER.throat + 0.025, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.13, 32]} />
          <meshStandardMaterial color="#070403" roughness={1} />
        </mesh>
        {/* Axle */}
        <mesh position={[0, 1.27, 0]} material={m.steel} castShadow>
          <cylinderGeometry args={[0.014, 0.018, 0.5, 12]} />
        </mesh>
        {/* Crank */}
        <group ref={crank} position={[0, 1.5, 0]}>
          <mesh material={m.brass} castShadow>
            <sphereGeometry args={[0.035, 16, 12]} />
          </mesh>
          <mesh material={m.brass} position={[0.16, 0.012, 0]} rotation-z={0.08} castShadow>
            <boxGeometry args={[0.32, 0.016, 0.04]} />
          </mesh>
          <mesh material={m.woodKnob} position={[0.31, 0.075, 0]} castShadow>
            <capsuleGeometry args={[0.024, 0.07, 6, 16]} />
          </mesh>
        </group>
        {/* Output chute */}
        <mesh material={m.brass} position={[0.36, 0.5, GRINDER.outlet.z]} rotation-z={Math.PI / 2 + 0.3} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 0.2, 20, 1, true]} />
        </mesh>
        <mesh position={[0.455, 0.465, GRINDER.outlet.z]} rotation-z={Math.PI / 2 + 0.3}>
          <circleGeometry args={[0.042, 20]} />
          <meshStandardMaterial color="#120905" roughness={1} />
        </mesh>
        <HopperPile detail={detail} />
      </group>
    </group>
  )
}
