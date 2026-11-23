import * as THREE from 'three'

/**
 * A tiny dawn environment map for the dewdrop's reflections: a grey-green dome, a warm low
 * sun and a cool sky panel, prefiltered once with PMREM and cached for the whole visit.
 * Marked `userData.keep` so chapter sweeps never dispose it.
 */
let cached: THREE.Texture | null = null

export function getDawnEnv(gl: THREE.WebGLRenderer) {
  if (cached) return cached
  const scene = new THREE.Scene()
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.MeshBasicMaterial({ color: '#8b8f86', side: THREE.BackSide }))
  scene.add(dome)
  const sun = new THREE.Mesh(new THREE.CircleGeometry(3, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd6a0').multiplyScalar(6) }))
  sun.position.set(2, 0.6, -10)
  sun.lookAt(0, 0, 0)
  scene.add(sun)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c9d2d4').multiplyScalar(1.2) }))
  sky.position.set(0, 10, 0)
  sky.rotation.x = Math.PI / 2
  scene.add(sky)
  const pmrem = new THREE.PMREMGenerator(gl)
  const rt = pmrem.fromScene(scene, 0.02)
  pmrem.dispose()
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    m.geometry?.dispose()
    ;(m.material as THREE.Material | undefined)?.dispose()
  })
  cached = rt.texture
  cached.userData.keep = true
  return cached
}
