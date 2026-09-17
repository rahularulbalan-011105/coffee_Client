import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group, type Mesh } from 'three'
import { sceneState } from '../../animation/journey'
import CoffeePour, { type StreamState } from './CoffeePour'
import { LiquidSurface, type LiquidState } from './CoffeeBrew'
import { Aroma, Drips, Steam } from './Effects3D'
import { useKit } from './models'
import { COFFEE_COLORS, getMaterials } from './materials'
import { FILTER, STATIONS } from './layout'
import { easeInOut, easeOut, lerp, smooth, sub, window01 } from './math'

/** The lower vessel pivots about its pouring lip (+X rim) during the transfer. */
const LIP = new Vector3(0.316, FILTER.lowerHeight, 0)
const REST_PIVOT = new Vector3().copy(STATIONS.filter).add(LIP)
const POUR_PIVOT = new Vector3(STATIONS.dabara.x - 0.26, STATIONS.dabara.y + 0.98, STATIONS.dabara.z)
const EXIT_PIVOT = new Vector3(STATIONS.dabara.x - 1.2, STATIONS.dabara.y + 1.1, STATIONS.dabara.z - 5.5)

const tmp = new Vector3()
const tmp2 = new Vector3()

/** Decoction level, shared by the liquid surface and the drips. */
const filterReadout = { decoctionLevel: 0 }

function transferPose(t: number, out: Vector3) {
  // 0–.35 travel, .35–.75 pour, .75–1 exit into the dark.
  if (t < 0.35) {
    const k = easeInOut(t / 0.35)
    out.lerpVectors(REST_PIVOT, POUR_PIVOT, k)
    out.y += Math.sin(k * Math.PI) * 0.35
  } else if (t < 0.75) {
    out.copy(POUR_PIVOT)
    out.x += Math.sin(((t - 0.35) / 0.4) * Math.PI) * 0.03
  } else {
    const k = easeInOut((t - 0.75) / 0.25)
    out.lerpVectors(POUR_PIVOT, EXIT_PIVOT, k)
  }
  return out
}

function transferTilt(t: number) {
  if (t < 0.3) return 0
  if (t < 0.72) return -easeInOut(sub(t, 0.3, 0.72)) * 1.95
  return -1.95 * (1 - easeInOut(sub(t, 0.72, 0.95)))
}

export default function Filter({ detail }: { detail: 'high' | 'low' }) {
  const m = getMaterials()
  const lowerGeo = useKit('filterLower')
  const upperGeo = useKit('filterUpper')
  const lidGeo = useKit('filterLid')
  const pressGeo = useKit('pressDisc')
  const root = useRef<Group>(null)
  const kettle = useRef<Group>(null)

  const upper = useRef<Group>(null)
  const lowerPivot = useRef<Group>(null)
  const mound = useRef<Mesh>(null)
  const press = useRef<Group>(null)
  const lid = useRef<Group>(null)

  useFrame(() => {
    const s = sceneState
    if (root.current) root.current.visible = s.pos > 4.4 && s.pos < 8.6

    // A steel kettle tips in for the water, then withdraws.
    if (kettle.current) {
      const inK = easeInOut(sub(s.water, 0, 0.12))
      const outK = easeInOut(sub(s.water, 0.85, 1))
      const fs = STATIONS.filter
      kettle.current.visible = s.water > 0.001 && s.water < 0.999
      kettle.current.position.set(fs.x + 0.42 + (1 - inK + outK) * 1.2, fs.y + 2.3, fs.z + 0.02)
      kettle.current.rotation.z = 0.75 * inK * (1 - outK)
    }

    // Powder settles into the upper chamber as the stream lands.
    if (mound.current) {
      const k = sub(s.powder, 0.3, 1)
      mound.current.visible = k > 0.01
      mound.current.scale.set(0.24 * (0.6 + 0.4 * k), 0.07 * k + 0.004, 0.24 * (0.6 + 0.4 * k))
      mound.current.position.y = 0.012 - s.press * 0.012
    }

    // Pressing disc descends from above onto the grounds.
    if (press.current) {
      const k = easeOut(s.press)
      press.current.visible = s.press > 0.001 && s.lift < 0.4
      press.current.position.y = lerp(1.3, 0.075, k)
    }

    // Lid arrives after the water.
    if (lid.current) {
      const k = easeInOut(s.lid)
      lid.current.visible = s.lid > 0.001
      lid.current.position.y = lerp(1.25, FILTER.upperTop - FILTER.upperBottom - 0.004, k)
      lid.current.rotation.z = (1 - k) * 0.35
    }

    // Upper chamber lifts to reveal the decoction, then drifts into darkness.
    if (upper.current) {
      const a = easeInOut(sub(s.lift, 0, 0.55))
      const b = easeInOut(sub(s.lift, 0.55, 1))
      upper.current.position.set(STATIONS.filter.x, STATIONS.filter.y + FILTER.upperBottom + a * 0.62 + b * 0.9, STATIONS.filter.z - b * 2.4)
      upper.current.rotation.x = -b * 0.25
      upper.current.visible = b < 0.999
    }

    // Lower chamber: rest → carried to the dabara → poured → exits.
    if (lowerPivot.current) {
      const t = s.transfer
      transferPose(t, lowerPivot.current.position)
      lowerPivot.current.rotation.z = transferTilt(t)
      lowerPivot.current.visible = t < 0.999
    }

    const poured = sub(s.transfer, 0.42, 0.72)
    filterReadout.decoctionLevel = 0.04 + smooth(s.extract) * 0.36 * (1 - poured)
  }, -1)

  const decoction = (st: LiquidState) => {
    const tilt = Math.abs(transferTilt(sceneState.transfer))
    st.visible = sceneState.extract > 0.02 && tilt < 0.25
    st.y = filterReadout.decoctionLevel
    st.radius = 0.289
    st.color.copy(COFFEE_COLORS.decoction)
    st.foam = 0.06 * sub(sceneState.extract, 0.5, 1)
    st.tilt = -tilt
  }

  const water = (st: LiquidState) => {
    const w = sceneState.water
    st.visible = w > 0.05 && sceneState.lid < 0.98
    st.y = 0.1 + smooth(sub(w, 0.05, 1)) * 0.3
    st.radius = 0.279
    // Water blooms dark as it soaks the grounds.
    st.color.copy(COFFEE_COLORS.decoction).lerp(COFFEE_COLORS.withMilk, 0.25 * (1 - w))
    st.foam = 0.5 * sub(w, 0.15, 0.6)
  }

  const waterStream = (st: StreamState) => {
    const w = sceneState.water
    const f = STATIONS.filter
    const surface = f.y + FILTER.upperBottom + 0.1 + smooth(sub(w, 0.05, 1)) * 0.3
    // From the kettle spout, arcing into the chamber.
    st.p0.set(f.x + 0.2, f.y + 2.2, f.z + 0.02)
    st.p1.set(f.x + 0.1, f.y + 2.2, f.z + 0.02)
    st.p2.set(f.x + 0.04, f.y + 1.7, f.z + 0.01)
    st.p3.set(f.x + 0.03, surface, f.z)
    st.head = smooth(sub(w, 0, 0.12))
    st.tail = smooth(sub(w, 0.82, 1))
    st.radius = 0.008
  }

  const transferStream = (st: StreamState) => {
    const pivot = lowerPivot.current
    if (!pivot) return
    // Lip in world space (pivot sits at the lip).
    tmp.copy(pivot.position)
    const tilt = pivot.rotation.z
    tmp2.set(Math.cos(tilt), Math.sin(tilt), 0)
    st.p0.copy(tmp).addScaledVector(tmp2, 0.012)
    st.p1.copy(st.p0).add(tmp2.set(0.08, -0.02, 0))
    const d = STATIONS.dabara
    const surfaceY = d.y + 0.05 + sub(sceneState.transfer, 0.42, 0.76) * 0.07
    st.p2.set(d.x - 0.08, st.p0.y - 0.25, d.z)
    st.p3.set(d.x - 0.04, surfaceY, d.z)
    const t = sceneState.transfer
    st.head = smooth(sub(t, 0.42, 0.48))
    st.tail = smooth(sub(t, 0.7, 0.76))
    st.radius = 0.016 * (0.6 + 0.4 * (1 - sub(t, 0.62, 0.74)))
  }

  const f = STATIONS.filter

  return (
    <group ref={root}>
      {/* Lower chamber, parented to its pouring lip */}
      <group ref={lowerPivot} position={REST_PIVOT}>
        <group position={[-LIP.x, -LIP.y, 0]}>
          <mesh geometry={lowerGeo} material={m.filterLowerBrass} customDepthMaterial={m.plainDepth} castShadow receiveShadow />
          <mesh position-y={0.021} rotation-x={-Math.PI / 2} material={m.brassInner}>
            <circleGeometry args={[0.29, 32]} />
          </mesh>
          <LiquidSurface initialColor="#1d0d05" drive={decoction} segments={detail === 'high' ? 48 : 24} />
        </group>
      </group>

      {/* Upper chamber assembly */}
      <group ref={upper} position={[f.x, f.y + FILTER.upperBottom, f.z]}>
        <mesh geometry={upperGeo} material={m.filterUpperBrass} customDepthMaterial={m.plainDepth} castShadow receiveShadow />
        <mesh position-y={0.006} rotation-x={-Math.PI / 2} material={m.perforated}>
          <circleGeometry args={[0.274, 40]} />
        </mesh>
        <mesh ref={mound} position-y={0.012} material={m.powder} visible={false}>
          <sphereGeometry args={[1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <LiquidSurface initialColor="#2a160b" drive={water} segments={32} />
        <group ref={press} visible={false}>
          <mesh geometry={pressGeo} material={m.satinPlain} castShadow />
          <mesh position-y={0.17} material={m.satinPlain} castShadow>
            <cylinderGeometry args={[0.011, 0.011, 0.26, 10]} />
          </mesh>
          <mesh position-y={0.31} material={m.brass} castShadow>
            <sphereGeometry args={[0.03, 16, 12]} />
          </mesh>
        </group>
        <group ref={lid} visible={false}>
          <mesh geometry={lidGeo} material={m.satinPlain} castShadow />
          {/* Ball knob on a short turned stem */}
          <mesh position-y={0.098} material={m.satinPlain} castShadow>
            <cylinderGeometry args={[0.012, 0.03, 0.035, 20]} />
          </mesh>
          <mesh position-y={0.14} material={m.satinPlain} castShadow>
            <sphereGeometry args={[0.034, 24, 16]} />
          </mesh>
        </group>
      </group>

      {/* Steel water kettle */}
      <group ref={kettle} visible={false}>
        <mesh material={m.steel} castShadow>
          <sphereGeometry args={[0.2, 32, 20]} />
        </mesh>
        <mesh material={m.steel} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.08, 24]} />
        </mesh>
        <mesh material={m.steel} position={[-0.25, 0.04, 0]} rotation-z={1.1}>
          <cylinderGeometry args={[0.018, 0.035, 0.24, 12]} />
        </mesh>
        <mesh material={m.woodKnob} position={[0.16, 0.14, 0]} rotation-z={-0.5}>
          <torusGeometry args={[0.1, 0.014, 8, 20, Math.PI]} />
        </mesh>
      </group>

      <Aroma
        count={detail === 'high' ? 70 : 30}
        position={[f.x, f.y + 0.45, f.z]}
        height={1.1}
        radius={0.2}
        intensity={() => window01(sceneState.brew, 0.1, 0.75, 0.2)}
      />

      <CoffeePour color="#c9d9e0" highlight="#ffffff" opacity={0.55} taper={0.7} drive={waterStream} segments={48} />
      <CoffeePour color="#1a0b04" drive={transferStream} taper={0.6} />

      {/* Decoction drips from the lifted chamber */}
      <Drips
        count={detail === 'high' ? 36 : 16}
        radius={0.22}
        position={[f.x, f.y, f.z]}
        drive={() => {
          const s = sceneState
          const a = easeInOut(sub(s.lift, 0, 0.55))
          const top = FILTER.upperBottom + a * 0.62
          const active = a > 0.08 ? window01(s.lift, 0.05, 0.62, 0.12) : 0
          return [top, filterReadout.decoctionLevel + 0.005, active]
        }}
      />

      <Steam
        position={[f.x, f.y + FILTER.lowerHeight, f.z]}
        count={detail === 'high' ? 3 : 2}
        width={0.4}
        height={0.95}
        intensity={() => window01(sceneState.water, 0.1, 1, 0.3) * 0.8 + window01(sceneState.brew, 0.05, 0.6, 0.2)}
      />
    </group>
  )
}
