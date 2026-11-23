import * as THREE from 'three'
import type { CameraPath } from '@/camera/types'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/**
 * Stillness — almost static.
 * Low over the water in the last of the rain → a slow glide toward the tree → a long pause
 * (the chapter rewards not moving) → the gaze sinks to the tree's reflection → the camera
 * lowers onto the mirrored night sky, where up and down trade places.
 */
export const stillnessPath: CameraPath = {
  position: [
    v(0, 0.9, 9),
    v(0.5, 1.1, 1),
    v(1.2, 1.3, -9),
    v(1.8, 1.4, -17),
    v(2.0, 1.4, -19.5),
    v(2.4, 1.0, -25),
    v(2.6, 0.4, -29),
    v(2.7, 0.07, -30.5),
  ],
  target: [
    v(0, 0.25, -12),
    v(4, 1.4, -62),
    v(6, 3.0, -62),
    v(6.5, 4.0, -62),
    v(6.5, 3.6, -62),
    v(6, -3.5, -56),
    v(5, -9, -50),
    v(4.2, -14, -46),
  ],
  knots: [0, 0.12, 0.25, 0.36, 0.74, 0.86, 0.95, 1],
  fov: [
    [0, 44],
    [0.36, 38],
    [0.74, 36],
    [0.9, 46],
    [1, 56],
  ],
  look: { yaw: 0.05, pitch: 0.03, fadeFrom: 0.86, fadeTo: 0.92 },
  handheld: 0.008,
}
