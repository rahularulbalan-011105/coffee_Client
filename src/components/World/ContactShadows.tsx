import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial, type Mesh } from 'three'
import { sceneState } from '../../animation/journey'
import { DABARA, FILTER, STATIONS } from './layout'
import { sub } from './math'
import { make } from './textures'

/** A soft, dense core fading out to nothing: the shade right under something resting on a surface. */
function contactTexture() {
  return make('contact-shadow', 256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.32, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.32)')
    g.addColorStop(0.7, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

interface Spot {
  /** Where the object meets the surface and how strongly it is grounded right now (0..1). */
  at: () => [number, number, number, number]
  /** Radius of the shade (a little wider than the object's foot). */
  radius: number
}

/**
 * Grounding shade under everything that stands on a tabletop: the grinder, the filter and
 * the brass serving set. Nudged away from the key light, as a real contact shadow falls.
 */
export default function ContactShadows({ dabaraBase, tumblerBase }: { dabaraBase: () => [number, number, number]; tumblerBase: () => [number, number, number] }) {
  const material = useMemo(() => new MeshBasicMaterial({ map: contactTexture(), transparent: true, depthWrite: false, color: '#000000' }), [])
  const refs = useRef<(Mesh | null)[]>([])

  const spots = useMemo<Spot[]>(() => {
    const g = STATIONS.grinder
    const f = STATIONS.filter
    const t = STATIONS.tumbler
    return [
      { at: () => [g.x, g.y, g.z, 1], radius: 0.62 },
      // The filter stands until its lower chamber is carried off to the dabara.
      { at: () => [f.x, f.y, f.z, 1 - sub(sceneState.transfer, 0, 0.15)], radius: FILTER.radius * 1.9 },
      {
        at: () => {
          const [x, y, z] = tumblerBase()
          return [x, t.y, z, y < t.y + 1 ? 1 : 0]
        },
        radius: 0.34,
      },
      {
        at: () => {
          const [x, y, z] = dabaraBase()
          // Lifted to pour: the shade softens and fades with height.
          const lift = Math.max(0, y - STATIONS.dabara.y)
          return [x, STATIONS.dabara.y, z, 1 - Math.min(1, lift / 0.35)]
        },
        radius: DABARA.rim * 1.9,
      },
    ]
  }, [dabaraBase, tumblerBase])

  useFrame(() => {
    spots.forEach((spot, i) => {
      const mesh = refs.current[i]
      if (!mesh) return
      const [x, y, z, k] = spot.at()
      mesh.visible = k > 0.01
      // Nudge the shade away from the key light (front-left, above).
      mesh.position.set(x + spot.radius * 0.12, y + 0.003, z - spot.radius * 0.1)
      mesh.scale.setScalar(spot.radius * 2 * (1 + (1 - k) * 0.4))
      ;(mesh.material as MeshBasicMaterial).opacity = k
    })
  })

  return (
    <>
      {spots.map((_, i) => (
        <mesh
          key={i}
          ref={(n) => {
            refs.current[i] = n
          }}
          rotation-x={-Math.PI / 2}
          material={i === 0 ? material : material.clone()}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </>
  )
}
