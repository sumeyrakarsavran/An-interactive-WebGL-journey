'use client'
import { useEffect, useRef } from 'react'
import { CHAPTERS } from '@/content/chapters'
import { SOURCES, SOURCE_TYPE_LABEL } from '@/content/sources'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { AmbientEngine } from '@/audio/AmbientEngine'
import { lenis } from '@/hooks/useSmoothScroll'

export function SoundToggle() {
  const soundOn = useExperience((s) => s.soundOn)
  const setSound = useExperience((s) => s.setSound)
  const toggle = () => {
    const next = !soundOn
    setSound(next)
    void AmbientEngine.setOn(next)
  }
  return (
    <button className="ctl ctl--sound" onClick={toggle} aria-pressed={soundOn}>
      <span className={`ctl__wave ${soundOn ? 'is-on' : ''}`} aria-hidden="true">
        <i /> <i /> <i />
      </span>
      {soundOn ? 'Rüzgâr' : 'Sessizlik'}
    </button>
  )
}

/** Reading mode: the same journey as text — for screen readers, or anyone who prefers stillness. */
export function TextModeToggle() {
  const textMode = useExperience((s) => s.textMode)
  const setTextMode = useExperience((s) => s.setTextMode)
  return (
    <button className="ctl ctl--text" onClick={() => setTextMode(!textMode)} aria-pressed={textMode}>
      {textMode ? 'Deneyim' : 'Metin'}
    </button>
  )
}

export function SourcesButton() {
  const open = useNarrative((s) => s.sourcesOpen)
  const setOpen = useNarrative((s) => s.setSourcesOpen)
  return (
    <button className="ctl ctl--sources" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="sources">
      Kaynaklar
    </button>
  )
}

/** Opt-in, unobtrusive. Every item states exactly what kind of text it is. */
export function SourcesPanel() {
  const open = useNarrative((s) => s.sourcesOpen)
  const setOpen = useNarrative((s) => s.setSourcesOpen)
  const chapterId = useExperience((s) => s.chapterId)
  const chapter = CHAPTERS.find((c) => c.id === chapterId)!
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      lenis?.stop()
      closeRef.current?.focus()
    } else lenis?.start()
  }, [open])

  return (
    <aside id="sources" className={`sources ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Kaynaklar">
      <div className="sources__head">
        <p className="sources__eyebrow">
          0{chapter.index} · {chapter.title}
        </p>
        <button ref={closeRef} className="link-btn" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
          Kapat
        </button>
      </div>
      <p className="sources__intro">
        Bu bölümün görsel dünyası evrenseldir; düşünsel temeli aşağıdaki kaynaklara dayanır. Ekrandaki sorular projenin
        özgün metnidir.
      </p>
      <ul className="sources__list" aria-label="Kaynak listesi">
        {chapter.sources.map((id) => {
          const s = SOURCES[id]
          return (
            <li key={id} className={`src src--${s.type}`}>
              <p className="src__type">{SOURCE_TYPE_LABEL[s.type]}</p>
              <h3 className="src__ref">{s.ref}</h3>
              <p className="src__summary">{s.summary}</p>
              {s.type === 'quran' && (
                <p className="src__meta">
                  Proje özeti, meal değildir.
                  {s.link && (
                    <>
                      {' '}Meal ve tefsir için:{' '}
                      <a href={s.link} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>
                        Diyanet Kur’an Yolu
                      </a>
                    </>
                  )}
                </p>
              )}
              {s.note && <p className="src__note">{s.note}</p>}
            </li>
          )
        })}
      </ul>
      <p className="sources__privacy">
        SIRR çerez kullanmaz ve hiçbir veri toplamaz. Son bölümde bırakabileceğin kelime yalnızca bu tarayıcıda saklanır.
      </p>
    </aside>
  )
}

export function ScrollHint() {
  const hasScrolled = useExperience((s) => s.hasScrolled)
  const ready = useExperience((s) => s.ready)
  return (
    <div className={`hint ${ready && !hasScrolled ? 'is-on' : ''}`} aria-hidden="true">
      <span className="hint__line" />
      ilerlemek için kaydır
    </div>
  )
}

export function Loader() {
  const ready = useExperience((s) => s.ready)
  return (
    <div className={`loader ${ready ? 'is-done' : ''}`} aria-hidden="true">
      <span className="loader__mark">SIRR</span>
    </div>
  )
}
