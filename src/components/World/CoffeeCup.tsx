import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Matrix4, Quaternion, SphereGeometry, Vector3, type Group, type InstancedMesh, type Mesh } from 'three'
import { LiquidSurface } from './CoffeeBrew'
import { TUMBLER_INNER, innerRadiusAt } from './geometry'
import { useKit } from './models'
import { COFFEE_COLORS, getMaterials } from './materials'
import { bubbleMaterial, frothDomeGeometry, frothHeightAt, frothMaterial } from './froth'
import { TUMBLER } from './layout'
import { lerp, rng, smooth } from './math'

export const tumblerLevelY = (fill: number) => lerp(0.035, TUMBLER.height - 0.022, fill)

interface CoffeeCupProps {
  /** 0..1 liquid level */
  fill: () => number
  /** 0..1 froth crown: 0 = none, 1 = a full head heaped above the rim */
  foam: () => number
  color?: Color
  detail: 'high' | 'low'
  groupRef?: React.Ref<Group>
  position?: [number, number, number]
}

/** The brass tumbler with its coffee and signature froth crown. */
const m4 = new Matrix4()
const bq = new Quaternion()
const bp = new Vector3()
const bs = new Vector3()
const BUBBLE_TINTS = ['#e8cfa8', '#dcbd92', '#efdcbb', '#caa77d', '#f2e4cb', '#d4b389']

export default function CoffeeCup({ fill, foam, color = COFFEE_COLORS.withMilk, detail, groupRef, position }: CoffeeCupProps) {
  const m = getMaterials()
  const tumblerGeo = useKit('tumbler')
  const crown = useRef<Mesh>(null)
  const bubblesRef = useRef<InstancedMesh>(null)
  const bubbleGeo = useMemo(() => new SphereGeometry(1, detail === 'high' ? 10 : 7, detail === 'high' ? 8 : 5), [detail])
  const bubbles = useMemo(() => {
    const r = rng(314)
    const n = detail === 'high' ? 760 : 320
    return Array.from({ length: n }, () => {
      // Denser towards the middle and the rim, like a real head of froth.
      const t = Math.min(0.97, Math.pow(r(), 0.7))
      const big = r() < 0.12
      return {
        t,
        a: r() * Math.PI * 2,
        size: big ? 0.0045 + r() * 0.004 : 0.0018 + r() * 0.0028,
        appear: r(),
        tint: new Color(BUBBLE_TINTS[Math.floor(r() * BUBBLE_TINTS.length)]),
        rot: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), r() * 6.28),
      }
    })
  }, [detail])

  useLayoutEffect(() => {
    const mesh = bubblesRef.current
    if (!mesh) return
    bubbles.forEach((b, i) => mesh.setColorAt(i, b.tint))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [bubbles])

  useFrame(({ clock }) => {
    const d = crown.current
    const bm = bubblesRef.current
    if (!d || !bm) return
    const k = smooth(Math.min(1, foam()))
    const f = fill()
    d.visible = k > 0.01 && f > 0.15
    bm.visible = d.visible
    if (!d.visible) return
    // Froth sits on the coffee and, as it builds, rises to heap just over the rim.
    const y = tumblerLevelY(f)
    const r = innerRadiusAt(TUMBLER_INNER, y)
    d.position.y = y - 0.006
    d.scale.set(r * 0.985, 0.006 + k * 0.032, r * 0.985)
    // Froth breathes and slowly turns as bubbles settle.
    d.rotation.y = clock.elapsedTime * 0.04
    d.scale.y *= 1 + Math.sin(clock.elapsedTime * 1.3) * 0.02 * k

    // Bubbles ride the froth surface and multiply as the head builds.
    const R = r * 0.985
    const H = d.scale.y
    const spin = clock.elapsedTime * 0.04
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i]
      const grow = smooth(Math.min(1, Math.max(0, (k - b.appear * 0.7) / 0.3)))
      const a = b.a + spin
      bp.set(Math.cos(a) * b.t * R, d.position.y + H * frothHeightAt(b.t) - b.size * 0.35, Math.sin(a) * b.t * R)
      bs.setScalar(b.size * grow)
      bq.copy(b.rot)
      m4.compose(bp, bq, bs)
      bm.setMatrixAt(i, m4)
    }
    bm.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh geometry={tumblerGeo} material={m.tumblerBrass} customDepthMaterial={m.plainDepth} castShadow receiveShadow />
      <LiquidSurface
        initialColor="#6b3c1c"
        segments={detail === 'high' ? 40 : 24}
        drive={(s) => {
          const f = fill()
          s.visible = f > 0.01
          s.y = tumblerLevelY(f)
          s.radius = innerRadiusAt(TUMBLER_INNER, s.y)
          s.color.copy(color)
          // Bubbles gather on the surface as the pour goes on.
          s.foam = Math.min(0.9, f * 1.2)
        }}
      />
      <mesh ref={crown} geometry={frothDomeGeometry()} material={frothMaterial()} visible={false} />
      <instancedMesh ref={bubblesRef} args={[bubbleGeo, bubbleMaterial(), bubbles.length]} visible={false} frustumCulled={false} />
    </group>
  )
}
