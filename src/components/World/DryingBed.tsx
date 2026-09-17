import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, MeshStandardMaterial, Vector3, type Group, type Mesh } from 'three'
import { sceneState } from '../../animation/journey'
import BeanFlow, { type Waypoint } from './BeanFlow'
import { useKit } from './models'
import { getMaterials, PLANT_COLORS } from './materials'
import { beanCarpetTexture } from './textures'
import { BED, ROASTER, STATIONS } from './layout'
import { easeInOut, sub } from './math'

const bedColor = new Color()
const hopperColor = new Color()

/**
 * Sun-drying yard: a raised wooden bed where the green beans rain down, are raked into
 * ridges and dry to a pale straw colour, before tumbling down into the roaster.
 */
export default function DryingBed({ beans, detail }: { beans: number; detail: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const rake = useRef<Group>(null)
  const carpet = useRef<Mesh>(null)
  const beanGeo = useKit('bean')
  const m = getMaterials()
  const b = STATIONS.bed
  const top = b.y + BED.top

  const carpetMat = useMemo(() => {
    const tex = beanCarpetTexture()
    tex.repeat.set(2.2, 1.4)
    return new MeshStandardMaterial({ map: tex, roughness: 0.75, transparent: true, opacity: 0 })
  }, [])

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
          const ridge = 0.035 * Math.max(0, Math.sin(x * 8))
          return new Vector3(b.x + x, top + 0.028 + ridge, b.z + (r() - 0.5) * BED.depth * 0.82)
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
    if (carpet.current) {
      carpetMat.opacity = sub(s.land, 0.3, 1) * (1 - sub(s.toRoaster, 0.05, 0.6))
      carpet.current.visible = carpetMat.opacity > 0.01
    }
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
        <meshStandardMaterial color="#26241a" roughness={0.95} />
      </mesh>
      <mesh ref={carpet} position={[b.x, top + 0.004, b.z]} rotation-x={-Math.PI / 2} material={carpetMat} receiveShadow>
        <planeGeometry args={[BED.width * 0.94, BED.depth * 0.9]} />
      </mesh>

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
