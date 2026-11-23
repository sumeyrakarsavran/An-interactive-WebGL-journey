'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { localOf } from '@/content/layout'
import { CHAPTERS } from '@/content/chapters'
import { useExperience } from '@/store/experience'
import { useNarrative } from '@/store/narrative'
import { forgetWord, readWord, saveWord } from '@/utils/word'

const FROM = 0.62
const TO = 0.82
const LINES = CHAPTERS.find((c) => c.id === 'return')!.discoveries!

/**
 * Dönüş: leave one word for yourself. It stays only in this browser and is shown again at the
 * opening of the next visit — "let every soul look to what it has sent ahead for tomorrow"
 * (Haşr 59:18, in the sources panel only).
 */
export function WordForTomorrow() {
  const show = useExperience((s) => s.chapterId === 'return' && localOf('return', s.global) > FROM && localOf('return', s.global) < TO)
  const discover = useNarrative((s) => s.discover)
  const [value, setValue] = useState('')
  const [left, setLeft] = useState(false)

  useEffect(() => {
    const w = readWord()
    if (w) setValue(w.word)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    saveWord(v)
    setLeft(true)
    discover('return.word', LINES['return.word'])
  }

  return (
    <div className={`word ${show ? 'is-on' : ''}`} aria-hidden={!show}>
      {!left ? (
        <form onSubmit={submit} className="word__form">
          <label htmlFor="sirr-word" className="word__label">
            Yarın şafak için kendine bir kelime bırak.
          </label>
          <div className="word__row">
            <input
              id="sirr-word"
              className="word__input"
              value={value}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              placeholder="bir kelime"
              onChange={(e) => setValue(e.target.value)}
              tabIndex={show ? 0 : -1}
            />
            <button type="submit" className="link-btn" tabIndex={show ? 0 : -1} disabled={!value.trim()}>
              Bırak
            </button>
          </div>
          <p className="word__note">Yalnızca bu cihazda saklanır; hiçbir yere gönderilmez.</p>
        </form>
      ) : (
        <div className="word__done">
          <p className="word__echo">«{value.trim()}»</p>
          <button
            type="button"
            className="link-btn"
            tabIndex={show ? 0 : -1}
            onClick={() => {
              forgetWord()
              setLeft(false)
              setValue('')
            }}
          >
            Unut
          </button>
        </div>
      )}
    </div>
  )
}

/** At the opening of Uyanış: the word left at the last Dönüş, if any. */
export function WordEcho() {
  const show = useExperience((s) => s.chapterId === 'awakening' && s.global > 0.004 && localOf('awakening', s.global) < 0.07)
  const [word, setWord] = useState<string | null>(null)
  useEffect(() => {
    setWord(readWord()?.word ?? null)
    // pick up a word left during this same visit
    const id = window.setInterval(() => setWord(readWord()?.word ?? null), 4000)
    return () => window.clearInterval(id)
  }, [])
  if (!word) return null
  return (
    <p className={`beat beat--whisper word-echo ${show ? 'is-on' : ''}`} aria-hidden="true">
      Son şafakta bıraktığın kelime: «{word}»
    </p>
  )
}
