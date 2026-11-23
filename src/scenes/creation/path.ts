import * as THREE from 'three'
import type { CameraPath } from '@/camera/types'
import { FRONT, onHeld, onPetal } from './layout'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const HELD_CENTER = onHeld(0.5, 0, 0, 1)

/**
 * Creation — insect-scale flight:
 * emerge low over a petal (out of the dewdrop's light) → glide along its veins toward the
 * inner cup → drop into the stamen forest → rise and pull back to see the whole design
 * (the drag/rotate moment) → one petal leaves the flower and is held before the viewer
 * while it wilts → its surface, hardened to glass, fills the frame.
 */
export const creationPath: CameraPath = {
  position: [
    onPetal(FRONT, 0.9, 0.06, 0.22),
    onPetal(FRONT, 0.66, 0.1, 0.3),
    onPetal(FRONT, 0.42, -0.05, 0.75),
    v(0.15, 1.75, 0.35),
    v(0.6, 2.7, 0.7),
    v(0.0, 7.0, 6.3),
    v(0.35, 7.3, 6.8),
    v(1.0, 3.4, 11.0),
    v(1.2, 3.0, 8.6),
    onHeld(0.5, 0.02, 0.14, 1),
  ],
  target: [
    onPetal(FRONT, 0.55, 0.0, 0.0),
    onPetal(FRONT, 0.28, 0.0, 0.35),
    v(0, 1.55, -0.6),
    v(-0.1, 0.85, -0.55),
    v(0, 0.8, 0),
    v(0, 0.3, 0),
    v(0, 0.3, 0),
    HELD_CENTER,
    HELD_CENTER,
    HELD_CENTER,
  ],
  knots: [0, 0.12, 0.22, 0.32, 0.43, 0.52, 0.64, 0.77, 0.89, 1],
  fov: [
    [0, 36],
    [0.25, 42],
    [0.38, 48],
    [0.52, 38],
    [0.7, 34],
    [0.9, 30],
    [1, 24],
  ],
  look: { yaw: 0.07, pitch: 0.05, fadeFrom: 0.86, fadeTo: 0.95 },
  handheld: 0.02,
}
