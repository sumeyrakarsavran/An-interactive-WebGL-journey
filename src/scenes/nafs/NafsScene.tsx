'use client'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere } from '@/materials/sharedUniforms'
import { cameraState } from '@/camera/cameraState'
import { useExperience } from '@/store/experience'
import { TIERS } from '@/utils/device'
import { WindDriver } from '@/interactions/WindDriver'
import { Sky } from '../awakening/Landscape'
import { Pollen } from '../awakening/Pollen'
import { BackGlow, Floor, LightShaft, Mist, Slab } from './Hall'
import { Mirror } from './Mirror'
import { Silhouette } from './Silhouette'
import { MIRROR } from './layout'
import type { SceneProps } from '../registry'

/** the void (V) → toward the threshold, the faint warmth of an afternoon desert (S) */
const V = {
  zenith: new THREE.Color('#08090b'),
  fog: new THREE.Color('#3a4045'),
  sun: new THREE.Color('#8f989d'),
  ambient: new THREE.Color('#3a3f43'),
}
const S = {
  zenith: new THREE.Color('#1a1510'),
  fog: new THREE.Color('#5c4a34'),
  sun: new THREE.Color('#c79a62'),
  ambient: new THREE.Color('#3c342a'),
}

function Atmosphere({ active }: { active: boolean }) {
  const spot = useRef<THREE.SpotLight>(null)
  const still = useRef(0)

  useEffect(() => {
    const s = spot.current
    if (!s) return
    // light the lower glass and spill onto the floor in front of it
    s.target.position.set(MIRROR.center.x, 1.1, 0.7)
    s.target.updateMatrixWorld()
  }, [])

  useFrame((_, dt) => {
    if (!active) return
    const t = cameraState.t
    still.current = THREE.MathUtils.damp(still.current, useExperience.getState().still ? 1 : 0, 0.5, Math.min(dt, 0.05))
    const k = THREE.MathUtils.smoothstep(t, 0.88, 1)
    const u = atmosphere
    u.uZenith.value.lerpColors(V.zenith, S.zenith, k)
    u.uFogColor.value.lerpColors(V.fog, S.fog, k)
    u.uSunColor.value.lerpColors(V.sun, S.sun, k)
    u.uAmbient.value.lerpColors(V.ambient, S.ambient, k)
    u.uFogDensity.value = 0.03
    // the light is far above and behind the mirror
    u.uSunDir.value.set(0, 0.55, -1).normalize()
    u.uSunUp.value = 0.25
    // standing still, the light on the glass grows a little
    if (spot.current) spot.current.intensity = 260 + still.current * 120
  })

  return (
    <>
      <spotLight ref={spot} position={[0, 8, 4.5]} angle={0.5} penumbra={0.9} intensity={260} distance={40} decay={1.6} color="#dfe4e6" />
      <hemisphereLight args={['#4a5157', '#111111', 1.2]} />
    </>
  )
}

export default function NafsScene({ active }: SceneProps) {
  const quality = useExperience((s) => s.quality)
  const tier = TIERS[quality]
  return (
    <group visible={active}>
      <Atmosphere active={active} />
      {active && <WindDriver groundAt={() => 0} />}
      <Sky />
      <Floor reflective={quality !== 'low'} />
      <Mist />
      <LightShaft />
      <BackGlow />
      <Slab />
      <Mirror quality={quality} active={active} />
      <Silhouette />
      <Pollen count={Math.round(tier.pollen * 0.35)} box={[10, 5, 12]} ahead={4} size={10} />
    </group>
  )
}
