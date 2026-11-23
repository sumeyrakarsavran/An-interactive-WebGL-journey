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
import { buildField } from './field'
import { Grass } from './Grass'
import { Flowers } from './Flowers'
import { HeroFlower } from './HeroFlower'
import { Pollen } from './Pollen'
import { Ground, Mountains, Sky } from './Landscape'
import { groundHeight } from './terrain'
import type { SceneProps } from '../registry'

/** blue hour (A) → first light (B) */
const A = {
  zenith: new THREE.Color('#18222d'),
  fog: new THREE.Color('#66737b'),
  sun: new THREE.Color('#a8735e'),
  ambient: new THREE.Color('#333d47'),
  sunY: -0.035,
  density: 0.026,
}
const B = {
  zenith: new THREE.Color('#566c7e'),
  fog: new THREE.Color('#d6c6a8'),
  sun: new THREE.Color('#ffc98a'),
  ambient: new THREE.Color('#77776a'),
  sunY: 0.075,
  density: 0.012,
}

function AtmosphereDriver({ active }: { active: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const stillAmt = useRef(0)

  useFrame((_, dt) => {
    if (!active) return
    const { still } = useExperience.getState()
    stillAmt.current = THREE.MathUtils.damp(stillAmt.current, still ? 1 : 0, 0.6, Math.min(dt, 0.05))
    // stopping is rewarded: the light comes a little sooner
    // after a full journey, the valley is met again with the fog already thinner
    const returned = useNarrative.getState().returned ? 0.3 : 0
    const dawn = Math.min(1, returned + Math.pow(THREE.MathUtils.smoothstep(cameraState.t, 0.02, 0.95), 1.15) * (1 - returned) + stillAmt.current * 0.12)
    const u = atmosphere
    u.uZenith.value.lerpColors(A.zenith, B.zenith, dawn)
    u.uFogColor.value.lerpColors(A.fog, B.fog, dawn)
    u.uSunColor.value.lerpColors(A.sun, B.sun, dawn)
    u.uAmbient.value.lerpColors(A.ambient, B.ambient, dawn)
    u.uFogDensity.value = THREE.MathUtils.lerp(A.density, B.density, dawn)
    const sy = THREE.MathUtils.lerp(A.sunY, B.sunY, dawn)
    u.uSunDir.value.set(0.16, sy, -1).normalize()
    u.uSunUp.value = THREE.MathUtils.smoothstep(sy, -0.04, 0.08)

    if (sun.current) {
      sun.current.position.copy(u.uSunDir.value).multiplyScalar(10)
      sun.current.color.copy(u.uSunColor.value)
      sun.current.intensity = 0.6 + 2.4 * u.uSunUp.value
    }
    if (hemi.current) {
      hemi.current.color.copy(u.uZenith.value).lerp(u.uFogColor.value, 0.5)
      hemi.current.groundColor.set('#2a241b')
      hemi.current.intensity = 0.6 + 0.8 * dawn
    }
  })

  return (
    <>
      <directionalLight ref={sun} />
      <hemisphereLight ref={hemi} />
    </>
  )
}

export default function AwakeningScene({ active }: SceneProps) {
  const quality = useExperience((s) => s.quality)
  const tier = TIERS[quality]
  const field = useMemo(() => buildField(tier.blades, tier.flowers), [tier.blades, tier.flowers])

  return (
    <group visible={active}>
      <AtmosphereDriver active={active} />
      {active && <WindDriver groundAt={groundHeight} />}
      <Sky />
      <Mountains />
      <Ground />
      <Grass field={field} />
      <Flowers field={field} />
      <HeroFlower />
      <Pollen count={tier.pollen} />
    </group>
  )
}
