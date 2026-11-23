import type * as THREE from 'three'

/** Data-only camera description a chapter hands to the CameraRig. */
export interface CameraPath {
  position: THREE.Vector3[]
  target: THREE.Vector3[]
  /** scroll progress at which each control point is reached (same length as position) */
  knots: number[]
  /** [progress, fov] keys */
  fov: Array<[number, number]>
  /** amount of pointer look (radians) — faded out by `lookFade` */
  look: { yaw: number; pitch: number; fadeFrom: number; fadeTo: number }
  /** handheld drift amplitude (metres at 1m distance) */
  handheld: number
}
