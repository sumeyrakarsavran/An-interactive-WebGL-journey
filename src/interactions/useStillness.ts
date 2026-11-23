'use client'
import { useEffect } from 'react'
import { useExperience } from '@/store/experience'

/**
 * "Stopping" is an interaction. After `ms` without pointer, scroll, touch or key input,
 * the world is told the visitor is still.
 */
export function useStillness(ms = 4000) {
  useEffect(() => {
    const { setStill } = useExperience.getState()
    let timer = 0
    const arm = () => {
      if (useExperience.getState().still) setStill(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (useExperience.getState().ready) setStill(true)
      }, ms)
    }
    const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    arm()
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [ms])
}
