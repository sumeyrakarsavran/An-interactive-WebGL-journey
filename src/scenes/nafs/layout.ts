import * as THREE from 'three'

/** The single mirror of the Nafs hall: a frameless slab standing on an endless dark floor. */
export const MIRROR = {
  width: 1.9,
  height: 3.4,
  bottom: 0.12,
  /** world position of the mirror surface centre (facing +z) */
  center: new THREE.Vector3(0, 0.12 + 3.4 / 2, 0),
}

/** chapter progress window in which the mirror can be polished */
export const POLISH_FROM = 0.55
export const POLISH_TO = 0.88

/** layer only the mirror's reflection camera renders (the visitor's reflected self) */
export const REFLECTION_LAYER = 1
