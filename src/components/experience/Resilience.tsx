'use client'
import { Component, useEffect, type ReactNode } from 'react'
import { useExperience, type Fault } from '@/store/experience'

/**
 * Catches anything thrown below it (a scene crash, a chapter chunk that failed to download,
 * a WebGL context that could not be created) and reports it as a fault instead of a white page.
 */
export class Boundary extends Component<{ fault: Fault; fallback?: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[SIRR]', error)
    useExperience.getState().setFault(this.props.fault)
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}

const MESSAGES: Record<Exclude<Fault, null>, { text: string; toText: boolean }> = {
  crash: { text: 'Görüntü motoru beklenmedik biçimde durdu. Yolculuğa metin olarak devam edebilirsin.', toText: true },
  chunk: { text: 'Bir bölüm yüklenemedi; bağlantı kesilmiş olabilir.', toText: true },
  context: { text: 'Ekran kartı bağlantıyı bir süreliğine bıraktı. Kendiliğinden dönebilir.', toText: false },
  slow: { text: 'Bu cihazda dünya açılmakta zorlanıyor.', toText: false },
}

/** A quiet notice for faults, always with a way forward: reload, or read the journey as text. */
export function FaultNotice() {
  const fault = useExperience((s) => s.fault)
  const ready = useExperience((s) => s.ready)
  const setFault = useExperience((s) => s.setFault)
  const setTextMode = useExperience((s) => s.setTextMode)

  // a crash or a missing chapter: switch to the text journey at once, so nothing is lost
  useEffect(() => {
    if (fault && MESSAGES[fault].toText) setTextMode(true)
  }, [fault, setTextMode])

  // if the world has not started after a long while, offer the text instead of waiting forever
  useEffect(() => {
    if (ready) {
      // it got there in the end: the "slow" notice has nothing left to say
      if (useExperience.getState().fault === 'slow') setFault(null)
      return
    }
    const id = window.setTimeout(() => {
      if (!useExperience.getState().ready && !useExperience.getState().fault) setFault('slow')
    }, 20000)
    return () => window.clearTimeout(id)
  }, [ready, setFault])

  if (!fault) return null
  const m = MESSAGES[fault]
  return (
    <div className="fault" role="status">
      <p>{m.text}</p>
      <div className="fault__actions">
        <button className="link-btn" onClick={() => window.location.reload()}>
          Yeniden yükle
        </button>
        {!m.toText && (
          <button
            className="link-btn"
            onClick={() => {
              setTextMode(true)
              setFault(null)
            }}
          >
            Metinle devam et
          </button>
        )}
      </div>
    </div>
  )
}
