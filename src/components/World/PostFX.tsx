import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { sceneState } from '../../animation/journey'
import { cameraFocus } from './CameraRig'
import { sub } from './math'

/** Small stack: soft bloom on brass, shallow focus, filmic tone map. */
export default function PostFX({ dof }: { dof: boolean }) {
  const dofRef = useRef<DepthOfFieldEffect>(null)
  // n8ao ships no types: only the live configuration is touched here.
  const aoRef = useRef<{ configuration: { aoRadius: number; distanceFalloff: number } }>(null)

  useFrame(() => {
    // Contact shading at the scale of each stage: bushes and trees at the estate,
    // beans, rims and the foot of each vessel on the tabletop.
    const ao = aoRef.current
    if (ao) {
      const macro = sub(sceneState.pos, 1.2, 2.4)
      ao.configuration.aoRadius = 5 * (1 - macro) + 0.22 * macro
      ao.configuration.distanceFalloff = 1
    }
    const e = dofRef.current
    if (!e) return
    // The estate is landscape-scale; the tabletop stages are macro.
    const macro = sub(sceneState.pos, 1.2, 2.4)
    e.cocMaterial.focusRange = 40 * (1 - macro) + 1.8 * macro
    // No lens blur on the estate: every row of leaves stays crisp. Shallow focus only up close.
    e.bokehScale = macro * 2.4
  })

  if (dof) {
    return (
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <N8AO ref={aoRef as never} halfRes quality="performance" aoRadius={5} distanceFalloff={1} intensity={2.4} color="#0b0603" />
        <DepthOfField ref={dofRef} target={cameraFocus} worldFocusRange={40} bokehScale={0} resolutionScale={0.5} />
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO ref={aoRef as never} halfRes quality="performance" aoRadius={5} distanceFalloff={1} intensity={2.4} color="#0b0603" />
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
