'use client'
import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { TOTAL_VH } from '@/content/layout'
import { TIERS, detectTier, hasWebGL } from '@/utils/device'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useStillness } from '@/interactions/useStillness'
import { burstAtPointer } from '@/interactions/WindDriver'
import { AmbientEngine } from '@/audio/AmbientEngine'
import { SceneManager } from './SceneManager'
import { Boundary, FaultNotice } from './Resilience'
import { PostFX } from './PostFX'
import { NarrativeOverlay, ThresholdVeil } from '../typography/NarrativeOverlay'
import { ChapterIndex } from '../navigation/ChapterIndex'
import { Loader, ScrollHint, SoundToggle, SourcesButton, SourcesPanel, TextModeToggle } from '../ui/Controls'
import { WordForTomorrow } from '../ui/WordForTomorrow'
import { jumpTo, useCurtain } from '@/hooks/jump'
import { CHAPTERS, THRESHOLD_IN } from '@/content/chapters'
import { globalOf } from '@/content/layout'

const isQA = () => process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('qa')

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = useNarrative.getState()
      const x = useExperience.getState()
      if (e.key === 'Escape') n.setSourcesOpen(false)
      if (e.key.toLowerCase() === 'k') n.setSourcesOpen(!n.sourcesOpen)
      // 1–6: jump to a chapter (just past its threshold light)
      const key = Number(e.key)
      if (key >= 1 && key <= CHAPTERS.length && CHAPTERS[key - 1].available) {
        const c = CHAPTERS[key - 1]
        jumpTo(key === 1 ? 0 : globalOf(c.id, THRESHOLD_IN + 0.01))
      }
      if (e.key.toLowerCase() === 's') {
        x.setSound(!x.soundOn)
        void AmbientEngine.setOn(!x.soundOn)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Curtain() {
  const down = useCurtain((s) => s.down)
  return <div className={`curtain ${down ? 'is-down' : ''}`} aria-hidden="true" />
}

export default function Experience() {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const reduced = useReducedMotion()
  const quality = useExperience((s) => s.quality)
  const tier = TIERS[quality]

  useEffect(() => {
    const ok = hasWebGL()
    document.documentElement.dataset.webgl = ok ? 'on' : 'off'
    setWebgl(ok)
    const q = new URLSearchParams(window.location.search).get('q')
    useExperience.getState().setQuality(q === 'low' || q === 'medium' || q === 'high' ? q : detectTier())
  }, [])
  useEffect(() => useExperience.getState().setReducedMotion(reduced), [reduced])
  useEffect(() => {
    // handles for automated QA: always in development, in production only with ?qa=1
    if (isQA()) (window as unknown as Record<string, unknown>).__sirrStore = useExperience
  }, [])

  const textMode = useExperience((s) => s.textMode)
  const chapterId = useExperience((s) => s.chapterId)
  useEffect(() => AmbientEngine.setProfile(chapterId), [chapterId])
  useEffect(() => {
    document.documentElement.dataset.text = textMode ? 'on' : 'off'
    if (textMode) window.scrollTo(0, 0)
  }, [textMode])

  useSmoothScroll(reduced)
  useStillness(4200)
  useKeyboard()

  if (webgl === false) return null // the server-rendered text journey takes over

  return (
    <>
      <div className="scroll-track" style={{ height: `${TOTAL_VH}vh` }} aria-hidden="true" />
      <div className="stage" aria-hidden="true">
        {webgl && (
          <Boundary fault="crash">
          <Canvas
            flat
            frameloop={textMode ? 'never' : 'always'}
            dpr={tier.dpr}
            gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
            camera={{ fov: 40, near: 0.004, far: 2000, position: [0, 3, 34] }}
            onCreated={({ gl }) => {
              if (isQA()) (window as unknown as Record<string, unknown>).__gl = gl
              // the GPU can drop the context (driver reset, too many tabs); three.js restores it
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault()
                useExperience.getState().setFault('context')
              })
              gl.domElement.addEventListener('webglcontextrestored', () => {
                if (useExperience.getState().fault === 'context') useExperience.getState().setFault(null)
              })
              window.setTimeout(() => useExperience.getState().setReady(), 400)
            }}
            onPointerMissed={burstAtPointer}
          >
            <color attach="background" args={['#15130f']} />
            <PerformanceMonitor onDecline={() => useExperience.getState().downgrade()} flipflops={2} />
            <Boundary fault="chunk">
              <SceneManager />
            </Boundary>
            {/* effects are optional: if they fail, the world renders without them */}
            <Boundary fault={null}>
              <PostFX />
            </Boundary>
          </Canvas>
          </Boundary>
        )}
      </div>
      <Loader />
      <FaultNotice />
      <NarrativeOverlay />
      <ThresholdVeil />
      <Curtain />
      <WordForTomorrow />
      <ChapterIndex />
      <div className="controls">
        <TextModeToggle />
        <SoundToggle />
        <SourcesButton />
      </div>
      <SourcesPanel />
      <ScrollHint />
    </>
  )
}
