import * as THREE from 'three'
import type { CameraPath } from '@/camera/types'
import { dunes } from './dunes'

/**
 * The walk follows the corridor between dunes toward the low sun.
 * Samples are found by following the valley floor; the camera floats at eye height above
 * the highest sand nearby so it never dips into a slope.
 */
const STEP = 6
const Z0 = 4
const Z1 = -236
export const EYE = 1.65

function valleyX(z: number, prev: number) {
  let best = prev
  let bestCost = Infinity
  for (let x = prev - 7; x <= prev + 7; x += 0.5) {
    const cost = dunes(x, z) + 0.025 * (x - prev) * (x - prev)
    if (cost < bestCost) {
      bestCost = cost
      best = x
    }
  }
  return best
}

const ground: THREE.Vector3[] = []
{
  let x = valleyX(Z0, 0)
  for (let z = Z0; z >= Z1; z -= STEP) {
    x = valleyX(z, x)
    ground.push(new THREE.Vector3(x, dunes(x, z), z))
  }
}
/** index of the sample where the visitor stops to gather sand */
export const GATHER_INDEX = Math.round(ground.length * 0.46)
// a sample a step beyond it: the camera only drifts this far during the whole pause
{
  const g = GATHER_INDEX
  const p = ground[g].clone().lerp(ground[g + 1], 0.15)
  p.y = dunes(p.x, p.z)
  ground.splice(g + 1, 0, p)
}
/** footprints and the gathering spot use the walking line on the sand */
export const WALK_LINE = ground

function eyeAt(p: THREE.Vector3) {
  let h = -Infinity
  for (let dx = -2; dx <= 2; dx += 1) for (let dz = -3; dz <= 3; dz += 1.5) h = Math.max(h, dunes(p.x + dx, p.z + dz))
  return new THREE.Vector3(p.x, h + EYE, p.z)
}

const n = ground.length
const position = ground.map(eyeAt)
const target = ground.map((_, i) => {
  const ahead = position[Math.min(n - 1, i + 3)].clone()
  // look down at the sand while gathering; toward the sun at the end
  const gatherLook = Math.exp(-Math.pow((i - GATHER_INDEX) / 2.2, 2))
  ahead.y += -0.9 - gatherLook * 2.2 + (i / n) * 1.2
  if (i >= n - 3) ahead.z -= 30
  return ahead
})

// pacing: most of the distance early, a long pause at the gathering spot, then the last stretch
const knots = ground.map((_, i) => {
  const g = GATHER_INDEX
  if (i <= g - 1) return (i / (g - 1)) * 0.42
  if (i === g) return 0.445
  if (i === g + 1) return 0.72
  return 0.72 + ((i - (g + 1)) / (n - 1 - (g + 1))) * 0.28
})

export const timePath: CameraPath = {
  position,
  target,
  knots,
  fov: [
    [0, 52],
    [0.42, 50],
    [0.6, 56],
    [0.9, 46],
    [1, 42],
  ],
  look: { yaw: 0.08, pitch: 0.04, fadeFrom: 0.4, fadeTo: 0.44 },
  handheld: 0.03,
}
