'use client'
import { create } from 'zustand'
import { cameraState } from '@/camera/cameraState'
import { scrollToProgress } from './useSmoothScroll'
import { useExperience } from '@/store/experience'

/**
 * Jumping between chapters: fade to the dark of the loader, move instantly, fade back.
 * Smooth-scrolling across several chapters would fly the camera through every world on the
 * way and mount each scene in turn — slow, and meaningless to watch.
 */
export const useCurtain = create<{ down: boolean; set: (d: boolean) => void }>((set) => ({
  down: false,
  set: (down) => set({ down }),
}))

let busy = false

export function jumpTo(global: number) {
  // short hops inside the same stretch of the journey can stay a smooth scroll
  if (Math.abs(global - useExperience.getState().global) < 0.06) {
    scrollToProgress(global)
    return
  }
  if (busy) return
  busy = true
  const curtain = useCurtain.getState()
  curtain.set(true)
  window.setTimeout(() => {
    scrollToProgress(global, true)
    // teleport the camera too, so the damping does not travel through the worlds in between
    cameraState.global = global
    // let the new chapter mount and compile behind the curtain
    window.setTimeout(() => {
      curtain.set(false)
      busy = false
    }, 1100)
  }, 650)
}
