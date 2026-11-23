'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraState } from '@/camera/cameraState'
import { useNarrative } from '@/store/narrative'
import { CHAPTERS } from '@/content/chapters'
import { lenis } from '@/hooks/useSmoothScroll'
import { windAt } from '@/materials/sharedUniforms'
import { PILES, pickGround, piles } from './dunes'
import { sandState } from './SandLife'

const LINES = CHAPTERS.find((c) => c.id === 'time')!.discoveries!
export const GATHER_FROM = 0.42
export const GATHER_TO = 0.74
const MAX_H = 0.95

/**
 * Tekâsür as a gesture: dragging across the sand heaps it up under the hand;
 * the moment you let go, the wind starts taking it back.
 * Mouse: any drag. Touch: sideways drags gather, vertical swipes still scroll.
 */
export function Gather({ active }: { active: boolean }) {
  const { gl, camera } = useThree()
  const discover = useNarrative((s) => s.discover)
  const st = useRef({
    down: false,
    gathering: false,
    x: 0,
    y: 0,
    sx: 0,
    sy: 0,
    moved: 0,
    touch: false,
    pile: -1,
    peak: 0,
  })
  const ray = useRef(new THREE.Raycaster())
  const hit = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!active) return
    const el = gl.domElement
    const inWindow = () => cameraState.chapterId === 'time' && cameraState.t > GATHER_FROM && cameraState.t < GATHER_TO
    const down = (e: PointerEvent) => {
      if (!inWindow()) return
      const s = st.current
      s.down = true
      s.gathering = e.pointerType !== 'touch' // touch decides once the direction is clear
      s.touch = e.pointerType === 'touch'
      s.x = s.sx = e.clientX
      s.y = s.sy = e.clientY
      s.pile = -1
      if (s.gathering) lenis?.stop()
    }
    const move = (e: PointerEvent) => {
      const s = st.current
      if (!s.down) return
      if (s.touch && !s.gathering) {
        const dx = Math.abs(e.clientX - s.sx)
        const dy = Math.abs(e.clientY - s.sy)
        if (dx > 10 && dx > dy * 1.2) s.gathering = true
        else if (dy > 10) s.down = false // a scroll
      }
      if (s.gathering) s.moved += Math.hypot(e.clientX - s.x, e.clientY - s.y)
      s.x = e.clientX
      s.y = e.clientY
    }
    const up = () => {
      const s = st.current
      s.down = false
      s.gathering = false
      s.pile = -1
      lenis?.start()
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      lenis?.start()
    }
  }, [active, gl])

  useFrame((state, dt) => {
    if (!active) return
    const d = Math.min(dt, 1 / 20)
    const s = st.current
    const list = piles.uPiles.value

    if (s.gathering && s.moved > 0) {
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((s.x - rect.left) / rect.width) * 2 - 1, -((s.y - rect.top) / rect.height) * 2 + 1)
      ray.current.setFromCamera(ndc, camera)
      if (pickGround(ray.current.ray, hit.current, 25)) {
        // grow the pile under the hand, or start a new one (reusing the smallest)
        if (s.pile < 0 || Math.hypot(list[s.pile].x - hit.current.x, list[s.pile].y - hit.current.z) > 1.4) {
          let best = 0
          for (let i = 1; i < PILES; i++) if (list[i].z < list[best].z) best = i
          s.pile = best
          list[best].set(hit.current.x, hit.current.z, 0.02, 0.45)
        }
        const k = list[s.pile]
        // sand flows toward the hand: the pile creeps after it
        k.x += (hit.current.x - k.x) * 0.05
        k.y += (hit.current.z - k.y) * 0.05
        k.z = Math.min(MAX_H, k.z + s.moved * 0.0009)
        k.w = 0.45 + k.z * 0.9
        s.peak = Math.max(s.peak, k.z)
        if (k.z > 0.45) discover('time.gather', LINES['time.gather'])
      }
      s.moved = 0
    }

    // the wind takes everything not held
    let eroding = 0
    const gust = windAt(camera.position.x, camera.position.z, state.clock.elapsedTime).gust
    for (let i = 0; i < PILES; i++) {
      const k = list[i]
      if (k.z <= 0.001) continue
      if (s.gathering && i === s.pile) continue
      const loss = (0.035 + gust * 0.09) * d * (0.6 + k.z)
      k.z = Math.max(0, k.z - loss)
      k.x -= 0.02 * d // and the heap slowly walks downwind
      eroding += loss / d
      if (k.z <= 0.001 && s.peak > 0.45) {
        discover('time.lost', LINES['time.lost'])
        s.peak = 0
      }
    }
    sandState.uErode.value = THREE.MathUtils.damp(sandState.uErode.value, Math.min(1, eroding * 4), 3, d)
  })

  return null
}
