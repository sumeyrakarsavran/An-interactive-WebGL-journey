'use client'
import { useEffect, useRef, useState } from 'react'
import { CHAPTERS, THRESHOLD_IN, THRESHOLD_OUT, type ChapterConfig, type ThresholdTone } from '@/content/chapters'
import { SEGMENTS, localOf } from '@/content/layout'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { jumpTo } from '@/hooks/jump'
import { cameraState } from '@/camera/cameraState'
import { WordEcho } from '../ui/WordForTomorrow'

function activeBeat(chapterId: string, global: number) {
  const ch = CHAPTERS.find((c) => c.id === chapterId)
  const p = localOf(chapterId, global)
  return ch?.beats.find((b) => p >= b.from && p <= b.to)?.id ?? null
}

/** One sentence at a time. Lines arrive, rest, and leave before the next one. */
export function NarrativeOverlay() {
  const chapterId = useExperience((s) => s.chapterId)
  const active = useExperience((s) => activeBeat(s.chapterId, s.global))
  const still = useExperience((s) => s.still)
  const flash = useNarrative((s) => s.flash)
  const [flashOn, setFlashOn] = useState(false)
  const chapter = CHAPTERS.find((c) => c.id === chapterId)!

  useEffect(() => {
    if (!flash) return
    setFlashOn(true)
    const id = window.setTimeout(() => setFlashOn(false), 5200)
    return () => window.clearTimeout(id)
  }, [flash])

  const stillVisible = still && !active && !flashOn

  return (
    <div className={`narrative ${active || flashOn || stillVisible ? 'has-text' : ''} ${active && chapter.beats.find((b) => b.id === active)?.kind === 'whisper' ? 'is-low' : ''}`} aria-hidden="true">
      {chapter.beats.map((b) => (
        <p key={b.id} className={`beat beat--${b.kind} ${active === b.id && !(b.kind === 'whisper' && flashOn) ? 'is-on' : ''}`}>
          {b.text}
          {b.sub && <span className="beat__sub">{b.sub}</span>}
        </p>
      ))}
      {chapter.stillLine && <p className={`beat beat--still ${stillVisible ? 'is-on' : ''}`}>{chapter.stillLine}</p>}
      {flash && <p className={`beat beat--flash ${flashOn ? 'is-on' : ''}`}>{flash.text}</p>}
      <WordEcho />
    </div>
  )
}

interface VeilState {
  k: number
  tone: ThresholdTone
  /** the chapter being named on the veil */
  named: ChapterConfig | null
  /** end of the opened journey: offer a way back */
  final: boolean
  /** the journey is complete: the way back is the beginning */
  loop: boolean
}

const ease = (x: number) => {
  const k = Math.min(1, Math.max(0, x))
  return k * k * (3 - 2 * k)
}

/** Where on the journey are we relative to a threshold? Driven by the damped camera position. */
function veilAt(g: number): VeilState {
  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i]
    const local = (g - s.start) / (s.end - s.start)
    if (local < 0 || local > 1.0001) continue
    const tone = s.chapter.thresholdTone ?? 'warm'
    if (local >= THRESHOLD_OUT) {
      const loop = !SEGMENTS[i + 1] && s.chapter.index === CHAPTERS.length
      const next = SEGMENTS[i + 1]?.chapter ?? (loop ? CHAPTERS[0] : CHAPTERS.find((c) => c.index === s.chapter.index + 1) ?? null)
      return { k: ease((local - THRESHOLD_OUT) / (1 - THRESHOLD_OUT)), tone, named: next, final: !SEGMENTS[i + 1], loop }
    }
    if (i > 0 && local <= THRESHOLD_IN) {
      const prevTone = SEGMENTS[i - 1].chapter.thresholdTone ?? 'warm'
      return { k: 1 - ease(local / THRESHOLD_IN), tone: prevTone, named: s.chapter, final: false, loop: false }
    }
    return { k: 0, tone, named: null, final: false, loop: false }
  }
  return { k: 0, tone: 'warm', named: null, final: false, loop: false }
}

/** The light between chapters. The new chapter is named while the scenes swap behind it. */
export function ThresholdVeil() {
  const ref = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<{ on: boolean; tone: ThresholdTone; named: ChapterConfig | null; final: boolean; loop: boolean }>({
    on: false,
    tone: 'warm',
    named: null,
    final: false,
    loop: false,
  })

  useEffect(() => {
    let raf = 0
    let last = ''
    const loop = () => {
      const v = veilAt(cameraState.global)
      if (ref.current) ref.current.style.setProperty('--k', v.k.toFixed(4))
      const key = `${v.k > 0.72}|${v.tone}|${v.named?.id}|${v.final}|${v.loop}`
      if (key !== last) {
        last = key
        setView({ on: v.k > 0.72, tone: v.tone, named: v.named, final: v.final, loop: v.loop })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { on, tone, named, final, loop } = view
  return (
    <div ref={ref} className={`veil veil--${tone} ${on ? 'is-on' : ''} ${final ? 'is-final' : ''}`}>
      {named && (
        <div className="veil__inner">
          <span className="veil__index">0{named.index}</span>
          <h2 className="veil__title">{named.title}</h2>
          {final && (
            <>
              <p className="veil__note">
                {loop
                  ? 'Yol burada bitmiyor. Her şafak, yeniden bir başlangıç.'
                  : `Bir sonraki eşik hazırlanıyor. Bu prototip ilk ${SEGMENTS.length} bölümü içeriyor.`}
              </p>
              <button className="link-btn" onClick={() => jumpTo(0)} tabIndex={on ? 0 : -1}>
                {loop ? 'Şafaktan yeniden başla' : 'Şafağa dön'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
