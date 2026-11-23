'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere } from '@/materials/sharedUniforms'
import { cameraState } from '@/camera/cameraState'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { TIERS } from '@/utils/device'
import { WindDriver } from '@/interactions/WindDriver'
import { Ground, Mountains, Sky } from '../awakening/Landscape'
import { Grass } from '../awakening/Grass'
import { Flowers } from '../awakening/Flowers'
import { Pollen } from '../awakening/Pollen'
import { buildField } from '../awakening/field'
import { groundHeight } from '../awakening/terrain'
import { NewFlower } from './NewFlower'
import { Wanderer } from './Wanderer'
import type { SceneProps } from '../registry'

/** first light (D) → full sunrise (S); the fog of Uyanış lifts */
const D = { zenith: '#56718b', fog: '#e6c9a0', sun: '#ffc688', ambient: '#86806c', y: 0.02, density: 0.0055 }
const S = { zenith: '#6f93b3', fog: '#efdcbc', sun: '#ffe1aa', ambient: '#9a978a', y: 0.2, density: 0.0035 }
const c = (h: string) => new THREE.Color(h)
const DC = { zenith: c(D.zenith), fog: c(D.fog), sun: c(D.sun), ambient: c(D.ambient) }
const SC = { zenith: c(S.zenith), fog: c(S.fog), sun: c(S.sun), ambient: c(S.ambient) }

function Sunrise({ active }: { active: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const setReturned = useNarrative((s) => s.setReturned)
  useFrame(() => {
    if (!active) return
    const t = cameraState.t
    const k = THREE.MathUtils.smoothstep(t, 0, 0.95)
    const u = atmosphere
    u.uZenith.value.lerpColors(DC.zenith, SC.zenith, k)
    u.uFogColor.value.lerpColors(DC.fog, SC.fog, k)
    u.uSunColor.value.lerpColors(DC.sun, SC.sun, k)
    u.uAmbient.value.lerpColors(DC.ambient, SC.ambient, k)
    u.uFogDensity.value = THREE.MathUtils.lerp(D.density, S.density, k)
    const y = THREE.MathUtils.lerp(D.y, S.y, k)
    u.uSunDir.value.set(0.16, y, -1).normalize()
    u.uSunUp.value = THREE.MathUtils.smoothstep(y, -0.04, 0.1)
    if (sun.current) {
      sun.current.position.copy(u.uSunDir.value).multiplyScalar(10)
      sun.current.color.copy(u.uSunColor.value)
      sun.current.intensity = 1 + 2.2 * u.uSunUp.value
    }
    if (hemi.current) {
      hemi.current.color.copy(u.uZenith.value).lerp(u.uFogColor.value, 0.5)
      hemi.current.intensity = 1.3
    }
    // having come this far, the next Uyanış begins with the fog already thinner
    if (t > 0.9) setReturned()
  })
  return (
    <>
      <directionalLight ref={sun} />
      <hemisphereLight ref={hemi} args={['#ffffff', '#3a3226', 1]} />
    </>
  )
}

export default function ReturnScene({ active }: SceneProps) {
  const quality = useExperience((s) => s.quality)
  const tier = TIERS[quality]
  const field = useMemo(() => buildField(tier.blades, tier.flowers), [tier.blades, tier.flowers])
  return (
    <group visible={active}>
      <Sunrise active={active} />
      {active && <WindDriver groundAt={groundHeight} />}
      <Sky />
      <Mountains />
      <Ground />
      <Grass field={field} />
      <Flowers field={field} />
      <NewFlower />
      <Wanderer />
      <Pollen count={tier.pollen} />
    </group>
  )
}
