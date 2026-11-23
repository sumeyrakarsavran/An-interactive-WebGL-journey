'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere } from '@/materials/sharedUniforms'
import { cameraState } from '@/camera/cameraState'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { CHAPTERS } from '@/content/chapters'
import { WindDriver } from '@/interactions/WindDriver'
import { Mountains, Sky } from '../awakening/Landscape'
import { Lake, SIM, addDrop, lakeState } from './Lake'
import { Tree } from './Tree'
import { Rain, rainState } from './Rain'
import type { SceneProps } from '../registry'

const LINES = CHAPTERS.find((c) => c.id === 'stillness')!.discoveries!

/** afterglow (A) → blue hour (B) → night (N) */
const A = { zenith: '#2a3850', fog: '#c58a5e', sun: '#ff9a62', ambient: '#3c3c46', y: -0.025 }
const B = { zenith: '#16223a', fog: '#55606c', sun: '#a8805a', ambient: '#283040', y: -0.07 }
const N = { zenith: '#0a0f1e', fog: '#262d3c', sun: '#56627e', ambient: '#1c2130', y: -0.12 }
const keys = [A, B, N].map((k) => ({
  zenith: new THREE.Color(k.zenith),
  fog: new THREE.Color(k.fog),
  sun: new THREE.Color(k.sun),
  ambient: new THREE.Color(k.ambient),
  y: k.y,
}))
const tmp = new THREE.Color()

/** ~6 breaths a minute — offered by the light itself, never named */
const BREATH_HZ = 0.1

function Night({ active, stars }: { active: boolean; stars: { value: number } }) {
  const st = useRef({ stillFor: 0, calm: 0, deep: false, rainAcc: 0 })
  const discover = useNarrative((s) => s.discover)

  useFrame((state, dt) => {
    if (!active) return
    const d = Math.min(dt, 1 / 20)
    const t = cameraState.t
    const s = st.current
    const { still, reducedMotion } = useExperience.getState()
    s.stillFor = still ? s.stillFor + d : 0
    s.calm = THREE.MathUtils.damp(s.calm, still ? 1 : 0, 0.35, d)

    // the longer the stillness, the deeper the reward — and it is never announced
    if (s.stillFor > 14 && !s.deep) {
      s.deep = true
      discover('stillness.deep', LINES['stillness.deep'])
    }

    const k1 = THREE.MathUtils.smoothstep(t, 0.0, 0.5)
    const k2 = THREE.MathUtils.smoothstep(t, 0.45, 0.92)
    const mix = (key: 'zenith' | 'fog' | 'sun' | 'ambient', out: THREE.Color) =>
      out.copy(keys[0][key]).lerp(keys[1][key], k1).lerp(tmp.copy(keys[2][key]), k2)
    const u = atmosphere
    mix('zenith', u.uZenith.value)
    mix('fog', u.uFogColor.value)
    mix('sun', u.uSunColor.value)
    mix('ambient', u.uAmbient.value)
    const y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(A.y, B.y, k1), N.y, k2)
    u.uSunDir.value.set(-0.25, y, -1).normalize()
    u.uSunUp.value = 0
    u.uFogDensity.value = 0.0024

    // the breathing light: barely there while you move, clearer when you are still
    if (!reducedMotion) {
      const b = Math.sin(state.clock.elapsedTime * Math.PI * 2 * BREATH_HZ)
      const amp = 0.025 + 0.06 * s.calm
      u.uFogColor.value.multiplyScalar(1 + b * amp)
      u.uAmbient.value.multiplyScalar(1 + b * amp)
    }

    stars.value = THREE.MathUtils.smoothstep(t, 0.2, 0.75) * (0.55 + 0.45 * s.calm) + s.calm * 0.15

    // the surface answers stillness: the breeze dies away and ripples settle faster
    lakeState.breeze = THREE.MathUtils.lerp(0.32, 0.015, Math.max(s.calm, THREE.MathUtils.smoothstep(t, 0.86, 0.95)))
    lakeState.damp = THREE.MathUtils.lerp(0.988, 0.965, s.calm)

    // rain thins out and stops; every drop that lands rings the lake
    const rain = 1 - THREE.MathUtils.smoothstep(t, 0.02, 0.16)
    rainState.uRain.value = rain
    s.rainAcc += rain * 26 * d
    const cam = state.camera.position
    while (s.rainAcc >= 1) {
      s.rainAcc -= 1
      const x = cam.x + (Math.random() - 0.5) * 22
      const z = cam.z - 2 - Math.random() * 20
      if (Math.abs(x - SIM.center.x) < SIM.size / 2 && Math.abs(z - SIM.center.y) < SIM.size / 2) addDrop(x, z, 0.12, 0.35)
    }
  })

  return <hemisphereLight args={['#2c3550', '#0a0a0c', 0.6]} />
}

export default function StillnessScene({ active }: SceneProps) {
  const quality = useExperience((s) => s.quality)
  const stars = useMemo(() => ({ value: 0 }), [])
  return (
    <group visible={active}>
      <Night active={active} stars={stars} />
      {active && <WindDriver groundAt={() => 0} />}
      <Sky stars={stars} />
      <Mountains />
      <Tree />
      <Lake quality={quality} active={active} />
      <Rain count={quality === 'low' ? 600 : 1500} />
    </group>
  )
}
