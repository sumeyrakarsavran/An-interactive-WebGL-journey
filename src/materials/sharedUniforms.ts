import * as THREE from 'three'

/**
 * WindField + Atmosphere — single shared uniform objects.
 * Every material spreads these into its uniforms, so the {value} objects are shared by
 * reference: updating them once per frame moves the whole world coherently.
 */
export const wind = {
  uTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(0.55, -0.83).normalize() },
  uWindStrength: { value: 0.55 },
  uPointer: { value: new THREE.Vector3(0, -999, 0) },
  uPointerForce: { value: 0 },
}

export const atmosphere = {
  uSunDir: { value: new THREE.Vector3(0, 0.02, -1).normalize() },
  uSunColor: { value: new THREE.Color('#f0c48e') },
  uFogColor: { value: new THREE.Color('#9aa09a') },
  uZenith: { value: new THREE.Color('#2f3a42') },
  uAmbient: { value: new THREE.Color('#5d6660') },
  uFogDensity: { value: 0.02 },
  uSunUp: { value: 0 },
}

/** JS mirror of the GLSL gust term — used to sway CPU-animated objects (hero flower). */
export function windAt(x: number, z: number, t: number) {
  const d = wind.uWindDir.value
  const s = wind.uWindStrength.value
  const g = Math.sin((x * d.x + z * d.y) * 0.15 - t * 1.1) * 0.5 + 0.5
  const gust = g * g
  const flutter = Math.sin(t * 2.7 + x * 3.1 + z * 2.3) * 0.12
  const amt = s * (0.35 + 0.9 * gust + flutter)
  return { x: d.x * amt, z: d.y * amt, gust }
}
