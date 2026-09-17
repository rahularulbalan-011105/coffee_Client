import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { sceneState } from '../../animation/journey'
import { getLayout } from '../../hooks/useQuality'
import { damp } from './math'

/** Where the camera is looking — shared with lights and depth of field. */
export const cameraFocus = new Vector3()

const pointer = { x: 0, y: 0 }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    },
    { passive: true },
  )
}

const goalPos = new Vector3()
const goalTarget = new Vector3()
const smoothPointer = { x: 0, y: 0 }

export default function CameraRig({ parallax = true }: { parallax?: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const pos = useRef(new Vector3())
  const initialised = useRef(false)
  // Portrait screens: widen the vertical FOV so the subject keeps a sensible share of the width.
  const fovScale = useRef(1)
  const lastOrder = useRef(-1)

  // Compose around the overlay copy: subject sits right on desktop, higher on phones.
  useEffect(() => {
    const { width: w, height: h } = size
    fovScale.current = Math.max(1, Math.pow(1.6 / (w / h), 0.55))
    lastOrder.current = -1
    return () => camera.clearViewOffset()
  }, [camera, size])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    // Compose around the copy; for the order counter lift the cup above the product cards.
    const order = Math.round(sceneState.order * 200) / 200
    if (order !== lastOrder.current) {
      lastOrder.current = order
      const { width: w, height: h } = size
      const layout = getLayout(w)
      const lift = order * order * (3 - 2 * order)
      if (layout === 'desktop') camera.setViewOffset(w, h, -w * 0.12 * (1 - lift), h * 0.26 * lift, w, h)
      else if (layout === 'tablet') camera.setViewOffset(w, h, -w * 0.06 * (1 - lift), h * (0.06 + 0.16 * lift), w, h)
      else camera.setViewOffset(w, h, 0, h * (0.2 + 0.08 * lift), w, h)
      camera.updateProjectionMatrix()
    }
    const c = sceneState.cam
    goalPos.set(c.px, c.py, c.pz)
    goalTarget.set(c.tx, c.ty, c.tz)

    const fov = (2 * Math.atan(Math.tan((c.fov * Math.PI) / 360) * fovScale.current) * 180) / Math.PI
    if (!initialised.current) {
      pos.current.copy(goalPos)
      cameraFocus.copy(goalTarget)
      camera.fov = fov
      camera.updateProjectionMatrix()
      initialised.current = true
    }

    const t = clock.elapsedTime
    const k = damp(5, dt)
    smoothPointer.x += (pointer.x - smoothPointer.x) * damp(2, dt)
    smoothPointer.y += (pointer.y - smoothPointer.y) * damp(2, dt)
    const px = parallax ? smoothPointer.x : 0
    const py = parallax ? smoothPointer.y : 0
    const dist = goalPos.distanceTo(goalTarget)

    // Slow handheld "breathing" plus gentle pointer parallax, scaled to shot distance.
    goalPos.x += (Math.sin(t * 0.21) * 0.012 + px * 0.04) * dist
    goalPos.y += (Math.cos(t * 0.17) * 0.008 - py * 0.025) * dist

    pos.current.lerp(goalPos, k)
    cameraFocus.lerp(goalTarget, k)
    camera.position.copy(pos.current)
    camera.lookAt(cameraFocus)

    // Landscape-scale estate needs a deeper near plane than the macro tabletop.
    const near = sceneState.pos < 2.25 ? 0.4 : 0.05
    if (camera.near !== near) {
      camera.near = near
      camera.updateProjectionMatrix()
    }
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * k
      camera.updateProjectionMatrix()
    }
  }, -2)

  return null
}
