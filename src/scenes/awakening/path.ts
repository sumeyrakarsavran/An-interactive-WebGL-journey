import * as THREE from 'three'
import type { CameraPath } from '@/camera/types'
import { DEW_WORLD, HEAD_WORLD } from './heroLayout'
import { groundHeight } from './terrain'

const above = (x: number, h: number, z: number) => new THREE.Vector3(x, groundHeight(x, z) + h, z)
const D = DEW_WORLD

/**
 * Awakening: a slow dolly from a high, wide view of the valley down to knee height,
 * through the grass, ending inside a dewdrop on the hero flower.
 */
export const awakeningPath: CameraPath = {
  position: [
    above(0, 2.7, 34),
    above(1.3, 1.9, 25),
    above(-0.9, 1.2, 16),
    above(0.7, 0.86, 8.5),
    above(-0.25, 0.7, 3.4),
    above(0.06, 0.62, 1.05),
    D.clone().add(new THREE.Vector3(-0.03, 0.05, 0.25)),
    D.clone().add(new THREE.Vector3(-0.006, 0.01, 0.08)),
    D.clone().add(new THREE.Vector3(0.0, 0.0015, 0.024)),
    D.clone().add(new THREE.Vector3(0.0, 0.0004, 0.0078)),
  ],
  target: [
    new THREE.Vector3(0, 7, -220),
    new THREE.Vector3(0, 4, -140),
    new THREE.Vector3(0, 1.8, -60),
    new THREE.Vector3(0, 0.8, -14),
    HEAD_WORLD.clone().add(new THREE.Vector3(0, 0.05, -0.6)),
    HEAD_WORLD.clone(),
    D.clone().lerp(HEAD_WORLD, 0.3),
    D.clone(),
    D.clone(),
    D.clone(),
  ],
  knots: [0, 0.13, 0.26, 0.39, 0.52, 0.64, 0.75, 0.85, 0.93, 1],
  fov: [
    [0, 40],
    [0.45, 35],
    [0.7, 30],
    [0.88, 26],
    [1, 18],
  ],
  look: { yaw: 0.06, pitch: 0.04, fadeFrom: 0.8, fadeTo: 0.92 },
  handheld: 0.012,
}
