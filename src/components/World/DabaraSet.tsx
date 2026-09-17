import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, Vector3, type Group, type SpotLight } from 'three'
import { sceneState } from '../../animation/journey'
import CoffeeCup, { tumblerLevelY } from './CoffeeCup'
import CoffeePour, { type StreamState } from './CoffeePour'
import BeanFlow from './BeanFlow'
import { useKit } from './models'
import { LiquidSurface, type LiquidState } from './CoffeeBrew'
import { Splash, Steam } from './Effects3D'
import { DABARA_INNER, innerRadiusAt } from './geometry'
import { COFFEE_COLORS, getMaterials, PLANT_COLORS } from './materials'
import { DABARA, STATIONS, TUMBLER } from './layout'
import { easeInOut, easeOut, lerp, smooth, sub, window01 } from './math'

/* --------------------------------------------------------------- the vessel */

interface DabaraVesselProps {
  detail: 'high' | 'low'
  liquid?: (s: LiquidState) => void
}

/** The dabara: a deep brass bowl with a flat, flared rim and an engraved band. */
export function DabaraVessel({ detail, liquid }: DabaraVesselProps) {
  const m = getMaterials()
  const geo = useKit('dabara')
  return (
    <group>
      <mesh geometry={geo} material={m.dabaraBrass} customDepthMaterial={m.plainDepth} castShadow receiveShadow />
      {liquid && <LiquidSurface initialColor="#3a1d0c" drive={liquid} segments={detail === 'high' ? 56 : 28} />}
    </group>
  )
}

/* ----------------------------------------------------------- choreography */

const LIP = new Vector3(DABARA.rim + 0.006, DABARA.height + 0.006, 0)
const REST = new Vector3().copy(STATIONS.dabara).add(LIP)
const HIDDEN = new Vector3(REST.x - 0.3, REST.y, REST.z - 5)
const POUR = new Vector3(STATIONS.tumbler.x - 0.07, STATIONS.tumbler.y + TUMBLER.height + 0.3, STATIONS.tumbler.z)
/** Where the dabara settles for the hero shot: behind and left of the tumbler. */
export const DABARA_FINAL = new Vector3(STATIONS.tumbler.x - 0.62, STATIONS.tumbler.y, STATIONS.tumbler.z - 0.22)
const FINAL = new Vector3().copy(DABARA_FINAL).add(LIP)
const TILT_MAX = 1.42

const mixed = new Color()
const dir = new Vector3()

function dabaraAmount() {
  const s = sceneState
  const fromFilter = 0.62 * sub(s.transfer, 0.44, 0.76)
  const milk = 0.38 * sub(s.milk, 0.1, 0.9)
  return (fromFilter + milk) * (1 - sub(s.pour, 0.3, 0.86))
}

function dabaraTilt(p: number) {
  if (p < 0.22) return 0
  if (p < 0.8) return -easeInOut(sub(p, 0.22, 0.62)) * TILT_MAX - sub(p, 0.62, 0.8) * 0.2
  return -(TILT_MAX + 0.2) * (1 - easeInOut(sub(p, 0.8, 0.96)))
}

function dabaraPose(out: Vector3) {
  const s = sceneState
  // Glides in from the dark as the decoction arrives.
  const arrive = easeOut(sub(s.transfer, 0, 0.32))
  out.lerpVectors(HIDDEN, REST, arrive)
  const p = s.pour
  if (p > 0) {
    const up = easeInOut(sub(p, 0, 0.24))
    const down = easeInOut(sub(p, 0.8, 1))
    out.lerp(FINAL, down)
    const k = up * (1 - down)
    out.lerp(POUR, k)
    out.y += Math.sin(up * Math.PI) * 0.08 * (1 - down)
  }
  return out
}

export default function DabaraSet({ detail }: { detail: 'high' | 'low' }) {
  const root = useRef<Group>(null)
  const pivot = useRef<Group>(null)
  const beanGeo = useKit('bean')
  const m = getMaterials()
  const tumbler = useRef<Group>(null)
  const rim = useRef<SpotLight>(null)
  const sweep = useRef<SpotLight>(null)
  const target = useRef(new Object3D())

  useFrame(() => {
    const s = sceneState
    if (root.current) root.current.visible = s.pos > 6.6
    const pv = pivot.current
    if (pv) {
      dabaraPose(pv.position)
      pv.rotation.z = dabaraTilt(s.pour)
      pv.visible = s.transfer > 0.001 || s.pour > 0
    }
    const tb = tumbler.current
    if (tb) {
      const k = easeOut(s.reveal)
      tb.visible = s.reveal > 0.001
      tb.position.set(STATIONS.tumbler.x, STATIONS.tumbler.y, lerp(STATIONS.tumbler.z - 4.5, STATIONS.tumbler.z, k))
      tb.rotation.y = (1 - k) * 0.6
    }
    if (rim.current) rim.current.intensity = 14 * smooth(sub(s.transfer, 0, 0.5)) + 10 * s.reveal
    if (sweep.current) {
      const k = s.reveal
      sweep.current.position.set(STATIONS.tumbler.x - 1.8 + k * 2.6, STATIONS.tumbler.y + 1.3, STATIONS.tumbler.z + 1.4)
      sweep.current.intensity = 22 * window01(k, 0, 1, 0.35) + 7 * sub(s.pour, 0.5, 1)
    }
  }, -1)

  const dabaraLiquid = (st: LiquidState) => {
    const a = dabaraAmount()
    const tilt = dabaraTilt(sceneState.pour)
    st.visible = a > 0.01 && Math.abs(tilt) < 0.4
    st.y = lerp(0.03, DABARA.height - 0.02, a)
    st.radius = innerRadiusAt(DABARA_INNER, st.y) * (1 - Math.abs(tilt) * 0.5)
    mixed.copy(COFFEE_COLORS.decoction).lerp(COFFEE_COLORS.withMilk, sub(sceneState.milk, 0.05, 0.9))
    st.color.copy(mixed)
    st.foam = 0.75 * sub(sceneState.milk, 0.3, 1)
    st.tilt = tilt
  }

  const tumblerFill = () => sub(sceneState.pour, 0.3, 0.86)
  const tumblerFoam = () => Math.min(1, sub(sceneState.pour, 0.55, 1) * 0.65 + sceneState.finale * 0.35)

  const pourStream = (st: StreamState) => {
    const pv = pivot.current
    if (!pv) return
    const p = sceneState.pour
    dir.set(Math.cos(pv.rotation.z), Math.sin(pv.rotation.z), 0)
    st.p0.copy(pv.position).addScaledVector(dir, 0.006)
    st.p1.copy(st.p0).add(dir.set(0.05, 0.0, 0))
    const t = STATIONS.tumbler
    const surface = t.y + tumblerLevelY(tumblerFill())
    st.p2.set(t.x - 0.01, lerp(st.p0.y, surface, 0.45), t.z)
    st.p3.set(t.x, surface, t.z)
    st.head = smooth(sub(p, 0.3, 0.36))
    st.tail = smooth(sub(p, 0.8, 0.86))
    // A long "meter" pull is thinner and faster than a close pour.
    st.radius = 0.0105 * (1 - 0.35 * sub(p, 0.55, 0.8))
  }

  const milkStream = (st: StreamState) => {
    const d = STATIONS.dabara
    const k = sceneState.milk
    st.p0.set(d.x + 0.07, d.y + 3.3, d.z - 0.02)
    st.p1.set(d.x + 0.06, d.y + 2.4, d.z - 0.02)
    st.p2.set(d.x + 0.05, d.y + 1.2, d.z - 0.01)
    st.p3.set(d.x + 0.04, d.y + lerp(0.03, DABARA.height - 0.02, dabaraAmount()), d.z)
    st.head = smooth(sub(k, 0, 0.15))
    st.tail = smooth(sub(k, 0.8, 1))
    st.radius = 0.007
  }

  const t = STATIONS.tumbler
  const d = STATIONS.dabara

  return (
    <>
    <group ref={root}>
      <group ref={pivot} position={HIDDEN} visible={false}>
        <group position={[-LIP.x, -LIP.y, 0]}>
          <DabaraVessel detail={detail} liquid={dabaraLiquid} />
        </group>
      </group>

      <CoffeeCup groupRef={tumbler} fill={tumblerFill} foam={tumblerFoam} detail={detail} />

      <CoffeePour color="#3b1c0b" highlight="#ffcf9a" drive={pourStream} taper={0.5} />
      <CoffeePour color="#efe5d6" highlight="#ffffff" drive={milkStream} taper={0.7} segments={40} />

      <Splash
        count={detail === 'high' ? 40 : 18}
        drive={(out) => {
          out.set(t.x, t.y + tumblerLevelY(tumblerFill()) + 0.004, t.z)
          return window01(sceneState.pour, 0.33, 0.84, 0.05)
        }}
      />

      <Steam
        position={[t.x, t.y + TUMBLER.height, t.z]}
        width={0.26}
        height={0.7}
        count={detail === 'high' ? 3 : 2}
        intensity={() => sub(sceneState.pour, 0.45, 1) * 0.6}
      />
      <Steam
        position={[d.x, d.y + DABARA.height, d.z]}
        width={0.36}
        height={0.7}
        count={2}
        intensity={() => window01(sceneState.milk, 0.1, 1, 0.3) * 0.7 * (1 - sub(sceneState.pour, 0, 0.2))}
      />

      {/* Roasted beans settle around the finished cup — the journey's first frame, echoed. */}
      <BeanFlow
        count={detail === 'high' ? 18 : 10}
        geometry={beanGeo}
        material={m.bean}
        seed={63}
        waypoints={[
          {
            place: (_i, r) => new Vector3(t.x + (r() - 0.5) * 1.6, t.y + 1.2 + r() * 0.6, t.z + (r() - 0.5) * 1.2),
            color: () => PLANT_COLORS.roastedBean,
          },
          {
            place: (_i, r) => {
              for (let k = 0; k < 40; k++) {
                const x = t.x - 0.1 + (r() - 0.5) * 1.7
                const z = t.z + 0.15 + (r() - 0.5) * 1.1
                if (Math.hypot(x - DABARA_FINAL.x, z - DABARA_FINAL.z) < 0.42) continue
                if (Math.hypot(x - t.x, z - t.z) < 0.2) continue
                return new Vector3(x, t.y + 0.022, z)
              }
              return new Vector3(t.x + 0.5, t.y + 0.022, t.z + 0.4)
            },
            color: () => PLANT_COLORS.roastedBean,
            flat: true,
          },
        ]}
        legs={[{ progress: () => sceneState.finale, stagger: 0.6, arc: 0.05, ease: 'fall' }]}
        spawn
      />
    </group>

    {/* Lights live outside the toggled group so the scene's light count never changes. */}
    <primitive object={target.current} position={[t.x - 0.2, t.y + 0.25, t.z]} />
    <spotLight
      ref={rim}
      position={[t.x + 1.3, t.y + 1.5, t.z - 1.3]}
      target={target.current}
      color="#ffc27a"
      angle={0.55}
      penumbra={0.9}
      intensity={0}
      distance={6}
      decay={1.6}
    />
    <spotLight
      ref={sweep}
      position={[t.x - 1.8, t.y + 1.3, t.z + 1.4]}
      target={target.current}
      color="#fff0d8"
      angle={0.35}
      penumbra={1}
      intensity={0}
      distance={6}
      decay={1.6}
    />
    </>
  )
}
