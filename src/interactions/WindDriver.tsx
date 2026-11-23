'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { wind, windAt } from '@/materials/sharedUniforms'
import { useExperience } from '@/store/experience'
import { AmbientEngine } from '@/audio/AmbientEngine'

const ray = new THREE.Raycaster()
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()

/**
 * Global WindField driver: time, gusting direction, pointer impulse, stillness calm.
 * Chapter-agnostic — every wind-reactive material reads the uniforms this writes.
 */
export function WindDriver({ groundAt }: { groundAt: (x: number, z: number) => number }) {
  const lastPointer = useRef(new THREE.Vector2())
  const speed = useRef(0)

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20)
    const t = state.clock.elapsedTime
    const { still, reducedMotion } = useExperience.getState()
    wind.uTime.value = t

    // direction wanders slowly
    const ang = -0.98 + Math.sin(t * 0.045) * 0.3
    wind.uWindDir.value.set(Math.cos(ang), Math.sin(ang))

    const target = reducedMotion ? 0.25 : still ? 0.12 : 0.55
    wind.uWindStrength.value = THREE.MathUtils.damp(wind.uWindStrength.value, target, still ? 0.5 : 1.2, d)

    // pointer: project onto the ground under the camera, measure screen speed
    const p = state.pointer
    const v = p.distanceTo(lastPointer.current) / Math.max(d, 1e-3)
    lastPointer.current.copy(p)
    speed.current = THREE.MathUtils.damp(speed.current, v, 6, d)
    ray.setFromCamera(p, state.camera)
    plane.constant = -groundAt(state.camera.position.x, state.camera.position.z)
    if (ray.ray.intersectPlane(plane, hit)) wind.uPointer.value.lerp(hit, 1 - Math.exp(-10 * d))
    const force = reducedMotion ? 0 : Math.min(0.5, speed.current * 0.06)
    wind.uPointerForce.value = THREE.MathUtils.damp(wind.uPointerForce.value, force, 3, d)

    const g = windAt(state.camera.position.x, state.camera.position.z, t).gust
    AmbientEngine.update(wind.uWindStrength.value, g, wind.uPointerForce.value, still)
  })
  return null
}

/** A tap on empty world sends a gust outward from that point. */
export function burstAtPointer() {
  wind.uPointerForce.value = Math.max(wind.uPointerForce.value, 0.6)
}
