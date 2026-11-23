import * as THREE from 'three'
import { mulberry32 } from '@/utils/device'
import { petalMatrix, petalPoint, type PetalSpec } from '@/materials/petalShape'

/**
 * Macro flower, seen at insect scale: petals ~3 m long.
 * Two whorls — a wide outer ring and an upright inner cup around a forest of stamens.
 */
export const HEAD_TILT = 0.28

const r = mulberry32(21)
export const OUTER = 9
export const INNER = 7

export const MACRO_PETALS: PetalSpec[] = [
  ...Array.from({ length: OUTER }, (_, i) => ({
    yaw: (i / OUTER) * Math.PI * 2 + (r() - 0.5) * 0.12,
    elev: 0.24 + r() * 0.1,
    length: 3.0 + r() * 0.35,
    width: 1.4 + r() * 0.2,
    cup: 0.5 + r() * 0.15,
    curl: 0.14 + r() * 0.06,
    phase: r() * 10,
    flex: 1,
  })),
  ...Array.from({ length: INNER }, (_, i) => ({
    yaw: ((i + 0.5) / INNER) * Math.PI * 2 + (r() - 0.5) * 0.15,
    elev: 0.9 + r() * 0.12,
    length: 1.55 + r() * 0.15,
    width: 1.05 + r() * 0.1,
    cup: 0.75,
    curl: -0.08,
    phase: r() * 10,
    flex: 0.6,
  })),
]

/** the petal the camera glides over at the start (points toward the viewer, +z) */
export const FRONT = 2
MACRO_PETALS[FRONT].yaw = Math.PI / 2
MACRO_PETALS[FRONT].elev = 0.2
/** the petal that wilts and hardens into glass (points +x) */
export const WILT = 0
MACRO_PETALS[WILT].yaw = 0
MACRO_PETALS[WILT].elev = 0.22

const head = new THREE.Matrix4().makeRotationX(HEAD_TILT)

/**
 * World point on a petal surface (rest pose, no drag rotation), lifted along the
 * surface normal by `lift` metres. `wilt` accounts for the curl the petal will have.
 */
export function onPetal(i: number, u: number, v: number, lift = 0, wilt = 0) {
  const spec = MACRO_PETALS[i]
  const p = petalPoint(spec, u, v, new THREE.Vector3(), wilt)
  // finite-difference normal of the (possibly wilted) surface
  const pu = petalPoint(spec, Math.min(1, u + 0.01), v, new THREE.Vector3(), wilt).sub(p)
  const pv = petalPoint(spec, u, Math.min(1, v + 0.01), new THREE.Vector3(), wilt).sub(p)
  const n = new THREE.Vector3().crossVectors(pv, pu).normalize()
  if (n.y < 0) n.negate()
  p.addScaledVector(n, lift)
  const m = head.clone().multiply(petalMatrix(spec))
  return p.applyMatrix4(m)
}

export const CENTER = new THREE.Vector3(0, 0, 0)

/**
 * "In the hand": the wilting petal leaves the flower and hangs before the viewer upside down —
 * base at the top, tip pointing to the ground, upper surface facing the camera (+z).
 */
export const HELD_BASE = new THREE.Vector3(1.25, 4.45, 2.6)
export const HELD = new THREE.Matrix4()
  .makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0))
  .setPosition(HELD_BASE)

/** rest pose of the wilting petal in world space (before any drag rotation) */
export const WILT_REST = head.clone().multiply(petalMatrix(MACRO_PETALS[WILT]))

/** world point on the held petal, lifted along its (wilted) surface normal */
export function onHeld(u: number, v: number, lift = 0, wilt = 1) {
  const spec = MACRO_PETALS[WILT]
  const p = petalPoint(spec, u, v, new THREE.Vector3(), wilt)
  const pu = petalPoint(spec, Math.min(1, u + 0.01), v, new THREE.Vector3(), wilt).sub(p)
  const pv = petalPoint(spec, u, Math.min(1, v + 0.01), new THREE.Vector3(), wilt).sub(p)
  const n = new THREE.Vector3().crossVectors(pv, pu).normalize()
  if (n.y < 0) n.negate()
  p.addScaledVector(n, lift)
  return p.applyMatrix4(HELD)
}
