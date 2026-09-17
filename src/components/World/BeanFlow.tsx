import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Euler, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from 'three'
import { clamp01, easeIn, easeInOut, rng } from './math'

/**
 * A group of instanced objects (beans, cherries) that travel through a chain of waypoints.
 * Leg k moves every item from waypoint k to k+1, driven by `legs[k].progress()` (0..1),
 * with per-item stagger, an arc, tumbling, colour change and optional spin while resting.
 * Everything is a pure function of scroll, so scrubbing backwards simply rewinds.
 */

export interface Waypoint {
  /** Position for item i (world space). Called once at build time. */
  place: (i: number, r: () => number) => Vector3
  /** Colour item i has when it rests here. */
  color: (i: number) => Color
  /** Optional rotation (radians) about a vertical axis while resting here. */
  spin?: { center: Vector3; angle: () => number }
  /** Resting orientation: lying flat (beans on a surface) or free. */
  flat?: boolean
}

export interface Leg {
  progress: () => number
  /** Fraction of the leg over which departures are staggered. */
  stagger?: number
  /** Arc height added mid-flight (world units). */
  arc?: number
  /** Ease: 'fall' accelerates like gravity, 'glide' eases in and out. */
  ease?: 'fall' | 'glide'
  /** Point the item is swallowed into at the very end (then hidden). */
  sink?: Vector3
}

interface BeanFlowProps {
  count: number
  geometry: BufferGeometry
  material: Material
  waypoints: Waypoint[]
  legs: Leg[]
  /** Item is invisible until leg 0 starts (spawned) instead of resting at waypoint 0. */
  spawn?: boolean
  /** Item disappears at the end of the final leg. */
  vanish?: boolean
  scale?: number
  scaleJitter?: number
  seed?: number
  /** 0..1 global visibility gate (cheap culling when the stage is far away). */
  active?: () => boolean
  castShadow?: boolean
}

const m4 = new Matrix4()
const q = new Quaternion()
const q2 = new Quaternion()
const e = new Euler()
const p = new Vector3()
const a = new Vector3()
const b = new Vector3()
const c = new Vector3()
const d = new Vector3()
const s = new Vector3()
const col = new Color()
const tmp = new Vector3()
const FLAT = new Quaternion()

function spun(out: Vector3, src: Vector3, wp: Waypoint) {
  out.copy(src)
  if (!wp.spin) return out
  const ang = wp.spin.angle()
  const cx = wp.spin.center.x
  const cz = wp.spin.center.z
  const dx = src.x - cx
  const dz = src.z - cz
  const cs = Math.cos(ang)
  const sn = Math.sin(ang)
  out.x = cx + dx * cs - dz * sn
  out.z = cz + dx * sn + dz * cs
  return out
}

export default function BeanFlow({
  count,
  geometry,
  material,
  waypoints,
  legs,
  spawn = false,
  vanish = false,
  scale = 1,
  scaleJitter = 0.25,
  seed = 1,
  active,
  castShadow = true,
}: BeanFlowProps) {
  const mesh = useRef<InstancedMesh>(null)

  const items = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, (_, i) => ({
      points: waypoints.map((w) => w.place(i, r)),
      delay: legs.map(() => r()),
      rest: new Euler(r() < 0.5 ? Math.PI : 0, r() * Math.PI * 2, (r() - 0.5) * 0.35),
      tumble: new Vector3((r() - 0.5) * 16, (r() - 0.5) * 12, (r() - 0.5) * 16),
      size: scale * (1 - scaleJitter / 2 + r() * scaleJitter),
      side: (r() - 0.5) * 2,
      tone: 0.85 + r() * 0.3,
    }))
    // waypoints/legs are static configuration per mount
  }, [count, seed])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < count; i++) m.setColorAt(i, col.set('#ffffff'))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [count])

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    if (active && !active()) {
      m.visible = false
      return
    }
    const progress = legs.map((l) => l.progress())
    if (spawn && progress[0] <= 0) {
      m.visible = false
      return
    }
    const last = legs.length - 1
    if (vanish && progress[last] >= 1) {
      m.visible = false
      return
    }
    m.visible = true
    const time = clock.elapsedTime

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      // Which leg is this item on?
      let leg = -1
      let t = 0
      for (let k = 0; k < legs.length; k++) {
        const st = legs[k].stagger ?? 0.6
        const tk = clamp01((progress[k] - it.delay[k] * st) / (1 - st))
        if (tk > 0) {
          leg = k
          t = tk
        } else break
      }

      let size = it.size
      q.setFromEuler(it.rest)

      if (leg < 0) {
        // Resting at waypoint 0 (or not yet spawned).
        if (spawn) size = 0
        spun(p, it.points[0], waypoints[0])
        col.copy(waypoints[0].color(i))
      } else if (t >= 1) {
        const wp = waypoints[leg + 1]
        spun(p, it.points[leg + 1], wp)
        col.copy(wp.color(i))
        if (leg === last && vanish) size = 0
        if (!wp.flat) q.multiply(q2.setFromEuler(e.set(it.tumble.x, it.tumble.y, it.tumble.z)))
      } else {
        const L = legs[leg]
        const from = waypoints[leg]
        const to = waypoints[leg + 1]
        const tt = L.ease === 'fall' ? easeIn(t) * 0.65 + t * 0.35 : easeInOut(t)
        spun(a, it.points[leg], from)
        spun(d, it.points[leg + 1], to)
        const arc = L.arc ?? 0.3
        b.copy(a).lerp(d, 0.33)
        b.y = Math.max(a.y, d.y) + arc
        b.x += it.side * arc * 0.3
        c.copy(a).lerp(d, 0.66)
        c.y = Math.max(a.y * 0.3 + d.y * 0.7, d.y) + arc * 0.6
        // Cubic Bézier.
        const u = 1 - tt
        p.copy(a)
          .multiplyScalar(u * u * u)
          .addScaledVector(b, 3 * u * u * tt)
          .addScaledVector(c, 3 * u * tt * tt)
          .addScaledVector(d, tt * tt * tt)
        if (leg === last && t > 0.84) {
          const k = easeIn((t - 0.84) / 0.16)
          if (L.sink) p.lerp(L.sink, k)
          if (vanish) size *= 1 - k
        }
        if (spawn && leg === 0) size *= Math.min(1, t / 0.06)
        col.copy(from.color(i)).lerp(to.color(i), tt)
        // Tumble in flight, settle flat on landing.
        const spinK = Math.sin(Math.PI * tt)
        q.multiply(q2.setFromEuler(e.set(it.tumble.x * tt, it.tumble.y * tt, it.tumble.z * tt)))
        if (to.flat && tt > 0.85) q.slerp(FLAT.setFromEuler(it.rest), (tt - 0.85) / 0.15)
        p.y += Math.sin(time * 3 + i) * 0.004 * spinK
      }

      col.multiplyScalar(it.tone)
      s.setScalar(size)
      tmp.copy(p)
      m4.compose(tmp, q, s)
      m.setMatrixAt(i, m4)
      m.setColorAt(i, col)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, -1)

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false}
    />
  )
}
