'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { wind, windAt } from '@/materials/sharedUniforms'
import { createPetalMaterial } from '@/materials/petal'
import { getDawnEnv } from '@/materials/dawnEnv'
import { petalGeometry } from '@/materials/petalShape'
import { cameraState } from '@/camera/cameraState'
import { useNarrative } from '@/store/narrative'
import { CHAPTERS } from '@/content/chapters'
import {
  DEW_PETAL,
  DEW_RADIUS,
  HEAD_LOCAL,
  HEAD_TILT,
  PETALS,
  STEM_POINTS,
  dewLocal,
  petalMatrix,
} from './heroLayout'
import { HERO_BASE } from './terrain'

/* ------------------------------- component -------------------------------- */

const RELEASE_ORDER = [5, 3, 6]

interface Released {
  mesh: THREE.Mesh
  vel: THREE.Vector3
  spin: THREE.Vector3
  age: number
}

export function HeroFlower() {
  const { scene, gl } = useThree()
  const base = useRef<THREE.Group>(null)
  const released = useRef<Released[]>([])
  const releasedCount = useRef(0)
  const discover = useNarrative((s) => s.discover)
  const discoveryLine = CHAPTERS[0].discoveries?.['awakening.flower']

  const built = useMemo(() => {
    const petalMat = createPetalMaterial({ base: '#7a4a45', mid: '#c99a96', tip: '#f1e6d8', length: 0.064, width: 0.028 })

    const head = new THREE.Group()
    head.position.copy(HEAD_LOCAL)
    head.rotation.x = HEAD_TILT

    const petals = PETALS.map((spec) => {
      const pivot = new THREE.Group()
      pivot.matrixAutoUpdate = false
      pivot.matrix.copy(petalMatrix(spec))
      const mesh = new THREE.Mesh(petalGeometry(spec), petalMat)
      pivot.add(mesh)
      head.add(pivot)
      return mesh
    })

    // centre: a soft dome with a ring of stamens
    const discMat = new THREE.MeshStandardMaterial({ color: '#4c3a1c', roughness: 0.85 })
    const disc = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), discMat)
    disc.scale.set(0.0085, 0.005, 0.0085)
    disc.position.y = 0.002
    head.add(disc)

    const stamenMat = new THREE.MeshStandardMaterial({ color: '#d1ad5a', roughness: 0.5, emissive: '#3a2a08' })
    const stamenGeo = new THREE.SphereGeometry(0.0011, 8, 6)
    const stamens = new THREE.InstancedMesh(stamenGeo, stamenMat, 46)
    const filamentGeo = new THREE.CylinderGeometry(0.00022, 0.00022, 1, 4)
    filamentGeo.translate(0, 0.5, 0)
    const filaments = new THREE.InstancedMesh(filamentGeo, new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 0.6 }), 46)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < 46; i++) {
      const a = i * 2.39996
      const rr = 0.0065 + (i / 46) * 0.0065
      const h = 0.006 + Math.sin(i * 1.7) * 0.0015 + (1 - i / 46) * 0.002
      const tip = new THREE.Vector3(Math.cos(a) * rr, h, Math.sin(a) * rr)
      const root = new THREE.Vector3(Math.cos(a) * rr * 0.45, 0.002, Math.sin(a) * rr * 0.45)
      m.makeTranslation(tip.x, tip.y, tip.z)
      stamens.setMatrixAt(i, m)
      const dir = tip.clone().sub(root)
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
      m.compose(root, q, new THREE.Vector3(1, dir.length(), 1))
      filaments.setMatrixAt(i, m)
    }
    head.add(filaments, stamens)

    // dewdrop: transmission is expensive, so it only renders on the final approach
    const dewMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.02,
      transmission: 1,
      thickness: 0.006,
      ior: 1.33,
      envMap: getDawnEnv(gl),
      envMapIntensity: 1.4,
      specularIntensity: 1,
    })
    const dew = new THREE.Mesh(new THREE.SphereGeometry(DEW_RADIUS, 48, 32), dewMat)
    dew.scale.set(1, 1.12, 1) // gravity elongates a pendant drop
    dew.position.copy(dewLocal())
    dew.visible = false
    petals[DEW_PETAL].parent!.add(dew)

    // stem
    const stemCurve = new THREE.CatmullRomCurve3(STEM_POINTS)
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(stemCurve, 40, 0.0032, 8, false),
      new THREE.MeshStandardMaterial({ color: '#4d5634', roughness: 0.7 }),
    )

    // generous invisible hit volume so touch on mobile is forgiving
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshBasicMaterial({ visible: false }))
    hit.position.copy(HEAD_LOCAL)

    return { petalMat, head, petals, dew, stem, hit }
  }, [])

  useEffect(
    () => () => {
      built.head.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose()
      })
      built.petalMat.dispose()
      released.current.forEach((r) => r.mesh.removeFromParent())
    },
    [built],
  )

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    built.petalMat.uniforms.uShiver.value = 1
    wind.uPointerForce.value = Math.max(wind.uPointerForce.value, 0.35)
    const k = releasedCount.current
    if (k < RELEASE_ORDER.length) {
      const mesh = built.petals[RELEASE_ORDER[k]]
      scene.attach(mesh) // keeps its world transform
      const d = wind.uWindDir.value
      released.current.push({
        mesh,
        vel: new THREE.Vector3(d.x * 0.08, 0.05, d.y * 0.08),
        spin: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).multiplyScalar(1.6),
        age: 0,
      })
      releasedCount.current++
    }
    discover('awakening.flower', discoveryLine)
  }

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const u = built.petalMat.uniforms
    u.uShiver.value = THREE.MathUtils.damp(u.uShiver.value, 0, 2.2, dt)

    // sway at the root; calms as the camera arrives, so the dewdrop holds still
    const calm = 1 - THREE.MathUtils.smoothstep(cameraState.t, 0.8, 0.93)
    const w = windAt(HERO_BASE.x, HERO_BASE.z, t)
    if (base.current) {
      base.current.rotation.z = THREE.MathUtils.damp(base.current.rotation.z, -w.x * 0.16 * calm, 4, dt)
      base.current.rotation.x = THREE.MathUtils.damp(base.current.rotation.x, w.z * 0.16 * calm, 4, dt)
    }
    built.dew.visible = cameraState.t > 0.62

    // released petals ride the wind, tumbling, then sink into the grass
    const d = wind.uWindDir.value
    for (const r of released.current) {
      if (!r.mesh.visible) continue
      r.age += dt
      const gust = windAt(r.mesh.position.x, r.mesh.position.z, t)
      r.vel.x = THREE.MathUtils.damp(r.vel.x, d.x * (0.15 + gust.gust * 0.5), 1.5, dt)
      r.vel.z = THREE.MathUtils.damp(r.vel.z, d.y * (0.15 + gust.gust * 0.5), 1.5, dt)
      r.vel.y = THREE.MathUtils.damp(r.vel.y, -0.03 + Math.sin(t * 2.3 + r.age) * 0.06, 1.2, dt)
      r.mesh.position.addScaledVector(r.vel, dt)
      r.mesh.rotation.x += r.spin.x * dt
      r.mesh.rotation.y += r.spin.y * dt
      r.mesh.rotation.z += r.spin.z * dt
      if (r.age > 12) r.mesh.visible = false
    }
  })

  // pointer cursor affordance on desktop
  const setCursor = (c: string) => (gl.domElement.style.cursor = c)

  return (
    <group ref={base} position={HERO_BASE}>
      <primitive object={built.stem} />
      <primitive object={built.head} />
      <primitive
        object={built.hit}
        onPointerDown={onTap}
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('')}
      />
    </group>
  )
}
