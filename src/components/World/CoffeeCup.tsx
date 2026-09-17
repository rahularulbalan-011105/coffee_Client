import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type Mesh } from 'three'
import { LiquidSurface } from './CoffeeBrew'
import { TUMBLER_INNER, innerRadiusAt } from './geometry'
import { useKit } from './models'
import { COFFEE_COLORS, getMaterials } from './materials'
import { TUMBLER } from './layout'
import { lerp } from './math'

export const tumblerLevelY = (fill: number) => lerp(0.035, TUMBLER.height - 0.022, fill)

interface CoffeeCupProps {
  /** 0..1 liquid level */
  fill: () => number
  /** 0..1 froth dome above the liquid */
  foam: () => number
  color?: Color
  detail: 'high' | 'low'
  groupRef?: React.Ref<Group>
  position?: [number, number, number]
}

/** The brass tumbler with its coffee and signature froth crown. */
export default function CoffeeCup({ fill, foam, color = COFFEE_COLORS.withMilk, detail, groupRef, position }: CoffeeCupProps) {
  const m = getMaterials()
  const tumblerGeo = useKit('tumbler')
  const dome = useRef<Mesh>(null)
  const foamMaterial = useMemo(() => m.foam.clone(), [m.foam])

  useFrame(({ clock }) => {
    const d = dome.current
    if (!d) return
    const k = foam()
    const f = fill()
    d.visible = k > 0.01 && f > 0.2
    if (!d.visible) return
    const y = tumblerLevelY(f)
    const r = innerRadiusAt(TUMBLER_INNER, y)
    d.position.y = y - 0.002
    d.scale.set(r * 0.99, 0.004 + k * 0.032, r * 0.99)
    d.rotation.y = clock.elapsedTime * 0.05
    foamMaterial.opacity = Math.min(1, k * 1.6)
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh geometry={tumblerGeo} material={m.tumblerBrass} castShadow receiveShadow />
      <LiquidSurface
        initialColor="#6b3c1c"
        segments={detail === 'high' ? 40 : 24}
        drive={(s) => {
          const f = fill()
          s.visible = f > 0.01
          s.y = tumblerLevelY(f)
          s.radius = innerRadiusAt(TUMBLER_INNER, s.y)
          s.color.copy(color)
          s.foam = Math.min(0.9, f * 1.2)
        }}
      />
      <mesh ref={dome} material={foamMaterial} visible={false}>
        <sphereGeometry args={[1, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  )
}
