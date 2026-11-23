import { CHAPTERS, type ChapterConfig } from './chapters'

/**
 * The opened chapters laid end to end on one continuous scroll.
 * `global` ∈ [0,1] over the whole journey; each chapter owns a segment of it.
 */
export interface Segment {
  chapter: ChapterConfig
  start: number
  end: number
}

export const OPEN_CHAPTERS = CHAPTERS.filter((c) => c.available)
export const TOTAL_VH = OPEN_CHAPTERS.reduce((a, c) => a + c.scrollVh, 0)

export const SEGMENTS: Segment[] = (() => {
  let acc = 0
  return OPEN_CHAPTERS.map((chapter) => {
    const start = acc / TOTAL_VH
    acc += chapter.scrollVh
    return { chapter, start, end: acc / TOTAL_VH }
  })
})()

export function segmentAt(global: number): Segment {
  for (const s of SEGMENTS) if (global < s.end) return s
  return SEGMENTS[SEGMENTS.length - 1]
}

export function segmentOf(id: string) {
  return SEGMENTS.find((s) => s.chapter.id === id)
}

export function localOf(id: string, global: number) {
  const s = segmentOf(id)
  if (!s) return 0
  return Math.min(1, Math.max(0, (global - s.start) / (s.end - s.start)))
}

/** global position of a chapter's local progress */
export function globalOf(id: string, local: number) {
  const s = segmentOf(id)
  if (!s) return 0
  return s.start + (s.end - s.start) * local
}
