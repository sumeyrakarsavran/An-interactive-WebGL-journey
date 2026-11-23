'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { windAt } from '@/materials/sharedUniforms'
import { createPetalMaterial } from '@/materials/petal'
import { petalGeometry, type PetalSpec } from '@/materials/petalShape'
import { cameraState } from '@/camera/cameraState'
import { useNarrative } from '@/store/narrative'
import { CHAPTERS } from '@/content/chapters'
import { mulberry32 } from '@/utils/device'
import { HERO_BASE } from '../awakening/terrain'
import { HEAD_LOCAL, HEAD_TILT, STEM_POINTS } from '../awakening/heroLayout'

const LINES = CHAPTERS.find((c) => c.id === 'return')!.discoveries!

/**
 * Where the first flower stood, another one. Time has passed: this is a bud that opens with the
 * light as the chapter begins — a beginning, not a completion.
 */
const r = mulberry32(61)
const SPECS: PetalSpec[] = Array.from({ length: 10 }, (_, i) => ({
  yaw: (i / 10) * Math.PI * 2 + (r() - 0.5) * 0.15,
  elev: 0.3,
  length: 0.05 + r() * 0.01,
  width: 0.022 + r() * 0.005,
  cup: 0.7,
  curl: 0.18,
  phase: r() * 10,
  flex: 1,
}))
const CLOSED = 1.35
const OPEN = SPECS.map(() => 0.28 + r() * 0.18)

export function NewFlower() {
  const { gl } = useThree()
  const base = useRef<THREE.Group>(null)
  const discover = useNarrative((s) => s.discover)

  const built = useMemo(() => {
    // paler, golden — not the same flower
    const mat = createPetalMaterial({ base: '#8a6a3a', mid: '#e3c98f', tip: '#f6efe0', length: 0.055, width: 0.025 })
    const head = new THREE.Group()
    head.position.copy(HEAD_LOCAL)
    head.rotation.x = HEAD_TILT * 0.7
    const pivots = SPECS.map((spec) => {
      const yaw = new THREE.Group()
      yaw.rotation.y = -spec.yaw
      const tilt = new THREE.Group()
      tilt.rotation.z = CLOSED
      tilt.add(new THREE.Mesh(petalGeometry(spec), mat))
      yaw.add(tilt)
      head.add(yaw)
      return tilt
    })
    const disc = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshStandardMaterial({ color: '#6a5a24', roughness: 0.8 }))
    disc.scale.set(0.007, 0.0045, 0.007)
    head.add(disc)
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(STEM_POINTS), 40, 0.003, 8, false),
      new THREE.MeshStandardMaterial({ color: '#56603a', roughness: 0.7 }),
    )
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ visible: false }))
    hit.position.copy(HEAD_LOCAL)
    return { mat, head, pivots, stem, hit }
  }, [])

  useEffect(() => () => {
    built.head.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    built.stem.geometry.dispose()
    built.mat.dispose()
  }, [built])

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20)
    // the bud opens over the first quarter of the chapter
    const open = THREE.MathUtils.smootherstep(cameraState.t, 0.03, 0.3)
    built.pivots.forEach((p, i) => {
      // petals do not open in unison
      const k = THREE.MathUtils.clamp(open * 1.15 - (i % 3) * 0.06, 0, 1)
      p.rotation.z = THREE.MathUtils.lerp(CLOSED, OPEN[i], k)
    })
    built.mat.uniforms.uShiver.value = THREE.MathUtils.damp(built.mat.uniforms.uShiver.value, 0, 2.2, d)
    const w = windAt(HERO_BASE.x, HERO_BASE.z, state.clock.elapsedTime)
    if (base.current) {
      base.current.rotation.z = THREE.MathUtils.damp(base.current.rotation.z, -w.x * 0.14, 4, d)
      base.current.rotation.x = THREE.MathUtils.damp(base.current.rotation.x, w.z * 0.14, 4, d)
    }
  })

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    built.mat.uniforms.uShiver.value = 1
    discover('return.flower', LINES['return.flower'])
  }

  return (
    <group ref={base} position={HERO_BASE}>
      <primitive object={built.stem} />
      <primitive object={built.head} />
      <primitive
        object={built.hit}
        onPointerDown={onTap}
        onPointerOver={() => (gl.domElement.style.cursor = 'pointer')}
        onPointerOut={() => (gl.domElement.style.cursor = '')}
      />
    </group>
  )
}
