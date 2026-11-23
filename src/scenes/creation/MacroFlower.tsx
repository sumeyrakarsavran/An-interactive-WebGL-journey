'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { createPetalMaterial } from '@/materials/petal'
import { petalGeometry, petalMatrix } from '@/materials/petalShape'
import { cameraState } from '@/camera/cameraState'
import { useNarrative } from '@/store/narrative'
import { useExperience } from '@/store/experience'
import { CHAPTERS } from '@/content/chapters'
import { lenis } from '@/hooks/useSmoothScroll'
import { mulberry32 } from '@/utils/device'
import { HELD, HEAD_TILT, MACRO_PETALS, OUTER, WILT, WILT_REST } from './layout'

const LINES = CHAPTERS.find((c) => c.id === 'creation')!.discoveries!

/** chapter progress window in which the flower may be turned by hand */
const DRAG_FROM = 0.46
const DRAG_TO = 0.645
const LONG_PRESS_MS = 520
const TAU = Math.PI * 2

// scratch objects for the held-petal blend
const restM = new THREE.Matrix4()
const spinM = new THREE.Matrix4()
const pA = new THREE.Vector3()
const pB = new THREE.Vector3()
const qA = new THREE.Quaternion()
const qB = new THREE.Quaternion()
const sc = new THREE.Vector3()
HELD.decompose(pB, qB, sc)

export function MacroFlower() {
  const { gl } = useThree()
  const spin = useRef<THREE.Group>(null)
  const discover = useNarrative((s) => s.discover)

  const built = useMemo(() => {
    // one set of interaction uniforms for the whole flower
    const shared = { uAnatomy: { value: 0 }, uShiver: { value: 0 } }
    const outerMat = createPetalMaterial({
      base: '#7b3f3b', mid: '#cf9d96', tip: '#f3e9dc', length: 3.1, width: 1.5, veinFreq: 15, grain: 0.07, veinStrength: 0.32, shared,
    })
    const innerMat = createPetalMaterial({
      base: '#6a2f30', mid: '#c48a86', tip: '#f0dccf', length: 2.0, width: 1.1, veinFreq: 12, grain: 0.07, veinStrength: 0.3, shared,
    })
    // the wilting petal owns its uWilt / uGlass
    const wiltMat = createPetalMaterial({
      base: '#7b3f3b', mid: '#cf9d96', tip: '#f3e9dc', length: MACRO_PETALS[WILT].length, width: MACRO_PETALS[WILT].width,
      veinFreq: 15, grain: 0.07, veinStrength: 0.32, shared,
    })

    const head = new THREE.Group()
    head.rotation.x = HEAD_TILT
    // the wilting petal lives in world space so it can leave the flower
    const held = new THREE.Group()
    held.matrixAutoUpdate = false
    held.matrix.copy(WILT_REST)
    MACRO_PETALS.forEach((spec, i) => {
      const mat = i === WILT ? wiltMat : i < OUTER ? outerMat : innerMat
      const mesh = new THREE.Mesh(petalGeometry(spec, 64, 32), mat)
      if (i === WILT) {
        held.add(mesh)
        return
      }
      const pivot = new THREE.Group()
      pivot.matrixAutoUpdate = false
      pivot.matrix.copy(petalMatrix(spec))
      pivot.add(mesh)
      head.add(pivot)
    })

    // receptacle
    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 24),
      new THREE.MeshStandardMaterial({ color: '#7a6a33', roughness: 0.95 }),
    )
    disc.scale.set(0.5, 0.2, 0.5)
    head.add(disc)

    // stamen forest: filaments with pollen-heavy anthers on a phyllotaxis spiral
    const N = 90
    const rand = mulberry32(9)
    const filGeo = new THREE.CylinderGeometry(0.006, 0.011, 1, 6)
    filGeo.translate(0, 0.5, 0)
    const filaments = new THREE.InstancedMesh(filGeo, new THREE.MeshStandardMaterial({ color: '#efe3c4', roughness: 0.55 }), N)
    const antGeo = new THREE.SphereGeometry(1, 14, 10)
    const anthers = new THREE.InstancedMesh(
      antGeo,
      new THREE.MeshStandardMaterial({ color: '#c08a2c', roughness: 0.9, emissive: '#2a1802', emissiveIntensity: 0.4 }),
      N,
    )
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < N; i++) {
      const a = i * 2.39996
      const rr = 0.16 + Math.sqrt(i / N) * 0.48
      const h = 0.75 + (1 - rr / 0.64) * 0.45 + rand() * 0.15
      const root = new THREE.Vector3(Math.cos(a) * rr * 0.6, 0.05, Math.sin(a) * rr * 0.6)
      const tip = new THREE.Vector3(Math.cos(a) * rr * 1.25, h, Math.sin(a) * rr * 1.25)
      const dir = tip.clone().sub(root)
      q.setFromUnitVectors(up, dir.clone().normalize())
      m.compose(root, q, new THREE.Vector3(1, dir.length(), 1))
      filaments.setMatrixAt(i, m)
      q.setFromAxisAngle(up, a)
      m.compose(tip, q, new THREE.Vector3(0.05, 0.024, 0.028))
      anthers.setMatrixAt(i, m)
    }
    // pistil
    const style = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.06, 1.35, 12).translate(0, 0.67, 0),
      new THREE.MeshStandardMaterial({ color: '#b7b48a', roughness: 0.6 }),
    )
    const stigma = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12), new THREE.MeshStandardMaterial({ color: '#c7c28d', roughness: 0.85 }))
    stigma.position.y = 1.38
    stigma.scale.set(1, 0.6, 1)
    head.add(filaments, anthers, style, stigma)

    // stem dropping out of frame
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 14, 16).translate(0, -7.1, 0),
      new THREE.MeshStandardMaterial({ color: '#4b5733', roughness: 0.7 }),
    )

    // forgiving, two-sided hit volume (works from inside the flower too)
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.2, 2.6, 24, 1, false).translate(0, 0.6, 0),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    )

    return { shared, outerMat, innerMat, wiltMat, head, held, stem, hit }
  }, [])

  useEffect(
    () => () => {
      built.head.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      built.held.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      ;[built.outerMat, built.innerMat, built.wiltMat].forEach((m) => m.dispose())
      built.hit.geometry.dispose()
      built.stem.geometry.dispose()
    },
    [built],
  )

  // ------------------------------ gestures ------------------------------
  const g = useRef({
    down: false,
    dragging: false,
    lastX: 0,
    startX: 0,
    startY: 0,
    downAt: 0,
    rot: 0,
    vel: 0,
    turned: 0,
    anatomy: 0,
    timer: 0,
  })

  const canDrag = () => cameraState.t > DRAG_FROM && cameraState.t < DRAG_TO

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const s = g.current
    s.down = true
    s.dragging = false
    s.lastX = s.startX = e.nativeEvent.clientX
    s.startY = e.nativeEvent.clientY
    s.downAt = performance.now()
    window.clearTimeout(s.timer)
    s.timer = window.setTimeout(() => {
      if (s.down && !s.dragging) {
        s.anatomy = 1
        discover('creation.anatomy', LINES['creation.anatomy'])
      }
    }, LONG_PRESS_MS)

    const move = (ev: PointerEvent) => {
      if (!s.down) return
      const dx = ev.clientX - s.lastX
      s.lastX = ev.clientX
      const tx = ev.clientX - s.startX
      const ty = ev.clientY - s.startY
      // horizontal intent → turn the flower; vertical intent is left to page scroll
      if (!s.dragging && Math.abs(tx) > 8 && Math.abs(tx) > Math.abs(ty) && canDrag()) {
        s.dragging = true
        window.clearTimeout(s.timer)
        lenis?.stop()
        gl.domElement.style.cursor = 'grabbing'
      }
      if (s.dragging) {
        const k = 4.2 / Math.max(window.innerWidth, 1)
        s.rot += dx * k
        s.vel = dx * k * 60
        s.turned += Math.abs(dx * k)
        if (s.turned > 1.1) discover('creation.symmetry', LINES['creation.symmetry'])
      } else if (Math.hypot(tx, ty) > 12) {
        window.clearTimeout(s.timer) // a scroll, not a press
      }
    }
    const up = () => {
      if (!s.dragging && !s.anatomy && performance.now() - s.downAt < 300) built.shared.uShiver.value = 1
      s.down = false
      s.dragging = false
      s.anatomy = 0
      window.clearTimeout(s.timer)
      lenis?.start()
      gl.domElement.style.cursor = canDrag() ? 'grab' : ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 20)
    const s = g.current
    const t = cameraState.t
    const reduced = useExperience.getState().reducedMotion

    if (!s.dragging) {
      if (canDrag()) {
        // inertia after release
        s.rot += s.vel * d
        s.vel = THREE.MathUtils.damp(s.vel, 0, 1.6, d)
      } else {
        // outside the window the flower settles back to its rest pose (camera path relies on it)
        s.vel = 0
        const home = Math.round(s.rot / TAU) * TAU
        s.rot = THREE.MathUtils.damp(s.rot, home, 1.8, d)
      }
    }
    if (spin.current) spin.current.rotation.y = s.rot

    built.shared.uAnatomy.value = THREE.MathUtils.damp(built.shared.uAnatomy.value, s.anatomy, s.anatomy ? 3 : 2, d)
    built.shared.uShiver.value = THREE.MathUtils.damp(built.shared.uShiver.value, 0, 2.2, d)

    // the petal leaves the flower and is held before the viewer
    const lift = THREE.MathUtils.smootherstep(t, 0.645, 0.8)
    spinM.makeRotationY(s.rot)
    restM.multiplyMatrices(spinM, WILT_REST).decompose(pA, qA, sc)
    pA.lerp(pB, lift)
    // a slight arc upward so it rises rather than slides
    pA.y += Math.sin(lift * Math.PI) * 0.8
    qA.slerp(qB, lift)
    built.held.matrix.compose(pA, qA, sc.set(1, 1, 1))
    built.held.matrixWorldNeedsUpdate = true

    // At-Tîn's turn: the finest form, then the fall — scroll-driven, never reversed by idling
    const wilt = THREE.MathUtils.smoothstep(t, 0.74, 0.9)
    const glass = THREE.MathUtils.smoothstep(t, 0.89, 0.975)
    built.wiltMat.uniforms.uWilt.value = reduced ? Math.round(wilt * 4) / 4 : wilt
    built.wiltMat.uniforms.uGlass.value = glass
  })

  return (
    <group>
      <primitive object={built.stem} />
      <group ref={spin}>
        <primitive object={built.head} />
      </group>
      <primitive object={built.held} />
      <primitive
        object={built.hit}
        onPointerDown={onDown}
        onPointerOver={() => (gl.domElement.style.cursor = canDrag() ? 'grab' : 'pointer')}
        onPointerOut={() => (gl.domElement.style.cursor = '')}
      />
    </group>
  )
}

