'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere } from '@/materials/sharedUniforms'
import { cameraState } from '@/camera/cameraState'
import { useExperience } from '@/store/experience'
import { TIERS } from '@/utils/device'
import { WindDriver } from '@/interactions/WindDriver'
import { Sky } from '../awakening/Landscape'
import { Pollen } from '../awakening/Pollen'
import { MacroFlower } from './MacroFlower'
import { Bokeh } from './Bokeh'
import type { SceneProps } from '../registry'

/** morning (M) → wilting (W) → glass (G) */
const M = {
  zenith: new THREE.Color('#566b7a'),
  fog: new THREE.Color('#c4b9a2'),
  sun: new THREE.Color('#ffdcaa'),
  ambient: new THREE.Color('#8e8c7b'),
  density: 0.013,
}
const W = {
  zenith: new THREE.Color('#67737b'),
  fog: new THREE.Color('#b4ad9e'),
  sun: new THREE.Color('#d9bd96'),
  ambient: new THREE.Color('#726f66'),
  density: 0.016,
}
const G = {
  zenith: new THREE.Color('#56636d'),
  fog: new THREE.Color('#a9b2b7'),
  sun: new THREE.Color('#ece8df'),
  ambient: new THREE.Color('#8a9196'),
  density: 0.014,
}
const tmp = new THREE.Color()

function Atmosphere({ active }: { active: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const still = useRef(0)

  useFrame((_, dt) => {
    if (!active) return
    const t = cameraState.t
    still.current = THREE.MathUtils.damp(still.current, useExperience.getState().still ? 1 : 0, 0.6, Math.min(dt, 0.05))
    const w = THREE.MathUtils.smoothstep(t, 0.72, 0.9)
    const g = THREE.MathUtils.smoothstep(t, 0.9, 0.98)
    const u = atmosphere
    const mix3 = (key: 'zenith' | 'fog' | 'sun' | 'ambient', out: THREE.Color) =>
      out.copy(M[key]).lerp(W[key], w).lerp(tmp.copy(G[key]), g)
    mix3('zenith', u.uZenith.value)
    mix3('fog', u.uFogColor.value)
    mix3('sun', u.uSunColor.value)
    mix3('ambient', u.uAmbient.value)
    u.uFogDensity.value = THREE.MathUtils.lerp(THREE.MathUtils.lerp(M.density, W.density, w), G.density, g)
    // low morning sun behind the flower so every petal is backlit; it climbs a little as the chapter goes on
    const sy = 0.2 + t * 0.16 + still.current * 0.03
    u.uSunDir.value.set(-0.32, sy, -1).normalize()
    u.uSunUp.value = 0.5 - w * 0.2

    if (sun.current) {
      sun.current.position.copy(u.uSunDir.value).multiplyScalar(20)
      sun.current.color.copy(u.uSunColor.value)
      sun.current.intensity = 2.2 - w * 0.8
    }
    if (hemi.current) {
      hemi.current.color.copy(u.uZenith.value).lerp(u.uFogColor.value, 0.6)
      hemi.current.groundColor.set('#4a4232')
      hemi.current.intensity = 1.1
    }
  })

  return (
    <>
      <directionalLight ref={sun} />
      <hemisphereLight ref={hemi} />
      {/* soft fill from the viewer's side so stamens never go black */}
      <pointLight position={[2, 4, 6]} intensity={6} distance={18} color="#ffe9c9" />
    </>
  )
}

export default function CreationScene({ active }: SceneProps) {
  const quality = useExperience((s) => s.quality)
  const tier = TIERS[quality]
  return (
    <group visible={active}>
      <Atmosphere active={active} />
      {active && <WindDriver groundAt={() => 0.4} />}
      <Sky />
      <Bokeh count={quality === 'low' ? 50 : 90} />
      <MacroFlower />
      <Pollen count={Math.round(tier.pollen * 0.6)} box={[9, 6, 10]} ahead={3} size={38} />
    </group>
  )
}
