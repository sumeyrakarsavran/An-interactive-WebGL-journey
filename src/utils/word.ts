/**
 * The visitor's word for tomorrow. Stored only in this browser (localStorage); never sent anywhere.
 */
const KEY = 'sirr.word'

export interface SavedWord {
  word: string
  at: number
}

export function readWord(): SavedWord | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as SavedWord
    return typeof v.word === 'string' && v.word.trim() ? v : null
  } catch {
    return null
  }
}

export function saveWord(word: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ word: word.trim().slice(0, 32), at: Date.now() }))
  } catch {
    /* private mode or storage disabled — the word simply is not kept */
  }
}

export function forgetWord() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
