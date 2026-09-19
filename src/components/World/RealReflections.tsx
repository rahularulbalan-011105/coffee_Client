import { useLayoutEffect } from 'react'
import { useEnvironment } from '@react-three/drei'
import { Euler } from 'three'
import { getMaterials } from './materials'
import { INTERIOR_HDR } from './realAssets'

/**
 * Brass, steel and wood reflect a real photographed interior (a warm wood-panelled room),
 * while the estate keeps its own outdoor light. Assigned before the shaders are warmed up.
 */
export default function RealReflections() {
  const env = useEnvironment({ files: INTERIOR_HDR })
  useLayoutEffect(() => {
    const m = getMaterials()
    const rotation = new Euler(0, 2.2, 0)
    for (const mat of [m.brass, m.dabaraBrass, m.tumblerBrass, m.filterLowerBrass, m.filterUpperBrass, m.satinPlain, m.brassInner, m.brassDark, m.steel, m.steelInner, m.perforated, m.wood, m.woodKnob, m.table, m.enamel]) {
      mat.envMap = env
      mat.envMapRotation.copy(rotation)
      mat.needsUpdate = true
    }
  }, [env])
  return null
}
