import { Suspense, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { PCFShadowMap, Vector3, type Camera, type Group, type Object3D, type Scene, type SpotLight, type WebGLRenderer } from 'three'
import { sceneState } from '../../animation/journey'
import type { QualitySettings } from '../../hooks/useQuality'
import Atmosphere from './Atmosphere'
import CameraRig, { cameraFocus } from './CameraRig'
import CoffeeBrew from './CoffeeBrew'
import DabaraSet from './DabaraSet'
import DryingBed from './DryingBed'
import { Dust } from './Effects3D'
import Estate from './Estate'
import Filter from './Filter'
import Grinder, { PowderStream } from './Grinder'
import Harvest from './Harvest'
import { KitProvider } from './models'
import PostFX from './PostFX'
import Roaster from './Roaster'

interface CoffeeWorldProps {
  quality: QualitySettings
  /** False once the journey has scrolled away — the render loop stops. */
  active: boolean
  onReady?: () => void
  /** Called if the device cannot keep up even at the lowest settings. */
  onGiveUp?: () => void
}

/**
 * compileAsync does not cover the shadow pass. Render one shadow map with every object
 * visible and the shadow-casting light covering the whole world, so the depth shaders
 * compile now (behind the loader) instead of stalling the first scroll.
 */
function warmShadowShaders(gl: WebGLRenderer, scene: Scene, camera: Camera) {
  const hidden: Object3D[] = []
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o)
      o.visible = true
    }
  })
  const lights: { light: SpotLight; angle: number; distance: number; pos: Vector3; target: Vector3 }[] = []
  scene.traverse((o) => {
    const l = o as SpotLight
    if (!l.isSpotLight || !l.castShadow) return
    lights.push({ light: l, angle: l.angle, distance: l.distance, pos: l.position.clone(), target: l.target.position.clone() })
    l.angle = 1.5
    l.distance = 0
    l.position.set(0, 400, 0)
    l.target.position.set(0, -20, 0)
    l.target.updateMatrixWorld()
  })
  const far = (l: SpotLight) => l.shadow.camera
  lights.forEach(({ light }) => {
    far(light).far = 2000
    far(light).updateProjectionMatrix()
  })
  gl.shadowMap.needsUpdate = true
  gl.render(scene, camera)
  for (const { light, angle, distance, pos, target } of lights) {
    light.angle = angle
    light.distance = distance
    light.position.copy(pos)
    light.target.position.copy(target)
    light.target.updateMatrixWorld()
    far(light).far = 10
    far(light).updateProjectionMatrix()
  }
  hidden.forEach((o) => (o.visible = false))
}

/**
 * Compiles every material up front with KHR_parallel_shader_compile (three's compileAsync),
 * so the page never freezes while shaders build; signals ready once they are linked.
 */
function WarmUp({ onReady, world }: { onReady?: () => void; world: React.RefObject<Group | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const compiled = useRef(false)
  const frames = useRef(0)

  useLayoutEffect(() => {
    let cancelled = false
    const hidden: { visible: boolean }[] = []
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o)
        o.visible = true
      }
    })
    gl.debug.checkShaderErrors = import.meta.env.DEV
    const done = gl.compileAsync(scene, camera)
    hidden.forEach((o) => (o.visible = false))
    // Rendering before linking finishes would block the main thread — hide the drawables
    // (but not the lights: the light count is part of every shader's key) until then.
    const parked: Object3D[] = []
    world.current?.traverse((o) => {
      const r = o as Object3D & { isMesh?: boolean; isPoints?: boolean; isLine?: boolean }
      if ((r.isMesh || r.isPoints || r.isLine) && o.visible) {
        o.visible = false
        parked.push(o)
      }
    })
    done
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        parked.forEach((o) => (o.visible = true))
        warmShadowShaders(gl, scene, camera)
        compiled.current = true
        if (import.meta.env.DEV) {
          const w = window as unknown as { __gl?: unknown; __programsAtWarmUp?: number }
          w.__gl = gl
          w.__programsAtWarmUp = gl.info.programs?.length
        }
      })
    return () => {
      cancelled = true
      parked.forEach((o) => (o.visible = true))
    }
  }, [gl, scene, camera, world])

  // Then render a few real frames (through the post-processing passes) with every object
  // forced visible, so pass-specific shader variants also compile before the page appears.
  const forced = useRef<Object3D[]>([])
  useFrame(() => {
    forced.current.forEach((o) => (o.visible = false))
    forced.current = []
    if (!compiled.current) return
    frames.current++
    if (frames.current <= 3) {
      scene.traverse((o) => {
        if (!o.visible) {
          o.visible = true
          forced.current.push(o)
        }
      })
    }
    if (frames.current === 5) onReady?.()
  })
  return null
}

/**
 * The estate is the most expensive stretch; render it at a slightly lower pixel ratio on
 * high-density screens so two-finger scrolling stays fluid, then restore full sharpness.
 */
function EstateResolution({ max }: { max: number }) {
  const setDpr = useThree((s) => s.setDpr)
  const inEstate = useRef<boolean | null>(null)
  useFrame(() => {
    const now = sceneState.pos < 2.3
    if (now === inEstate.current) return
    inEstate.current = now
    setDpr(Math.min(window.devicePixelRatio, now ? Math.min(max, 1.25) : max))
  })
  return null
}

/**
 * One continuous world, stacked vertically: estate → harvest → drying yard → roaster →
 * grinder → filter → dabara. Every part reads `sceneState` inside useFrame, so React
 * never re-renders while the page scrolls.
 */
export default function CoffeeWorld({ quality, active, onReady, onGiveUp }: CoffeeWorldProps) {
  const [degraded, setDegraded] = useState(false)
  const [dpr, setDpr] = useState<number | [number, number]>(quality.dpr)
  const world = useRef<Group>(null)
  const detail = quality.tier
  const postfx = quality.postfx && !degraded

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      frameloop={active ? 'always' : 'never'}
      flat={postfx}
      dpr={dpr}
      shadows={quality.tier === 'high' ? { type: PCFShadowMap } : false}
      camera={{ fov: 38, near: 0.4, far: 3000, position: [-3, 27, 44] }}
      gl={{ antialias: !postfx, alpha: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        // Per-material clipping (coffee level inside the tipped dabara).
        gl.localClippingEnabled = true
        // Only a lost GPU context sends the page to its static fallback.
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onGiveUp?.()
        })
      }}
      aria-hidden="true"
    >
      {/* Slow frames only ever lower quality — the story keeps its 3D all the way down. */}
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => {
          setDegraded(true)
          setDpr(1)
        }}
        onFallback={() => {
          setDegraded(true)
          setDpr(Math.min(1, window.devicePixelRatio * 0.75))
        }}
      >
        <AdaptiveDpr pixelated={false} />
      </PerformanceMonitor>

      <Suspense fallback={null}>
        <KitProvider detail={detail}>
          <CameraRig parallax={detail === 'high'} />
          <Atmosphere shadowMap={quality.shadowMap} />

          <group ref={world}>
          <Estate detail={detail} />
          <Harvest detail={detail} />
          <DryingBed beans={quality.beans} detail={detail} />
          <Roaster beans={Math.round(quality.beans * 0.8)} detail={detail} />
          <Grinder detail={detail} />
          <PowderStream count={quality.powder} />
          <Filter detail={detail} />
          <CoffeeBrew />
          <DabaraSet detail={detail} />
          <Dust
            count={quality.dust}
            center={() => cameraFocus}
            opacity={() => Math.min(1, Math.max(0, (sceneState.pos - 2.2) * 2))}
          />
          </group>

          {postfx && <PostFX dof={quality.dof} />}
          <WarmUp onReady={onReady} world={world} />
          {!degraded && <EstateResolution max={Array.isArray(quality.dpr) ? quality.dpr[1] : quality.dpr} />}
        </KitProvider>
      </Suspense>
    </Canvas>
  )
}
