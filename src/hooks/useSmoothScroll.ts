'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { useExperience } from '@/store/experience'

/** Shared Lenis instance — interactions call lenis?.stop() while dragging objects. */
export let lenis: Lenis | null = null

export function useSmoothScroll(reducedMotion: boolean) {
  const setGlobal = useExperience((s) => s.setGlobal)
  useEffect(() => {
    const l = new Lenis({ autoRaf: true, lerp: reducedMotion ? 1 : 0.075, smoothWheel: !reducedMotion, syncTouch: false })
    lenis = l
    const update = () => {
      const limit = Math.max(1, l.limit)
      setGlobal(Math.min(1, Math.max(0, l.scroll / limit)))
    }
    l.on('scroll', update)
    update()
    return () => {
      l.destroy()
      lenis = null
    }
  }, [reducedMotion, setGlobal])
}

/** p is a global journey position (0..1) */
export function scrollToProgress(p: number, immediate = false) {
  if (lenis) lenis.scrollTo(p * lenis.limit, immediate ? { immediate: true } : { duration: 2.4 })
  else window.scrollTo({ top: p * (document.documentElement.scrollHeight - window.innerHeight) })
}
