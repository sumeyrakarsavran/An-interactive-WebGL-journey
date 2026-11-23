import * as THREE from 'three'
import { mulberry32 } from '@/utils/device'
import { HERO_BASE } from './terrain'
import { petalMatrix, petalPoint, type PetalSpec } from '@/materials/petalShape'

export { petalMatrix, petalPoint, type PetalSpec }

/**
 * Pure-data layout of the hero flower, so the camera path can aim at the dewdrop
 * without depending on the React component.
 */
export const STEM_POINTS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.012, 0.18, -0.004),
  new THREE.Vector3(0.006, 0.36, 0.018),
  new THREE.Vector3(0, 0.5, 0.05),
]
export const HEAD_LOCAL = STEM_POINTS[3]
export const HEAD_TILT = 0.62

export const DEW_PETAL = 0
const r = mulberry32(5)
export const PETALS: PetalSpec[] = Array.from({ length: 8 }, (_, i) => ({
  yaw: (i / 8) * Math.PI * 2 + (r() - 0.5) * 0.18,
  elev: 0.22 + r() * 0.16,
  length: 0.058 + r() * 0.012,
  width: 0.026 + r() * 0.006,
  cup: 0.55 + r() * 0.25,
  curl: 0.22 + r() * 0.12,
  phase: r() * 10,
  flex: i === DEW_PETAL ? 0.15 : 1,
}))
// the dew petal points sideways, so the pendant drop at its tip is seen against the dawn horizon
PETALS[DEW_PETAL].yaw = 0.12
PETALS[DEW_PETAL].elev = 0.16
PETALS[DEW_PETAL].curl = 0.18

export function headMatrix() {
  const m = new THREE.Matrix4().makeTranslation(HERO_BASE.x + HEAD_LOCAL.x, HERO_BASE.y + HEAD_LOCAL.y, HERO_BASE.z + HEAD_LOCAL.z)
  m.multiply(new THREE.Matrix4().makeRotationX(HEAD_TILT))
  return m
}

export const DEW_RADIUS = 0.0046
export const DEW_UV = { u: 0.9, v: 0.0 }

/** Dewdrop centre in petal-local space: hanging beneath the petal tip, about to fall. */
export function dewLocal() {
  const p = petalPoint(PETALS[DEW_PETAL], DEW_UV.u, DEW_UV.v)
  p.y -= DEW_RADIUS * 0.82
  return p
}

/** World position of the dewdrop in the rest pose. */
export const DEW_WORLD = dewLocal()
  .applyMatrix4(petalMatrix(PETALS[DEW_PETAL]))
  .applyMatrix4(headMatrix())

export const HEAD_WORLD = new THREE.Vector3().setFromMatrixPosition(headMatrix())
