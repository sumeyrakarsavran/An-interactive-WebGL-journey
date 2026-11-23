import * as THREE from 'three'

/** Valley floor height. Shared by ground mesh, grass placement, camera path and hero flower. */
export function groundHeight(x: number, z: number) {
  const valley = 14 * (1 - Math.exp(-(x * x) / 2600))
  return (
    0.45 * Math.sin(x * 0.07) * Math.cos(z * 0.05) +
    0.18 * Math.sin(x * 0.19 + z * 0.13) +
    0.06 * Math.sin(x * 0.9 + z * 0.7) +
    valley +
    // ground rises gently behind the start position
    Math.max(0, z - 30) * 0.06
  )
}

/** Hero flower anchor — the world is composed around this point. */
export const HERO_BASE = new THREE.Vector3(0, groundHeight(0, 0), 0)
export const HERO_STEM_HEIGHT = 0.5
