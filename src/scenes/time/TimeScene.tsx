'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { cameraState } from '@/camera/cameraState'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { CHAPTERS } from '@/content/chapters'
import { WindDriver } from '@/interactions/WindDriver'
import { Sky } from '../awakening/Landscape'
import { Desert } from './Desert'
import { DustFronts, Footprints, Glint, SandDrift, sandState } from './SandLife'
import { Gather } from './Gather'
import { dunes } from './dunes'
import type { SceneProps } from '../registry'

const LINES = CHAPTERS.find((c) => c.id === 'time')!.discoveries!

/** 'asr → sunset, keyed by the sun's phase (0 = mid-afternoon, 1 = the sun on the horizon) */
const KEYS = [
  { p: 0, zenith: '#5a7d9a', fog: '#e2c294', sun: '#fff0d2', ambient: '#8c806a', elev: 0.42 },
  { p: 0.65, zenith: '#4a6077', fog: '#dea36f', sun: '#ffc47c', ambient: '#7a6650', elev: 0.16 },
  { p: 1, zenith: '#2a3445', fog: '#b0694a', sun: '#ff8a52', ambient: '#4c3e38', elev: -0.025 },
].map((k) => ({ ...k, zenith: new THREE.Color(k.zenith), fog: new THREE.Color(k.fog), sun: new THREE.Color(k.sun), ambient: new THREE.Color(k.ambient) }))

function sample(phase: number, key: 'zenith' | 'fog' | 'sun' | 'ambient', out: THREE.Color) {
  const i = phase < KEYS[1].p ? 0 : 1
  const a = KEYS[i]
  const b = KEYS[i + 1]
  return out.copy(a[key]).lerp(b[key], THREE.MathUtils.smoothstep(phase, a.p, b.p))
}

/**
 * Time as light. The sun's phase follows the walk — and hurrying spends extra daylight that is
 * never given back: scrolling fast pushes the sun down faster, scrolling back does not raise it.
 */
function Sun({ active, glintFade }: { active: boolean; glintFade: { value: number } }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const st = useRef({ lastT: -1, spent: 0, flow: 0 })
  const discover = useNarrative((s) => s.discover)

  useFrame((state, dt) => {
    if (!active) return
    const d = Math.min(dt, 1 / 20)
    const t = cameraState.t
    const s = st.current
    if (s.lastT >= 0 && d > 0) {
      const speed = Math.abs(t - s.lastT) / d // chapter-progress per second
      // a hurried scroll spends daylight; a jump (chapter index, reduced motion) does not count
      if (speed > 0.05 && speed < 0.6) s.spent = Math.min(0.35, s.spent + (speed - 0.05) * d * 1.4)
      if (s.spent > 0.06) discover('time.hurry', LINES['time.hurry'])
    }
    s.lastT = t
    const phase = Math.min(1, t * 0.97 + s.spent)

    const u = atmosphere
    sample(phase, 'zenith', u.uZenith.value)
    sample(phase, 'fog', u.uFogColor.value)
    sample(phase, 'sun', u.uSunColor.value)
    sample(phase, 'ambient', u.uAmbient.value)
    const elev = phase < 0.65 ? THREE.MathUtils.lerp(0.42, 0.16, phase / 0.65) : THREE.MathUtils.lerp(0.16, -0.025, (phase - 0.65) / 0.35)
    u.uSunDir.value.set(-0.3, elev, -1).normalize()
    u.uSunUp.value = THREE.MathUtils.smoothstep(elev, -0.04, 0.14)
    u.uFogDensity.value = 0.0042 + phase * 0.0025

    // the wind falls with the sun, and at the threshold the sand stops in the air
    const freeze = THREE.MathUtils.smoothstep(t, 0.9, 0.985)
    s.flow += d * (0.8 + wind.uWindStrength.value * 2.2) * (1 - freeze)
    sandState.uFlow.value = s.flow
    glintFade.value = 1 - THREE.MathUtils.smoothstep(phase, 0.86, 0.97)

    if (sun.current) {
      sun.current.position.copy(u.uSunDir.value).multiplyScalar(50).add(state.camera.position)
      sun.current.color.copy(u.uSunColor.value)
      sun.current.intensity = 2.5 * u.uSunUp.value
    }
  })
  return <directionalLight ref={sun} />
}

/** keeps the glint far ahead on a crest — always just out of reach */
function GlintAnchor({ fade }: { fade: { value: number } }) {
  const ref = useRef<THREE.Group>(null)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    if (!ref.current) return
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    const x = camera.position.x + fwd.x * 170 - 12
    const z = camera.position.z + fwd.z * 170
    ref.current.position.set(x, dunes(x, z) + 2.5, z)
  })
  return (
    <group ref={ref}>
      <Glint fade={fade} />
    </group>
  )
}

export default function TimeScene({ active }: SceneProps) {
  const quality = useExperience((s) => s.quality)
  const glintFade = useMemo(() => ({ value: 1 }), [])
  return (
    <group visible={active}>
      <Sun active={active} glintFade={glintFade} />
      <hemisphereLight args={['#8aa2b8', '#7a5a3a', 0.6]} />
      {active && <WindDriver groundAt={dunes} />}
      <Gather active={active} />
      <Sky />
      <Desert shadowSteps={quality === 'low' ? 10 : quality === 'medium' ? 20 : 28} />
      <Footprints />
      <DustFronts />
      <SandDrift count={quality === 'low' ? 2500 : quality === 'medium' ? 7000 : 12000} />
      <GlintAnchor fade={glintFade} />
    </group>
  )
}
