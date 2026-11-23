import * as THREE from 'three'
import type { CameraPath } from '@/camera/types'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/**
 * Nafs — locked-off, symmetric, uncomfortable.
 * Out of the silver light the camera is already at the glass → it backs away until the mirror
 * stands alone in the void → circles it once, keeping its distance (the questions) → returns to
 * stand in front of it and stays (polishing) → walks into the surface, now water.
 */
export const nafsPath: CameraPath = {
  position: [
    v(0, 1.8, 1.0),
    v(0.25, 1.8, 6.2),
    v(0, 2.3, 13.5),
    v(5.8, 1.75, 9.2),
    v(-3.8, 1.66, 5.6),
    v(0, 1.62, 3.1),
    v(0, 1.62, 2.5),
    v(0, 1.65, 1.0),
    v(0, 1.66, -0.3),
  ],
  target: [
    v(0, 1.8, 0),
    v(0, 1.75, 0),
    v(0, 1.6, 0),
    v(0, 1.7, 0),
    v(0, 1.72, 0),
    v(0, 1.66, 0),
    v(0, 1.66, 0),
    v(0, 1.66, 0),
    v(0, 1.66, -3),
  ],
  knots: [0, 0.12, 0.24, 0.36, 0.48, 0.57, 0.84, 0.92, 1],
  fov: [
    [0, 32],
    [0.24, 30],
    [0.48, 36],
    [0.57, 40],
    [0.84, 40],
    [1, 50],
  ],
  // no drifting during the polish — the mirror must stay where the hand is
  look: { yaw: 0.05, pitch: 0.03, fadeFrom: 0.5, fadeTo: 0.56 },
  handheld: 0.006,
  // the whole mirror (1.9 m + margin) must be reachable while polishing, even on a phone
  fit: [{ from: 0.5, to: 0.9, width: 2.5 }],
}
