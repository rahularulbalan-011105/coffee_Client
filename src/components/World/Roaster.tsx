import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, Vector3, type Group, type PointLight } from 'three'
import { sceneState } from '../../animation/journey'
import BeanFlow, { type Waypoint } from './BeanFlow'
import { Steam } from './Effects3D'
import { useKit } from './models'
import { getMaterials, PLANT_COLORS } from './materials'
import { GRINDER, ROASTER, STATIONS } from './layout'
import { sub, window01 } from './math'

const trayColor = new Color()

/**
 * Drum roaster and cooling tray. Straw-green beans go in through the brass hopper;
 * the drum turns, the window glows, and chestnut-brown beans spill into the tray,
 * where a sweeping arm cools them before they drop to the grinder below.
 */
export default function Roaster({ beans, detail }: { beans: number; detail: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const wheel = useRef<Group>(null)
  const arm = useRef<Group>(null)
  const glow = useRef<PointLight>(null)
  const hopperGeo = useKit('roasterHopper')
  const beanGeo = useKit('bean')
  const m = getMaterials()
  const R = STATIONS.roaster
  const tray = useMemo(() => new Vector3().copy(R).add(ROASTER.tray), [R])
  const seg = detail === 'high' ? 48 : 24

  const armAngle = () => sceneState.roast * Math.PI * 3 + sub(sceneState.toGrinder, 0, 1) * Math.PI

  const waypoints = useMemo<Waypoint[]>(() => {
    const chute = new Vector3().copy(R).add(ROASTER.chute)
    const hopper = new Vector3(STATIONS.grinder.x, STATIONS.grinder.y + GRINDER.hopperTop + 0.12, STATIONS.grinder.z)
    return [
      {
        place: (_i, r) => chute.clone().add(new Vector3((r() - 0.5) * 0.08, 0, (r() - 0.5) * 0.08)),
        color: () => PLANT_COLORS.roastingBean,
      },
      {
        place: (_i, r) => {
          const a = r() * Math.PI * 2
          const rad = Math.sqrt(r()) * (ROASTER.trayRadius - 0.1)
          return new Vector3(tray.x + Math.cos(a) * rad, tray.y + 0.1 + r() * 0.03, tray.z + Math.sin(a) * rad)
        },
        color: () => trayColor.copy(PLANT_COLORS.roastingBean).lerp(PLANT_COLORS.roastedBean, sub(sceneState.roast, 0.5, 1)),
        spin: { center: tray, angle: () => armAngle() * 0.35 },
        flat: true,
      },
      {
        place: (_i, r) => new Vector3(hopper.x + (r() - 0.5) * 0.3, hopper.y, hopper.z + (r() - 0.5) * 0.3),
        color: () => PLANT_COLORS.roastedBean,
      },
    ]
  }, [R, tray])

  useFrame(({ clock }) => {
    const s = sceneState
    if (group.current) group.current.visible = s.pos > 2.4 && s.pos < 5.1
    const heat = window01(s.roast, 0, 1, 0.2)
    m.ember.emissiveIntensity = 0.4 + heat * 3.2 * (0.9 + 0.1 * Math.sin(clock.elapsedTime * 7))
    if (glow.current) glow.current.intensity = s.pos > 2.4 && s.pos < 5.1 ? heat * 1.6 : 0
    if (wheel.current) wheel.current.rotation.z = -s.roast * Math.PI * 6
    if (arm.current) arm.current.rotation.y = -armAngle()
  }, -1)

  return (
    <>
    <pointLight ref={glow} position={[R.x - 0.6, R.y + ROASTER.drumY + 0.4, R.z + 1.9]} color="#ff7a2a" intensity={0} distance={4} decay={2} />
    <group ref={group}>
      <group position={R}>
        {/* Cabinet */}
        <RoundedBox args={[1.5, 0.95, 1.2]} radius={0.05} position={[0, 0.475, 0]} castShadow receiveShadow>
          <primitive object={m.enamel} attach="material" />
        </RoundedBox>
        <mesh material={m.brass} position={[0, 0.9, 0.61]}>
          <boxGeometry args={[1.5, 0.03, 0.02]} />
        </mesh>
        {/* Drum housing */}
        <mesh material={m.enamel} position={[0, ROASTER.drumY, 0]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[ROASTER.drumRadius, ROASTER.drumRadius, 1.1, seg]} />
        </mesh>
        {[-0.4, 0, 0.4].map((z) => (
          <mesh key={z} material={m.brassDark} position={[0, ROASTER.drumY, z]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[ROASTER.drumRadius + 0.005, 0.014, 8, seg]} />
          </mesh>
        ))}
        {/* Brass faceplate with glowing window and handwheel */}
        <mesh material={m.brassDark} position={[0, ROASTER.drumY, 0.56]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[ROASTER.drumRadius + 0.04, ROASTER.drumRadius + 0.04, 0.05, seg]} />
        </mesh>
        <mesh material={m.ember} position={[-0.18, ROASTER.drumY + 0.12, 0.59]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 24]} />
        </mesh>
        <group ref={wheel} position={[0.22, ROASTER.drumY + 0.05, 0.62]}>
          <mesh material={m.brassDark}>
            <torusGeometry args={[0.13, 0.012, 8, 32]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={m.brassDark} rotation-z={(i / 3) * Math.PI}>
              <boxGeometry args={[0.26, 0.012, 0.012]} />
            </mesh>
          ))}
        </group>
        {/* Hopper + chimney */}
        <mesh geometry={hopperGeo} material={m.brass} position={[0, ROASTER.drumY + ROASTER.drumRadius - 0.05, 0]} castShadow />
        <mesh material={m.enamel} position={[-0.45, ROASTER.drumY + 1.3, -0.35]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 2.2, 16]} />
        </mesh>
        {/* Discharge chute */}
        <mesh material={m.brass} position={[0.5, ROASTER.drumY - 0.25, 0.6]} rotation-z={-1.0} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.4, 16, 1, true]} />
        </mesh>
        {/* Cooling tray on its stand */}
        <group position={ROASTER.tray}>
          <mesh material={m.enamel} position={[0, -0.4, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, 0.8, 16]} />
          </mesh>
          <mesh material={m.steel} position={[0, 0.02, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[ROASTER.trayRadius + 0.04, ROASTER.trayRadius, 0.06, seg]} />
          </mesh>
          <mesh material={m.perforated} position={[0, 0.056, 0]} rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[ROASTER.trayRadius, seg]} />
          </mesh>
          <mesh material={m.brass} position={[0, 0.09, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[ROASTER.trayRadius + 0.03, 0.022, 8, seg]} />
          </mesh>
          <group ref={arm} position={[0, 0.12, 0]}>
            <mesh material={m.brass}>
              <cylinderGeometry args={[0.05, 0.05, 0.1, 16]} />
            </mesh>
            <mesh material={m.brassDark} position={[ROASTER.trayRadius / 2, 0, 0]}>
              <boxGeometry args={[ROASTER.trayRadius, 0.035, 0.03]} />
            </mesh>
          </group>
        </group>
      </group>

      <Steam
        position={[R.x - 0.45, R.y + ROASTER.drumY + 2.4, R.z - 0.35]}
        width={0.5}
        height={1.6}
        count={detail === 'high' ? 3 : 2}
        intensity={() => window01(sceneState.roast, 0.1, 1, 0.3) * 0.7}
      />
      <Steam
        position={[tray.x, tray.y + 0.1, tray.z]}
        width={0.9}
        height={1.0}
        count={2}
        intensity={() => window01(sceneState.trayOut, 0.2, 1, 0.3) * 0.5 * (1 - sub(sceneState.toGrinder, 0, 0.6))}
      />

      <BeanFlow
        count={beans}
        geometry={beanGeo}
        material={m.bean}
        seed={52}
        waypoints={waypoints}
        legs={[
          { progress: () => sceneState.trayOut, stagger: 0.75, arc: 0.12, ease: 'fall' },
          {
            progress: () => sceneState.toGrinder,
            stagger: 0.7,
            arc: 0.8,
            ease: 'glide',
            sink: new Vector3(STATIONS.grinder.x, STATIONS.grinder.y + GRINDER.throat + 0.05, STATIONS.grinder.z),
          },
        ]}
        spawn
        vanish
        castShadow={detail === 'high'}
        active={() => sceneState.pos > 2.4 && sceneState.pos < 5.1}
      />
    </group>
    </>
  )
}
