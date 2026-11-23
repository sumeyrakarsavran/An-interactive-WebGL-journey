'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperience } from '@/store/experience'
import { SCENES } from '@/scenes/registry'
import { SEGMENTS, segmentAt } from '@/content/layout'
import { cameraState } from './cameraState'
import type { CameraPath } from './types'

const P = new THREE.Vector3()
const T = new THREE.Vector3()

function remapKnots(t: number, knots: number[]) {
  const n = knots.length - 1
  for (let i = 0; i < n; i++) {
    if (t <= knots[i + 1]) {
      const f = (t - knots[i]) / Math.max(knots[i + 1] - knots[i], 1e-6)
      return (i + f) / n
    }
  }
  return 1
}

function sampleKeys(t: number, keys: Array<[number, number]>) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i]
    const [b, vb] = keys[i + 1]
    if (t <= b) return THREE.MathUtils.lerp(va, vb, THREE.MathUtils.smootherstep(t, a, b))
  }
  return keys[keys.length - 1][1]
}

interface Curves {
  pos: THREE.CatmullRomCurve3
  tgt: THREE.CatmullRomCurve3
  path: CameraPath
}

/**
 * The only code that moves the camera. Chapters provide data; the rig provides motion.
 * It also decides which chapter is "current": the visual state follows the damped camera,
 * never the raw scroll, so scene swaps always happen inside the threshold light.
 */
export function CameraRig() {
  const curves = useMemo(() => {
    const out: Record<string, Curves> = {}
    for (const [id, e] of Object.entries(SCENES)) {
      out[id] = {
        pos: new THREE.CatmullRomCurve3(e.path.position, false, 'centripetal'),
        tgt: new THREE.CatmullRomCurve3(e.path.target, false, 'centripetal'),
        path: e.path,
      }
    }
    return out
  }, [])
  const look = useRef({ x: 0, y: 0 })

  useFrame((state, dt) => {
    const store = useExperience.getState()
    const { global, reducedMotion } = store
    const d = Math.min(dt, 1 / 20)
    // critically damped follow: a trackpad flick reads as inertia, not a jump
    cameraState.global = reducedMotion ? global : THREE.MathUtils.damp(cameraState.global, global, 2.6, d)

    const seg = segmentAt(cameraState.global)
    const id = seg.chapter.id
    const t = Math.min(1, Math.max(0, (cameraState.global - seg.start) / (seg.end - seg.start)))
    cameraState.t = t
    cameraState.chapterId = id
    if (id !== store.chapterId && SCENES[id]) store.setChapter(id)

    // pre-mount the neighbour chapter while approaching a threshold (either direction)
    const i = SEGMENTS.indexOf(seg)
    const next = t > 0.72 ? SEGMENTS[i + 1]?.chapter.id : t < 0.12 ? SEGMENTS[i - 1]?.chapter.id : undefined
    const neighbor = next && SCENES[next] ? next : null
    if (neighbor !== store.neighbor) store.setNeighbor(neighbor)

    const c = curves[id]
    if (!c) return
    const path = c.path
    const u = remapKnots(t, path.knots)
    c.pos.getPoint(u, P)
    c.tgt.getPoint(u, T)
    cameraState.target.copy(T)

    const cam = state.camera as THREE.PerspectiveCamera
    const dist = P.distanceTo(T)

    // handheld breath — proportional to distance so close-ups stay steady
    if (!reducedMotion) {
      const time = state.clock.elapsedTime
      const a = path.handheld * Math.min(1, dist * 0.6)
      P.x += Math.sin(time * 0.37) * a + Math.sin(time * 0.91) * a * 0.3
      P.y += Math.sin(time * 0.29 + 1.3) * a * 0.7
    }
    cam.position.copy(P)
    cam.lookAt(T)

    if (!reducedMotion) {
      const fade = 1 - THREE.MathUtils.smoothstep(t, path.look.fadeFrom, path.look.fadeTo)
      look.current.x = THREE.MathUtils.damp(look.current.x, state.pointer.x, 1.8, d)
      look.current.y = THREE.MathUtils.damp(look.current.y, state.pointer.y, 1.8, d)
      cam.rotateY(-look.current.x * path.look.yaw * fade)
      cam.rotateX(look.current.y * path.look.pitch * fade)
    }

    const fov = sampleKeys(t, path.fov)
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
