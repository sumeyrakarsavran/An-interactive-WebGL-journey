import * as THREE from 'three'

/**
 * Mutable, render-loop-only camera state (no React re-renders).
 * CameraRig writes it every frame; scenes, post-FX and the threshold veil read it.
 */
export const cameraState = {
  /** damped position over the whole journey */
  global: 0,
  /** damped progress inside the current chapter */
  t: 0,
  chapterId: 'awakening',
  /** current look-at target (world) — DOF focuses here */
  target: new THREE.Vector3(),
}
