import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial, type Group, type Mesh, type PointLight } from 'three'
import { sceneState } from '../../animation/journey'
import { createLiquidMaterial, getMaterials } from './materials'
import { STATIONS } from './layout'
import { rimBubblesTexture } from './textures'
import { sub, window01 } from './math'

export interface LiquidState {
  y: number
  radius: number
  visible: boolean
  color: Color
  /** Froth coverage 0..1 */
  foam: number
  /** Optional tilt compensation (radians about Z) when parented to a tilting vessel. */
  tilt?: number
}

interface LiquidSurfaceProps {
  initialColor: string
  drive: (s: LiquidState) => void
  foamScale?: number
  segments?: number
  /** 0 = opaque (milky coffee) … 1 = clear-bodied like black decoction or water. */
  translucency?: number
  /** Black decoction: fine bubbles and a meniscus at the wall instead of a milky froth. */
  rim?: boolean
}

/**
 * A glossy liquid disc with an optional froth layer. The disc is authored at radius 1
 * and scaled per frame, so a vessel of any profile can drive it.
 */
export function LiquidSurface({ initialColor, drive, foamScale = 1, segments = 48, translucency = 0, rim = false }: LiquidSurfaceProps) {
  const group = useRef<Group>(null)
  const foamMesh = useRef<Mesh>(null)
  const material = useMemo(() => createLiquidMaterial(initialColor, translucency), [initialColor, translucency])
  const foamMaterial = useMemo(() => {
    if (rim) {
      return new MeshStandardMaterial({ map: rimBubblesTexture(), transparent: true, depthWrite: false, roughness: 0.3, metalness: 0, opacity: 0 })
    }
    const m = getMaterials().foam.clone()
    m.opacity = 0
    return m
  }, [rim])
  const state = useMemo<LiquidState>(
    () => ({ y: 0, radius: 0.1, visible: false, color: new Color(initialColor), foam: 0, tilt: 0 }),
    [initialColor],
  )

  useFrame(({ clock }, dt) => {
    drive(state)
    const g = group.current
    if (!g) return
    g.visible = state.visible
    if (!state.visible) return
    g.position.y = state.y
    g.scale.set(state.radius, 1, state.radius)
    g.rotation.z = -(state.tilt ?? 0)
    material.color.copy(state.color)
    // Slow drifting ripples.
    const n = material.normalMap
    if (n) {
      n.offset.x += dt * 0.02
      n.offset.y = Math.sin(clock.elapsedTime * 0.3) * 0.05
    }
    foamMaterial.opacity = state.foam
    if (foamMesh.current) {
      foamMesh.current.visible = state.foam > 0.01
      foamMesh.current.rotation.z = clock.elapsedTime * 0.03
    }
  })

  return (
    <group ref={group}>
      <mesh rotation-x={-Math.PI / 2} material={material} receiveShadow>
        <circleGeometry args={[1, segments]} />
      </mesh>
      <mesh ref={foamMesh} rotation-x={-Math.PI / 2} position-y={0.002} material={foamMaterial} scale={foamScale}>
        <circleGeometry args={[0.98, segments]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------ brew ambience */

/** The warm heart of the decoction stage: an amber glow that grows as the brew develops. */
export default function CoffeeBrew() {
  const glow = useRef<PointLight>(null)

  useFrame(() => {
    const brew = sceneState.brew
    const k = window01(brew, 0, 1, 0.25)
    if (glow.current) glow.current.intensity = k * 1.4 + sub(sceneState.extract, 0.2, 1) * 0.4 * (1 - sub(brew, 0.8, 1))
  }, -1)

  const f = STATIONS.filter
  return <pointLight ref={glow} position={[f.x + 0.5, f.y + 1.5, f.z + 0.6]} color="#ff9a4a" distance={3} decay={2} intensity={0} />
}
