'use client'
import { useEffect, useRef, type ReactElement } from 'react'
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { useExperience } from '@/store/experience'
import { TIERS } from '@/utils/device'
import { cameraState } from '@/camera/cameraState'

/** One merged effect pass. Heavier effects are tier-gated. */
export function PostFX() {
  const quality = useExperience((s) => s.quality)
  const tier = TIERS[quality]
  const dof = useRef<DepthOfFieldEffect>(null)

  useEffect(() => {
    // share the rig's live target vector so focus follows the camera's subject
    if (dof.current) dof.current.target = cameraState.target
  }, [tier.dof])

  const effects: ReactElement[] = []
  if (tier.bloom) effects.push(<Bloom key="bloom" mipmapBlur intensity={0.6} luminanceThreshold={0.82} luminanceSmoothing={0.25} />)
  if (tier.dof) effects.push(<DepthOfField key="dof" ref={dof} focalLength={0.018} bokehScale={2.2} />)
  effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />)
  effects.push(<Vignette key="vig" offset={0.25} darkness={0.72} />)
  effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />)

  return (
    <EffectComposer key={quality} multisampling={tier.msaa} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  )
}
