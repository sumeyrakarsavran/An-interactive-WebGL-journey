import * as THREE from 'three'
import type { CameraPath } from '@/camera/types'
import { groundHeight } from '../awakening/terrain'
import { HEAD_WORLD } from '../awakening/heroLayout'

const above = (x: number, h: number, z: number) => new THREE.Vector3(x, groundHeight(x, z) + h, z)
const H = HEAD_WORLD

/** where the wanderer stands, on the rise ahead, facing the sun */
export const WANDERER = above(-7, 0, -27)

/**
 * Return — a rising crane shot.
 * Out of the dawn light, close to a new bud where the first flower stood → pulling back as it
 * opens → up over the grass to find the figure on the rise → a held, wide view (the word for
 * tomorrow) → rising toward the sun until the valley lies open below.
 */
export const returnPath: CameraPath = {
  position: [
    H.clone().add(new THREE.Vector3(0.02, 0.04, 0.22)),
    H.clone().add(new THREE.Vector3(0.12, 0.12, 0.7)),
    above(0.4, 0.85, 2.4),
    above(1.2, 2.2, 5.5),
    above(1.6, 4.8, 8.5),
    above(1.7, 5.6, 9.2),
    above(1.8, 6.0, 9.6),
    above(0.4, 13, 4),
    above(0, 21, -2),
  ],
  target: [
    H.clone(),
    H.clone().add(new THREE.Vector3(0, 0.02, 0)),
    H.clone().add(new THREE.Vector3(0, 0.2, -1.5)),
    WANDERER.clone().add(new THREE.Vector3(3.5, 1.5, 0)),
    WANDERER.clone().add(new THREE.Vector3(6, 1.6, -20)),
    new THREE.Vector3(-4, 4, -90),
    new THREE.Vector3(-3, 5, -100),
    new THREE.Vector3(0, 10, -220),
    new THREE.Vector3(0, 16, -320),
  ],
  knots: [0, 0.12, 0.26, 0.4, 0.55, 0.62, 0.82, 0.93, 1],
  fov: [
    [0, 30],
    [0.26, 36],
    [0.55, 42],
    [0.82, 46],
    [1, 52],
  ],
  look: { yaw: 0.06, pitch: 0.04, fadeFrom: 0.9, fadeTo: 0.97 },
  handheld: 0.01,
}
