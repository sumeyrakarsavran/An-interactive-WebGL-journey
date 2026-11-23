import { mulberry32 } from '@/utils/device'
import { groundHeight } from './terrain'

export interface FieldData {
  /** per-blade: x,y,z */
  offsets: Float32Array
  angles: Float32Array
  heights: Float32Array
  widths: Float32Array
  tints: Float32Array
  count: number
  /** flower heads: x,y,z base, height, scale, angle, colorIndex */
  flowers: Float32Array
  flowerCount: number
}

function gauss(r: () => number) {
  return (r() + r() + r() - 1.5) / 1.5
}

/**
 * Distributes grass along the camera corridor (dense) plus a wide sparse field.
 * Wildflower stems are appended as extra blades so their tips match the heads exactly.
 */
export function buildField(blades: number, flowers: number): FieldData {
  const r = mulberry32(1103)
  const total = blades + flowers
  const offsets = new Float32Array(total * 3)
  const angles = new Float32Array(total)
  const heights = new Float32Array(total)
  const widths = new Float32Array(total)
  const tints = new Float32Array(total)
  const fl = new Float32Array(flowers * 7)

  const place = (i: number, x: number, z: number, h: number, w: number, tint: number) => {
    offsets[i * 3] = x
    offsets[i * 3 + 1] = groundHeight(x, z) - 0.02
    offsets[i * 3 + 2] = z
    angles[i] = r() * Math.PI * 2
    heights[i] = h
    widths[i] = w
    tints[i] = tint
  }

  let i = 0
  while (i < blades) {
    const corridor = r() < 0.78
    const x = corridor ? gauss(r) * 7 : (r() - 0.5) * 70
    const z = corridor ? -14 + r() * 52 : -40 + r() * 80
    // keep a tiny clearing around the hero stem
    if (x * x + z * z < 0.012) continue
    // shorter grass far from the path — reads as meadow, cheaper overdraw
    const far = Math.min(1, Math.abs(x) / 14)
    const h = (0.32 + r() * 0.5) * (1 - far * 0.35)
    place(i, x, z, h, 0.011 + r() * 0.012, r())
    i++
  }

  for (let f = 0; f < flowers; f++) {
    const x = gauss(r) * 9
    const z = -12 + r() * 48
    if (x * x + z * z < 0.5) {
      f--
      continue
    }
    const h = 0.38 + r() * 0.42
    place(i, x, z, h, 0.012, 2.0) // tint 2 = flower stem
    const o = f * 7
    fl[o] = x
    fl[o + 1] = offsets[i * 3 + 1]
    fl[o + 2] = z
    fl[o + 3] = h
    fl[o + 4] = 0.7 + r() * 0.6
    fl[o + 5] = r() * Math.PI * 2
    angles[i] = fl[o + 5] // stem leans the same way the head is oriented
    fl[o + 6] = Math.floor(r() * 4)
    i++
  }

  return { offsets, angles, heights, widths, tints, count: total, flowers: fl, flowerCount: flowers }
}
