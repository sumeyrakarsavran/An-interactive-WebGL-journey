/**
 * Procedural ambient sound — synthesised from filtered noise and a few sine tones, so there are
 * no licensing questions and nothing to download. Starts only after an explicit user gesture.
 * Silence is the default, and in places (Nefs, a still lake) silence is the design.
 *
 * Each chapter has a profile: how much wind body, grass whistle, leaf hiss, low room tone and
 * water. Profiles crossfade over a few seconds.
 */

interface Profile {
  body: number
  whistle: number
  hiss: number
  room: number
  water: number
  /** a distant, rhythmic pulsing of the gusts (Zaman — only ever heard, never seen) */
  gallop: number
}

const PROFILES: Record<string, Profile> = {
  awakening: { body: 0.45, whistle: 0.14, hiss: 0.05, room: 0.18, water: 0, gallop: 0 },
  creation: { body: 0.22, whistle: 0.06, hiss: 0.09, room: 0.08, water: 0, gallop: 0 },
  nafs: { body: 0.04, whistle: 0.0, hiss: 0.01, room: 0.32, water: 0, gallop: 0 },
  time: { body: 0.6, whistle: 0.2, hiss: 0.08, room: 0.12, water: 0, gallop: 1 },
  stillness: { body: 0.12, whistle: 0.02, hiss: 0.03, room: 0.1, water: 0.5, gallop: 0 },
  return: { body: 0.3, whistle: 0.08, hiss: 0.07, room: 0.1, water: 0, gallop: 0 },
}

class AmbientEngineImpl {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private bands: Array<{ filter: BiquadFilterNode; gain: GainNode; base: number; key: 'body' | 'whistle' | 'hiss' }> = []
  private room: GainNode | null = null
  private water: { gain: GainNode; filter: BiquadFilterNode } | null = null
  private last = 0
  private lastPing = 0
  private profile: Profile = PROFILES.awakening
  on = false

  private build() {
    const ctx = new AudioContext()
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let b = 0
      for (let i = 0; i < len; i++) {
        // pinkish noise (leaky integration of white)
        const w = Math.random() * 2 - 1
        b = 0.985 * b + 0.15 * w
        d[i] = b * 0.6 + w * 0.08
      }
    }
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true

    const specs = [
      { f: 320, q: 0.7, key: 'body' as const },
      { f: 900, q: 3.5, key: 'whistle' as const },
      { f: 3200, q: 0.9, key: 'hiss' as const },
    ]
    this.bands = specs.map((s) => {
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = s.f
      filter.Q.value = s.q
      const gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(filter).connect(gain).connect(master)
      return { filter, gain, base: s.f, key: s.key }
    })

    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 110
    const room = ctx.createGain()
    room.gain.value = 0
    src.connect(low).connect(room).connect(master)

    // water: low-passed noise, its level slowly lapping
    const wf = ctx.createBiquadFilter()
    wf.type = 'lowpass'
    wf.frequency.value = 520
    wf.Q.value = 0.6
    const wg = ctx.createGain()
    wg.gain.value = 0
    src.connect(wf).connect(wg).connect(master)

    src.start()
    this.ctx = ctx
    this.master = master
    this.room = room
    this.water = { gain: wg, filter: wf }
  }

  async setOn(on: boolean) {
    if (on && !this.ctx) this.build()
    if (!this.ctx || !this.master) return
    if (on && this.ctx.state === 'suspended') await this.ctx.resume()
    this.on = on
    this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, on ? 1.2 : 0.4)
  }

  /** chapter change: the soundscape crossfades over a few seconds */
  setProfile(chapterId: string) {
    this.profile = PROFILES[chapterId] ?? PROFILES.awakening
  }

  /** a single soft tone — a drop meeting the water. Rate-limited. */
  ping(strength = 0.5) {
    if (!this.on || !this.ctx || !this.master) return
    const now = this.ctx.currentTime
    if (now - this.lastPing < 0.09) return
    this.lastPing = now
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = 'sine'
    const f = 900 + Math.random() * 1500
    o.frequency.setValueAtTime(f, now)
    o.frequency.exponentialRampToValueAtTime(f * 0.6, now + 0.25)
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.05 * strength, now + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    o.connect(g).connect(this.master)
    o.start(now)
    o.stop(now + 0.4)
  }

  /** called from the render loop; throttled to ~12 Hz */
  update(strength: number, gust: number, pointer: number, still: boolean) {
    if (!this.on || !this.ctx) return
    const now = this.ctx.currentTime
    if (now - this.last < 0.08) return
    this.last = now
    const p = this.profile
    const s = Math.min(1.5, strength * (0.5 + gust) + pointer * 0.8)
    const quiet = still ? 0.35 : 1
    // distant gallop: bursts of a ~2.3 Hz pulse in the gusts, every ten seconds or so
    const burst = Math.max(0, Math.sin(now * 0.6)) ** 6
    const pulse = 1 + p.gallop * burst * 0.9 * Math.max(0, Math.sin(now * Math.PI * 2 * 2.3))
    for (const b of this.bands) {
      b.filter.frequency.setTargetAtTime(b.base * (0.8 + s * 0.6), now, 0.3)
      const target = p[b.key] * (0.3 + s) * quiet * (b.key === 'body' ? pulse : 1)
      b.gain.gain.setTargetAtTime(target, now, b.key === 'body' && p.gallop ? 0.05 : 1.2)
    }
    this.room?.gain.setTargetAtTime(p.room * (still ? 0.6 : 1), now, 1.5)
    if (this.water) {
      const lap = 0.6 + 0.4 * Math.sin(now * 0.9) * Math.sin(now * 0.37 + 1)
      // a still lake is almost silent
      this.water.gain.gain.setTargetAtTime(p.water * lap * (still ? 0.25 : 1), now, 0.6)
      this.water.filter.frequency.setTargetAtTime(380 + lap * 260, now, 0.6)
    }
  }
}

export const AmbientEngine = new AmbientEngineImpl()
