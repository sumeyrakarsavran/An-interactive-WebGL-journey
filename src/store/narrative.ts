import { create } from 'zustand'

interface NarrativeState {
  discovered: Record<string, number>
  sourcesOpen: boolean
  /** transient line triggered by an interaction */
  flash: { text: string; at: number } | null
  /** the visitor has reached Dönüş — the next Uyanış begins with the fog thinner */
  returned: boolean
  discover: (id: string, line?: string) => void
  setSourcesOpen: (open: boolean) => void
  setReturned: () => void
}

export const useNarrative = create<NarrativeState>((set, get) => ({
  discovered: {},
  sourcesOpen: false,
  flash: null,
  returned: false,
  discover: (id, line) => {
    const first = !get().discovered[id]
    set({
      discovered: { ...get().discovered, [id]: (get().discovered[id] ?? 0) + 1 },
      flash: first && line ? { text: line, at: performance.now() } : get().flash,
    })
  },
  setSourcesOpen: (sourcesOpen) => set({ sourcesOpen }),
  setReturned: () => {
    if (!get().returned) set({ returned: true })
  },
}))
