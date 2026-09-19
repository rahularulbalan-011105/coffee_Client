import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { sceneState } from '../../animation/journey'
import { cameraFocus } from './CameraRig'
import { sub } from './math'

/** Small stack: soft bloom on brass, shallow focus, filmic tone map. */
export default function PostFX({ dof }: { dof: boolean }) {
  const dofRef = useRef<DepthOfFieldEffect>(null)

  useFrame(() => {
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
        <DepthOfField ref={dofRef} target={cameraFocus} worldFocusRange={40} bokehScale={0} resolutionScale={0.5} />
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
