import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Color, InstancedMesh, Matrix4, Quaternion, TubeGeometry, Vector3, type Group, type PointLight } from 'three'
import { sceneState } from '../../animation/journey'
import BeanFlow, { type Waypoint } from './BeanFlow'
import { useKit } from './models'
import { getMaterials, PLANT_COLORS } from './materials'
import { BRANCH, MIST_BAND_Y, STATIONS } from './layout'
import { clamp01, rng } from './math'

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const ripeColor = new Color()
/** Each cherry ripens on its own schedule: green → amber → crimson. */
function cherryColor(i: number) {
  const k = clamp01((sceneState.ripen - hash(i) * 0.45) / 0.55)
  if (k < 0.5) return ripeColor.copy(PLANT_COLORS.cherryUnripe).lerp(PLANT_COLORS.cherryTurning, k * 2)
  const deep = hash(i + 9) > 0.6 ? PLANT_COLORS.cherryDeep : PLANT_COLORS.cherryRipe
  return ripeColor.copy(PLANT_COLORS.cherryTurning).lerp(deep, (k - 0.5) * 2)
}

/**
 * A single coffee branch, close enough to touch: opposite pairs of glossy leaves and
 * tight cherry clusters at the nodes. The cherries ripen, let go, and fall towards the
 * drying yard far below — the camera follows them down.
 */
export default function Harvest({ detail }: { detail: 'high' | 'low' }) {
  const group = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const leafRef = useRef<InstancedMesh>(null)
  const leafGeo = useKit('leaf')
  const cherryGeo = useKit('cherry')
  const m = getMaterials()

  const { tube, nodes } = useMemo(() => {
    const pts = [
      new Vector3(-4.8, -1.4, -2.6),
      new Vector3(-2.8, -0.4, -1.2),
      new Vector3(-0.8, 0.1, -0.1),
      new Vector3(1.2, 0.05, 0.55),
      new Vector3(3.0, -0.45, 0.95),
    ].map((p) => p.add(BRANCH))
    const c = new CatmullRomCurve3(pts)
    const segs = 80
    const radial = 10
    const g = new TubeGeometry(c, segs, 0.07, radial, false)
    // Taper towards the growing tip.
    const pos = g.attributes.position
    const centre = new Vector3()
    const pnt = new Vector3()
    for (let i = 0; i < pos.count; i++) {
      const seg = Math.floor(i / (radial + 1))
      const u = seg / segs
      c.getPointAt(u, centre)
      pnt.fromBufferAttribute(pos, i).sub(centre).multiplyScalar(1 - u * 0.6).add(centre)
      pos.setXYZ(i, pnt.x, pnt.y, pnt.z)
    }
    g.computeVertexNormals()
    const n = Array.from({ length: 8 }, (_, k) => {
      const u = 0.12 + k * 0.11
      return { u, p: c.getPointAt(u), t: c.getTangentAt(u) }
    })
    return { tube: g, nodes: n }
  }, [])

  // Opposite leaf pairs at every node.
  useLayoutEffect(() => {
    const mesh = leafRef.current
    if (!mesh) return
    const r = rng(15)
    const q = new Quaternion()
    const basis = new Matrix4()
    let i = 0
    const up = new Vector3(0, 1, 0)
    for (const node of nodes) {
      const side = new Vector3().crossVectors(node.t, up).normalize()
      for (const s of [-1, 1]) {
        // Opposite leaves: tip out to the side and slightly forward, drooping a little;
        // the blade faces the sky (and the camera looking down on it).
        const tip = side.clone().multiplyScalar(s).addScaledVector(node.t, 0.45).add(new Vector3(0, -0.28 - r() * 0.2, 0)).normalize()
        const face = up.clone().addScaledVector(tip, -up.dot(tip)).add(new Vector3(0, 0, 0.25)).normalize()
        const across = new Vector3().crossVectors(tip, face).normalize()
        face.crossVectors(across, tip).normalize()
        basis.makeBasis(across, tip, face)
        q.setFromRotationMatrix(basis)
        const size = 1.4 + node.u * 0.5 + r() * 0.3
        mesh.setMatrixAt(i, new Matrix4().compose(node.p.clone().addScaledVector(side, s * 0.04), q, new Vector3(size, size, size)))
        mesh.setColorAt(i, new Color(PLANT_COLORS.leaves[Math.floor(r() * 6)]).multiplyScalar(1.05 + r() * 0.3))
        i++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [nodes])

  const cherryWaypoints = useMemo<Waypoint[]>(() => {
    const clusters = nodes.slice(1, 7)
    const perCluster = 7
    return [
      {
        // Tight cluster hugging the branch just below the node.
        place: (i) => {
          const node = clusters[Math.floor(i / perCluster) % clusters.length]
          const ang = (i % perCluster) / perCluster * Math.PI * 2 + hash(i) * 0.6
          const side = new Vector3().crossVectors(node.t, new Vector3(0, 1, 0)).normalize()
          const upv = new Vector3().crossVectors(side, node.t).normalize()
          return node.p
            .clone()
            .addScaledVector(side, Math.cos(ang) * 0.11)
            .addScaledVector(upv, Math.sin(ang) * 0.08 - 0.07)
            .addScaledVector(node.t, (hash(i + 3) - 0.5) * 0.12)
        },
        color: cherryColor,
      },
      {
        // Dissolve into the mist band above the drying yard.
        place: (_i, r) => new Vector3(STATIONS.bed.x + (r() - 0.5) * 3, MIST_BAND_Y - r() * 1.2, STATIONS.bed.z + (r() - 0.5) * 2.2),
        color: (i) => cherryColor(i),
      },
    ]
  }, [nodes])

  useFrame(() => {
    const on = sceneState.pos > 0.35 && sceneState.pos < 2.35
    if (group.current) group.current.visible = on
    if (light.current) light.current.intensity = on && detail === 'high' ? 6 : 0
  }, -1)

  return (
    <>
    <group ref={group}>
      <mesh geometry={tube} material={m.bark} castShadow receiveShadow />
      <instancedMesh ref={leafRef} args={[leafGeo, m.leaf, nodes.length * 2]} castShadow receiveShadow />
      <BeanFlow
        count={42}
        geometry={cherryGeo}
        material={m.cherry}
        scale={0.085}
        scaleJitter={0.2}
        seed={31}
        waypoints={cherryWaypoints}
        legs={[{ progress: () => sceneState.cherryFall, stagger: 0.55, arc: 0.4, ease: 'fall' }]}
        vanish
        active={() => sceneState.pos > 0.35 && sceneState.pos < 2.45}
      />
    </group>
    {/* Lights live outside toggled groups so the scene's light count never changes. */}
    <pointLight ref={light} position={[BRANCH.x - 2, BRANCH.y + 2, BRANCH.z + 3]} intensity={0} distance={10} color="#fff1d6" />
    </>
  )
}
