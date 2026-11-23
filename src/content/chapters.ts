/**
 * Narrative configuration. Scenes never contain text — they read nothing from here
 * except the chapter id. The overlay, navigation and source panel are driven entirely
 * by this file, so questions, timing and references can change without touching WebGL.
 */

export type BeatKind = 'title' | 'question' | 'whisper'

export interface Beat {
  id: string
  /** chapter progress window [from, to] in 0..1 */
  from: number
  to: number
  kind: BeatKind
  text: string
  sub?: string
}

export type ThresholdTone = 'warm' | 'silver' | 'sand' | 'dusk' | 'dawn'

export interface ChapterConfig {
  id: 'awakening' | 'creation' | 'nafs' | 'time' | 'stillness' | 'return'
  index: number
  title: string
  latin: string
  /** time of day in the one-day arc */
  hour: string
  /** scroll length in viewport heights */
  scrollVh: number
  available: boolean
  beats: Beat[]
  /** line revealed only when the visitor stays still */
  stillLine?: string
  /** lines revealed once, the first time an interaction is discovered */
  discoveries?: Record<string, string>
  /** colour of the light the visitor passes through when leaving this chapter */
  thresholdTone?: ThresholdTone
  sources: string[]
}

export const CHAPTERS: ChapterConfig[] = [
  {
    id: 'awakening',
    index: 1,
    title: 'Uyanış',
    latin: 'Awakening',
    hour: 'tan yeri ağarmadan',
    scrollVh: 900,
    available: true,
    beats: [
      { id: 'a.title', from: 0, to: 0.06, kind: 'title', text: 'SIRR', sub: 'bir iç seyir' },
      { id: 'a.q1', from: 0.1, to: 0.22, kind: 'question', text: 'Ne zamandır buradasın?' },
      { id: 'a.q2', from: 0.3, to: 0.43, kind: 'question', text: 'Yaşıyor musun, yoksa yalnızca geçiyor musun?' },
      { id: 'a.q3', from: 0.5, to: 0.62, kind: 'question', text: 'En son ne zaman gerçekten durdun?' },
      { id: 'a.hint', from: 0.68, to: 0.8, kind: 'whisper', text: 'Çiçeğe dokun. Ya da yalnızca dur.' },
      { id: 'a.drop', from: 0.84, to: 0.92, kind: 'question', text: 'Bir damla, bütün sabahı taşıyor.' },
    ],
    stillLine: 'Durduğunda dünya da durdu mu, yoksa onu ilk kez mi gördün?',
    discoveries: { 'awakening.flower': 'Dokunduğun her şey, sana bir şey söylüyor.' },
    thresholdTone: 'warm',
    sources: ['q.41.53', 'q.51.20-21', 'orig.awakening'],
  },
  {
    id: 'creation',
    index: 2,
    title: 'Yaratılış',
    latin: 'Creation',
    hour: 'sabah',
    scrollVh: 1000,
    available: true,
    beats: [
      { id: 'c.q0', from: 0.08, to: 0.2, kind: 'question', text: 'Hiçbir damarı gelişigüzel değil.' },
      { id: 'c.q1', from: 0.29, to: 0.42, kind: 'question', text: 'Bu kadar incelikle yaratılmışken, kendine ne yapıyorsun?' },
      { id: 'c.hint', from: 0.5, to: 0.63, kind: 'whisper', text: 'Çiçeği yana çevir. Basılı tutarsan içini görürsün.' },
      { id: 'c.q2', from: 0.67, to: 0.77, kind: 'question', text: 'Güzellik bir emanetti, bir mülk değil.' },
      { id: 'c.q3', from: 0.8, to: 0.9, kind: 'question', text: 'Solan yalnızca yaprak mı?' },
    ],
    stillLine: 'Durunca, ayrıntılar konuşmaya başlıyor.',
    discoveries: {
      'creation.symmetry': 'Her yaprak, ötekine bakarak duruyor.',
      'creation.anatomy': 'Işık, en ince damarı bile buluyor.',
    },
    thresholdTone: 'silver',
    sources: ['q.95.4-8', 'tafsir.95.5', 'q.91.7-10', 'q.3.190-191', 'scholar.ghazali.tefekkur', 'orig.creation'],
  },
  {
    id: 'nafs',
    index: 3,
    title: 'Nefs',
    latin: 'The Self',
    hour: 'iç öğle',
    scrollVh: 1000,
    available: true,
    beats: [
      { id: 'n.q1', from: 0.1, to: 0.21, kind: 'question', text: 'Kendine anlattığın hikâyenin ne kadarı gerçek?' },
      { id: 'n.q2', from: 0.27, to: 0.38, kind: 'question', text: 'İstediğin her şey, gerçekten ihtiyacın olan şey mi?' },
      { id: 'n.q3', from: 0.42, to: 0.52, kind: 'question', text: 'En çok neyi kaybetmekten korkuyorsun?' },
      { id: 'n.hint', from: 0.57, to: 0.7, kind: 'whisper', text: 'Aynayı sil. Yavaşça.' },
      { id: 'n.q4', from: 0.86, to: 0.93, kind: 'question', text: 'Bakmaya cesaret ettiğin yer, geçebileceğin yerdir.' },
    ],
    stillLine: 'Ayna da bekliyor.',
    discoveries: {
      'nafs.polish': 'Silindikçe açılıyor; bırakınca yeniden buğulanıyor.',
      'nafs.clear': 'Ayna bir şey eklemiyor; yalnızca gösteriyor.',
      'nafs.water': 'Gördüğün yüzey, bir eşikmiş.',
    },
    thresholdTone: 'sand',
    sources: ['q.91.7-10', 'q.12.53', 'q.75.2', 'q.83.14', 'hadith.ran', 'hadith.hearts', 'scholar.ghazali.heart', 'scholar.rumi.painters', 'orig.nafs'],
  },
  {
    id: 'time',
    index: 4,
    title: 'Zaman',
    latin: 'Time',
    hour: 'ikindi',
    scrollVh: 1100,
    available: true,
    beats: [
      { id: 't.q1', from: 0.08, to: 0.19, kind: 'question', text: 'Ömrünü neye harcıyorsun?' },
      { id: 't.hint0', from: 0.23, to: 0.33, kind: 'whisper', text: 'Acele edersen gün de acele eder.' },
      { id: 't.hint', from: 0.45, to: 0.55, kind: 'whisper', text: 'Kumu avucunla topla.' },
      { id: 't.q2', from: 0.58, to: 0.7, kind: 'question', text: 'Biriktirdiklerinin hangisi seninle gelecek?' },
      { id: 't.q3', from: 0.77, to: 0.88, kind: 'question', text: 'Yetişmeye çalışırken neyi kaçırıyorsun?' },
    ],
    stillLine: 'Rüzgâr, sen dururken de esiyor.',
    discoveries: {
      'time.gather': 'Biriktirdikçe yükseliyor; rüzgâr da onu fark ediyor.',
      'time.lost': 'Rüzgâr hepsini geri aldı.',
      'time.hurry': 'Acele ettikçe gün kısalıyor.',
    },
    thresholdTone: 'dusk',
    sources: ['q.103.1-3', 'q.102.1-8', 'q.100.1-11', 'hadith.two-blessings', 'hadith.valley', 'hadith.stranger', 'hadith.naim', 'orig.time'],
  },
  {
    id: 'stillness',
    index: 5,
    title: 'Sükûn',
    latin: 'Stillness',
    hour: 'akşam',
    scrollVh: 1100,
    available: true,
    beats: [
      { id: 's.q1', from: 0.1, to: 0.2, kind: 'question', text: 'Elindekini en son ne zaman fark ettin?' },
      { id: 's.hint', from: 0.25, to: 0.34, kind: 'whisper', text: 'Suya dokunabilirsin. Ya da hiçbir şey yapma.' },
      { id: 's.q2', from: 0.42, to: 0.53, kind: 'question', text: 'Bekleyişin seni yoruyor mu, olgunlaştırıyor mu?' },
      { id: 's.q3', from: 0.61, to: 0.72, kind: 'question', text: 'Kalbini neyle dinlendiriyorsun?' },
      { id: 's.q4', from: 0.8, to: 0.9, kind: 'question', text: 'Bıraktığında elinde ne kalıyor?' },
    ],
    stillLine: 'Sen durdukça su da duruluyor.',
    discoveries: {
      'stillness.touch': 'Her dokunuş bir halka bırakıyor.',
      'stillness.deep': 'Sessizlik boş değilmiş.',
    },
    thresholdTone: 'dawn',
    sources: ['q.13.28', 'q.2.152', 'q.14.7', 'q.2.153', 'q.65.3', 'hadith.believer', 'scholar.ghazali.sabr-shukr', 'scholar.ibnqayyim.wabil', 'orig.stillness'],
  },
  {
    id: 'return',
    index: 6,
    title: 'Dönüş',
    latin: 'Return',
    hour: 'yeniden şafak',
    scrollVh: 1000,
    available: true,
    beats: [
      { id: 'r.q1', from: 0.12, to: 0.24, kind: 'question', text: 'Bugün neyi değiştirebilirsin?' },
      { id: 'r.q2', from: 0.33, to: 0.45, kind: 'question', text: 'Kalbini neye yöneltiyorsun?' },
      { id: 'r.q3', from: 0.5, to: 0.6, kind: 'question', text: 'Yolculuğuna nereden devam edeceksin?' },
      { id: 'r.end', from: 0.84, to: 0.92, kind: 'question', text: 'Varmadın. Yöneldin; bu da bir başlangıç.' },
    ],
    stillLine: 'Işık, her sabah yeniden geliyor.',
    discoveries: {
      'return.flower': 'Aynı yer, başka bir çiçek.',
      'return.word': 'Yarın şafakta seni burada bekleyecek.',
    },
    thresholdTone: 'warm',
    sources: ['q.89.27-30', 'q.59.18', 'q.39.53', 'q.50.16', 'hadith.tawba', 'athar.umar', 'hadith.ihsan', 'orig.return'],
  },
]

/** local progress at which a chapter starts handing over to the next */
export const THRESHOLD_OUT = 0.93
/** local progress by which the new chapter has emerged from the threshold light */
export const THRESHOLD_IN = 0.06
