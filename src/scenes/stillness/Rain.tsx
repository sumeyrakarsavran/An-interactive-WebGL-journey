'use client'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL } from '@/shaders/chunks'
import { mulberry32 } from '@/utils/device'

/**
 * The sand that stopped in the air at the end of Zaman falls here as the first drops of rain.
 * Streaks in a box that follows the camera; intensity is driven by the scene.
 */
export const rainState = { uRain: { value: 1 } }

const vert = /* glsl */ `
uniform float uTime;
uniform float uRain;
uniform vec3 uCenter;
attribute vec4 aSeed;
varying float vA;
varying vec3 vWorld;
void main() {
  vec3 box = vec3(26.0, 14.0, 26.0);
  float speed = 9.0 + aSeed.w * 3.0;
  vec3 p = vec3(aSeed.x * box.x, aSeed.y * box.y - uTime * speed, aSeed.z * box.z);
  vec3 lo = uCenter - box * vec3(0.5, 0.2, 0.5);
  p = lo + mod(p - lo, box);
  // only some drops fall as the rain thins out
  vA = step(aSeed.w, uRain) * smoothstep(0.0, 0.6, p.y);
  vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
  vec3 world = p + right * position.x * 0.012 + vec3(0.0, position.y * 0.55, 0.0);
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const frag = /* glsl */ `
${atmosphereGLSL}
varying float vA;
varying vec3 vWorld;
void main() {
  float a = vA * 0.22;
  vec3 col = mix(uFogColor, uSunColor, 0.4) * 1.3;
  gl_FragColor = vec4(col * a, a);
}
`

export function Rain({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    const r = mulberry32(5)
    const s = new Float32Array(count * 4)
    for (let i = 0; i < s.length; i++) s[i] = r()
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(s, 4))
    g.instanceCount = count
    return g
  }, [count])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { ...wind, ...atmosphere, ...rainState, uCenter: { value: new THREE.Vector3() } },
      }),
    [],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  useFrame(({ camera }) => material.uniforms.uCenter.value.copy(camera.position))
  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
