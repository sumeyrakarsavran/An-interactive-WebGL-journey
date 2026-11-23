import type { QualityTier } from '@/store/experience'

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** The GPU the browser actually renders with (unmasked where the browser allows it). */
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
  } catch {
    return ''
  }
}

/** integrated and mobile GPUs: the reflective chapters stutter on "high" there (measured, see docs/04-QA.md) */
const MODEST_GPU = /intel|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe|microsoft basic/i

export function detectTier(): QualityTier {
  const tier = detectByDevice()
  return tier === 'high' && MODEST_GPU.test(gpuName()) ? 'medium' : tier
}

function detectByDevice(): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 8
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 600
  if (coarse && small) return cores >= 8 && mem >= 6 ? 'medium' : 'low'
  if (cores <= 4 || mem <= 4) return 'low'
  if (cores >= 8 && mem >= 8 && !coarse) return 'high'
  return 'medium'
}

export interface TierSettings {
  blades: number
  flowers: number
  pollen: number
  dpr: [number, number]
  bloom: boolean
  dof: boolean
  msaa: number
}

export const TIERS: Record<QualityTier, TierSettings> = {
  low: { blades: 14000, flowers: 260, pollen: 500, dpr: [0.8, 1.25], bloom: false, dof: false, msaa: 0 },
  medium: { blades: 40000, flowers: 700, pollen: 1200, dpr: [1, 1.5], bloom: true, dof: false, msaa: 2 },
  high: { blades: 80000, flowers: 1400, pollen: 2200, dpr: [1, 2], bloom: true, dof: true, msaa: 4 },
}

/** deterministic PRNG so the world is the same on every visit */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
