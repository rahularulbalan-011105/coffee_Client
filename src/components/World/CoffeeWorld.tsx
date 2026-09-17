import { Suspense, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { PCFShadowMap, type Group } from 'three'
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
    // Rendering before linking finishes would block the main thread — wait.
    if (world.current) world.current.visible = false
    done
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        compiled.current = true
        if (import.meta.env.DEV) {
          const w = window as unknown as { __gl?: unknown; __programsAtWarmUp?: number }
          w.__gl = gl
          w.__programsAtWarmUp = gl.info.programs?.length
        }
        if (world.current) world.current.visible = true
      })
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera, world])

  useFrame(() => {
    if (!compiled.current) return
    frames.current++
    if (frames.current === 2) onReady?.()
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
        </KitProvider>
      </Suspense>
    </Canvas>
  )
}
