import { useMemo } from 'react'
import { useEnvironment } from '@react-three/drei'
import { Euler } from 'three'
import { INTERIOR_HDR } from './realAssets'
import { STATIONS } from './layout'
import { getMaterials } from './materials'
import { make } from './textures'

/** Soft round falloff, so each slab melts into the dark instead of ending in an edge. */
function fadeMask() {
  return make('counter-fade', 256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2)
    g.addColorStop(0, '#fff')
    g.addColorStop(0.55, '#aaa')
    g.addColorStop(1, '#000')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

/**
 * Polished hardwood tabletops (real wood scan) under the grinder, the filter and the brass
 * serving set, fading into the dark at their edges.
 */
export default function Counters() {
  const m = getMaterials()
  const env = useEnvironment({ files: INTERIOR_HDR })
  const material = useMemo(() => {
    const c = m.table.clone()
    c.envMap = env
    c.envMapRotation = new Euler(0, 2.2, 0)
    c.alphaMap = fadeMask()
    c.transparent = true
    // Written to depth so contact shading (ambient occlusion) can see the tabletop.
    c.depthWrite = true
    return c
  }, [m, env])

  const slabs: [number, number, number, number][] = [
    [STATIONS.grinder.x, STATIONS.grinder.y, STATIONS.grinder.z, 2.4],
    [STATIONS.filter.x, STATIONS.filter.y, STATIONS.filter.z, 2.6],
    [STATIONS.dabara.x + 0.3, STATIONS.dabara.y, STATIONS.dabara.z, 3],
  ]

  return (
    <>
      {slabs.map(([x, y, z, r]) => (
        <mesh key={y} material={material} position={[x, y - 0.002, z]} rotation-x={-Math.PI / 2} receiveShadow renderOrder={-1}>
          <circleGeometry args={[r, 64]} />
        </mesh>
      ))}
    </>
  )
}
