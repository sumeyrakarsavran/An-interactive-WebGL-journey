'use client'
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL } from '@/shaders/chunks'
import { mulberry32 } from '@/utils/device'

/**
 * Pollen / dust drifting in a box that travels with the camera (wrap-around in shader),
 * so density is constant along the whole path with a fixed particle budget.
 */
const vertex = /* glsl */ `
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform float uSize;
attribute vec4 aSeed;
varying float vAlpha;
varying vec3 vWorld;

void main() {
  float r = aSeed.w;
  vec3 drift = vec3(uWindDir.x, 0.05, uWindDir.y) * uTime * (0.12 + r * 0.25) * (0.4 + uWindStrength)
             + vec3(sin(uTime * 0.31 + r * 31.0) * 0.35, sin(uTime * 0.23 + r * 13.0) * 0.25, cos(uTime * 0.27 + r * 21.0) * 0.35);
  vec3 p = aSeed.xyz * uBox + drift;
  vec3 lo = uCenter - uBox * 0.5;
  vec3 f = fract((p - lo) / uBox);
  vec3 world = lo + f * uBox;
  // fade at the box faces so wrapping is invisible
  vec3 e = min(f, 1.0 - f);
  vAlpha = smoothstep(0.0, 0.12, min(min(e.x, e.y), e.z));
  vWorld = world;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_PointSize = uSize * (0.35 + r) / max(-mv.z, 0.05);
  // twinkle: some motes catch the light as they turn
  vAlpha *= 0.55 + 0.45 * sin(uTime * (1.0 + r * 3.0) + r * 50.0);
  gl_Position = projectionMatrix * mv;
}
`
const fragment = /* glsl */ `
${atmosphereGLSL}
varying float vAlpha;
varying vec3 vWorld;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  vec3 V = normalize(vWorld - cameraPosition);
  float fwd = pow(max(dot(V, uSunDir), 0.0), 4.0);
  vec3 col = mix(vec3(0.95, 0.9, 0.8) * 0.5, uSunColor * 2.2, fwd);
  gl_FragColor = vec4(col * a * vAlpha, a * vAlpha);
}
`

interface PollenProps {
  count: number
  /** size of the wrap-around box that travels with the camera (metres) */
  box?: [number, number, number]
  /** how far ahead of the camera the box is centred */
  ahead?: number
  /** sprite size multiplier */
  size?: number
}

export function Pollen({ count, box = [16, 4, 22], ahead = 7, size = 14 }: PollenProps) {
  const { camera, gl } = useThree()
  const geometry = useMemo(() => {
    const r = mulberry32(77)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count * 4; i++) seeds[i] = r()
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    return g
  }, [count])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          ...wind,
          ...atmosphere,
          uCenter: { value: new THREE.Vector3() },
          uBox: { value: new THREE.Vector3(...box) },
          uSize: { value: 22 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useFrame(() => {
    const u = material.uniforms
    u.uCenter.value.set(camera.position.x, camera.position.y + 0.4, camera.position.z - ahead)
    u.uBox.value.set(...box)
    u.uSize.value = size * gl.getPixelRatio()
  })
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  return <points geometry={geometry} material={material} frustumCulled={false} />
}
