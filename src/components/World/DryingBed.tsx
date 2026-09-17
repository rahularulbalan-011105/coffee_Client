import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, Euler, Matrix4, MeshStandardMaterial, Quaternion, Vector3, type Group, type InstancedMesh } from 'three'
import { sceneState } from '../../animation/journey'
import BeanFlow, { type Waypoint } from './BeanFlow'
import { useKit } from './models'
import { beanGeometry } from './geometry'
import { getMaterials, PLANT_COLORS } from './materials'
import { BED, ROASTER, STATIONS } from './layout'
import { easeIn, easeInOut, rng, smooth, sub } from './math'

const bedColor = new Color()
const hopperColor = new Color()

/** Height of the raked ridges at x (relative to the bed centre). */
const ridge = (x: number) => 0.035 * Math.max(0, Math.sin(x * 8))

const bm4 = new Matrix4()
const bq = new Quaternion()
const bp = new Vector3()
const bs = new Vector3()

/**
 * The bulk of the harvest: a bed packed edge to edge with real 3D coffee beans (two layers),
 * so the whole surface is beans, not a texture. They pour in as the harvest lands, dry from
 * green to straw while being raked, and empty out towards the roaster.
 */
function BeanBed({ detail }: { detail: 'high' | 'low' }) {
  const mesh = useRef<InstancedMesh>(null)
  // Hundreds of beans on screen at once: the low-poly bean keeps this light.
  const geo = useMemo(() => beanGeometry('tiny'), [])
  const material = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0, envMapIntensity: 0.7 }), [])
  const b = STATIONS.bed
  const top = b.y + BED.top
  const last = useRef('')

  const beans = useMemo(() => {
    const r = rng(12)
    const out: { pos: Vector3; rot: Quaternion; size: number; tone: number; delay: number; out: number }[] = []
    // Jittered grid, sized to the bean (≈0.09 × 0.056): full coverage with natural overlap.
    const layers = detail === 'high' ? [0.074, 0.082] : [0.088]
    layers.forEach((step, layer) => {
      const cols = Math.floor((BED.width * 0.94) / step)
      const rows = Math.floor((BED.depth * 0.9) / (step * 0.8))
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (layer === 1 && r() < 0.35) continue
          const x = (i + 0.5) / cols - 0.5 + (r() - 0.5) * (0.9 / cols)
          const z = (j + 0.5) / rows - 0.5 + (r() - 0.5) * (0.9 / rows)
          const lx = x * BED.width * 0.94
          const lz = z * BED.depth * 0.9
          const y = top + 0.02 + layer * 0.026 + (r() - 0.5) * 0.006
          out.push({
            pos: new Vector3(b.x + lx, y, b.z + lz),
            rot: new Quaternion().setFromEuler(new Euler((r() < 0.5 ? Math.PI : 0) + (r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5)),
            size: (0.9 + r() * 0.28) * (detail === 'high' ? 1 : 1.2),
            tone: 0.8 + r() * 0.35,
            delay: layer * 0.35 + r() * 0.6,
            out: r(),
          })
        }
      }
    })
    return out
  }, [detail, b, top])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    beans.forEach((bean, i) => m.setColorAt(i, new Color(bean.tone, bean.tone, bean.tone)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [beans])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const s = sceneState
    const land = s.land
    const leave = s.toRoaster
    const rake = sub(s.rake, 0, 0.85)
    m.visible = s.pos > 1.6 && s.pos < 4.1 && land > 0.02 && leave < 0.98
    if (!m.visible) return
    material.color.copy(PLANT_COLORS.greenBean).lerp(PLANT_COLORS.driedBean, sub(s.rake, 0.2, 1))

    // Matrices only change with the story, not every frame.
    const key = `${land.toFixed(3)}|${leave.toFixed(3)}|${rake.toFixed(3)}`
    if (key === last.current) return
    last.current = key
    const rakeX = b.x - 1.9 + easeInOut(rake) * 3.6
    for (let i = 0; i < beans.length; i++) {
      const bean = beans[i]
      // Settle in: drop the last few centimetres as the harvest lands.
      const t = smooth(Math.min(1, Math.max(0, (land - bean.delay * 0.55) / 0.4)))
      // Empty out: beans leave in a scattered order towards the roaster.
      const g = easeIn(Math.min(1, Math.max(0, (leave - bean.out * 0.7) / 0.3)))
      bp.copy(bean.pos)
      bp.y += (1 - t) * 0.35 - g * 0.04
      // The rake leaves ridges behind it.
      const lx = bean.pos.x - b.x
      if (bean.pos.x < rakeX) bp.y += ridge(lx)
      bs.setScalar(bean.size * t * (1 - g))
      bq.copy(bean.rot)
      bm4.compose(bp, bq, bs)
      m.setMatrixAt(i, bm4)
    }
    m.instanceMatrix.needsUpdate = true
  }, -1)

  return <instancedMesh ref={mesh} args={[geo, material, beans.length]} receiveShadow frustumCulled={false} />
}

/**
 * Sun-drying yard: a raised wooden bed where the green beans rain down, are raked into
 * ridges and dry to a pale straw colour, before tumbling down into the roaster.
 */
export default function DryingBed({ beans, detail }: { beans: number; detail: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const rake = useRef<Group>(null)
  const beanGeo = useKit('bean')
  const m = getMaterials()
  const b = STATIONS.bed
  const top = b.y + BED.top

  const waypoints = useMemo<Waypoint[]>(() => {
    const hopper = new Vector3(STATIONS.roaster.x, STATIONS.roaster.y + ROASTER.hopperMouth + 0.05, STATIONS.roaster.z)
    return [
      {
        place: (_i, r) => new Vector3(b.x + (r() - 0.5) * BED.width * 0.9, b.y + 4 + r() * 5, b.z + (r() - 0.5) * BED.depth * 0.9),
        color: () => PLANT_COLORS.greenBean,
      },
      {
        place: (_i, r) => {
          const x = (r() - 0.5) * BED.width * 0.88
          return new Vector3(b.x + x, top + 0.074 + ridge(x), b.z + (r() - 0.5) * BED.depth * 0.82)
        },
        color: () => bedColor.copy(PLANT_COLORS.greenBean).lerp(PLANT_COLORS.driedBean, sub(sceneState.rake, 0.2, 1)),
        flat: true,
      },
      {
        place: (_i, r) => {
          const a = r() * Math.PI * 2
          const rad = Math.sqrt(r()) * 0.3
          return new Vector3(hopper.x + Math.cos(a) * rad, hopper.y, hopper.z + Math.sin(a) * rad)
        },
        color: () => hopperColor.copy(PLANT_COLORS.driedBean).lerp(PLANT_COLORS.roastingBean, 0.35),
      },
    ]
  }, [b, top])

  useFrame(() => {
    const s = sceneState
    if (group.current) group.current.visible = s.pos > 1.6 && s.pos < 4.1
    if (rake.current) {
      // One slow pass across the bed, then the rake is set aside.
      const k = easeInOut(sub(s.rake, 0, 0.85))
      rake.current.position.set(b.x - 1.9 + k * 3.6, top + 0.02, b.z - 0.15 + Math.sin(k * Math.PI * 3) * 0.08)
      rake.current.visible = s.rake > 0.001 && s.rake < 0.999
    }
  }, -1)

  return (
    <group ref={group}>
      {/* Bed: wooden frame on legs, dark mesh surface */}
      <RoundedBox args={[BED.width + 0.25, 0.1, BED.depth + 0.25]} radius={0.03} position={[b.x, b.y + 0.05, b.z]} receiveShadow castShadow>
        <primitive object={m.wood} attach="material" />
      </RoundedBox>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={m.wood} position={[b.x + sx * BED.width * 0.47, b.y - 0.9, b.z + sz * BED.depth * 0.45]} castShadow>
            <boxGeometry args={[0.1, 1.8, 0.1]} />
          </mesh>
        )),
      )}
      {[-1, 1].map((sz) => (
        <mesh key={sz} material={m.wood} position={[b.x, b.y + 0.14, b.z + sz * (BED.depth / 2 + 0.1)]} castShadow>
          <boxGeometry args={[BED.width + 0.25, 0.1, 0.06]} />
        </mesh>
      ))}
      <mesh position={[b.x, top - 0.005, b.z]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[BED.width, BED.depth]} />
        <meshStandardMaterial color="#141009" roughness={0.95} />
      </mesh>
      <BeanBed detail={detail} />

      {/* Wooden rake */}
      <group ref={rake} visible={false}>
        <mesh material={m.wood} position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.06, 0.08, 1.0]} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} material={m.wood} position={[0.02, 0.01, -0.44 + i * 0.11]}>
            <boxGeometry args={[0.02, 0.07, 0.02]} />
          </mesh>
        ))}
        <mesh material={m.wood} position={[-1.1, 0.75, 0.05]} rotation-z={1.0} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 2.6, 8]} />
        </mesh>
      </group>

      <BeanFlow
        count={beans}
        geometry={beanGeo}
        material={m.bean}
        seed={44}
        waypoints={waypoints}
        legs={[
          { progress: () => sceneState.land, stagger: 0.72, arc: 0.05, ease: 'fall' },
          {
            progress: () => sceneState.toRoaster,
            stagger: 0.7,
            arc: 0.9,
            ease: 'glide',
            sink: new Vector3(STATIONS.roaster.x, STATIONS.roaster.y + ROASTER.drumY + 0.5, STATIONS.roaster.z),
          },
        ]}
        spawn
        vanish
        castShadow={detail === 'high'}
        active={() => sceneState.pos > 1.6 && sceneState.pos < 4.1}
      />
    </group>
  )
}
