'use client'
import { CHAPTERS, THRESHOLD_IN } from '@/content/chapters'
import { globalOf } from '@/content/layout'
import { useExperience } from '@/store/experience'
import { jumpTo } from '@/hooks/jump'

/** Thin marks on the left edge. Opened chapters are reachable; the rest are named only by number. */
export function ChapterIndex() {
  const chapterId = useExperience((s) => s.chapterId)
  return (
    <nav className="chapters" aria-label="Bölümler">
      <ol>
        {CHAPTERS.map((c) => {
          const current = c.id === chapterId
          // land just past the threshold light, where the chapter has emerged
          const target = c.index === 1 ? 0 : globalOf(c.id, THRESHOLD_IN + 0.01)
          return (
            <li key={c.id}>
              <button
                className={`chapters__mark ${current ? 'is-current' : ''} ${c.available ? '' : 'is-locked'}`}
                disabled={!c.available}
                aria-current={current ? 'step' : undefined}
                onClick={() => jumpTo(target)}
                title={c.available ? c.title : 'Henüz açılmadı'}
              >
                <span className="chapters__line" />
                <span className="chapters__label">
                  <span className="chapters__num">0{c.index}</span> {c.available ? c.title : '·'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
