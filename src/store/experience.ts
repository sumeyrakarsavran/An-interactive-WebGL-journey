import { create } from 'zustand'

export type QualityTier = 'low' | 'medium' | 'high'
/** something went wrong; the UI says so and offers a way forward */
export type Fault = null | 'crash' | 'chunk' | 'context' | 'slow'

interface ExperienceState {
  /** raw scroll position over the whole journey, 0..1 */
  global: number
  /** chapter the camera is currently in (set by the CameraRig from the damped position) */
  chapterId: string
  /** adjacent chapter to pre-mount (near a threshold), or null */
  neighbor: string | null
  quality: QualityTier
  reducedMotion: boolean
  /** visitor has made no input for a while */
  still: boolean
  ready: boolean
  soundOn: boolean
  hasScrolled: boolean
  /** reading mode: the narrative as plain text, canvas paused */
  textMode: boolean
  setTextMode: (on: boolean) => void
  fault: Fault
  setFault: (f: Fault) => void
  setGlobal: (g: number) => void
  setChapter: (id: string) => void
  setNeighbor: (id: string | null) => void
  setQuality: (q: QualityTier) => void
  downgrade: () => void
  setReducedMotion: (r: boolean) => void
  setStill: (s: boolean) => void
  setReady: () => void
  setSound: (on: boolean) => void
}

const order: QualityTier[] = ['low', 'medium', 'high']

export const useExperience = create<ExperienceState>((set, get) => ({
  global: 0,
  chapterId: 'awakening',
  neighbor: null,
  quality: 'medium',
  reducedMotion: false,
  still: false,
  ready: false,
  soundOn: false,
  hasScrolled: false,
  textMode: false,
  setTextMode: (textMode) => set({ textMode }),
  fault: null,
  setFault: (fault) => set({ fault }),
  setGlobal: (g) => set({ global: g, hasScrolled: get().hasScrolled || g > 0.002 }),
  setChapter: (chapterId) => set({ chapterId }),
  setNeighbor: (neighbor) => set({ neighbor }),
  setQuality: (quality) => set({ quality }),
  downgrade: () => {
    const i = order.indexOf(get().quality)
    if (i > 0) set({ quality: order[i - 1] })
  },
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setStill: (still) => set({ still }),
  setReady: () => set({ ready: true }),
  setSound: (soundOn) => set({ soundOn }),
}))
