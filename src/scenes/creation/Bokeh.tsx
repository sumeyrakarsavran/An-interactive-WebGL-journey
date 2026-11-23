'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { mulberry32 } from '@/utils/device'

/**
 * Out-of-focus morning: dew highlights and distant flowers rendered as soft,
 * camera-facing discs with a faint bokeh rim. One draw call, additive.
 */
const vertex = /* glsl */ `
uniform float uTime;
attribute vec4 aDisc;   // xyz centre, w radius
attribute vec4 aColor;  // rgb, intensity
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 c = aDisc.xyz + vec3(sin(uTime * 0.11 + aDisc.x), sin(uTime * 0.07 + aDisc.z) * 0.6, 0.0) * 0.4;
  vec3 world = c + (right * position.x + up * position.y) * aDisc.w;
  vUv = uv;
  // breathe gently so the field never looks frozen
  vColor = vec4(aColor.rgb, aColor.a * (0.8 + 0.2 * sin(uTime * 0.5 + aDisc.y * 3.0)));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const fragment = /* glsl */ `
uniform vec3 uSunColor;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.86, r);
  float rim = smoothstep(0.62, 0.92, r) * disc * 0.45;
  float a = (disc * 0.55 + rim) * vColor.a;
  vec3 col = vColor.rgb * mix(vec3(1.0), uSunColor, 0.35);
  gl_FragColor = vec4(col * a, a);
}
`

const PALETTE = ['#f2d29a', '#b9c29e', '#dcb2ab', '#f4ece0', '#cfd6c4']

export function Bokeh({ count = 90 }: { count?: number }) {
  const geometry = useMemo(() => {
    const r = mulberry32(404)
    const plane = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    g.setAttribute('uv', plane.getAttribute('uv'))
    const total = count + 10
    const disc = new Float32Array(total * 4)
    const color = new Float32Array(total * 4)
    const c = new THREE.Color()
    for (let i = 0; i < total; i++) {
      const big = i >= count // a few huge, faint blooms: other flowers far out of focus
      const ang = r() * Math.PI * 2
      const dist = big ? 34 + r() * 24 : 12 + r() * 30
      // mostly behind the flower and to the sides — where the camera looks
      const x = Math.cos(ang) * dist
      const z = -Math.abs(Math.sin(ang)) * dist * 0.9 - 4 + (r() < 0.2 ? dist * 0.7 : 0)
      const y = -4 + r() * 13
      disc.set([x, y, z, big ? 7 + r() * 6 : 0.4 + r() * r() * 2.6], i * 4)
      c.set(PALETTE[Math.floor(r() * PALETTE.length)])
      color.set([c.r, c.g, c.b, big ? 0.06 + r() * 0.05 : 0.12 + r() * 0.3], i * 4)
    }
    g.setAttribute('aDisc', new THREE.InstancedBufferAttribute(disc, 4))
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 4))
    g.instanceCount = total
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
        uniforms: { uTime: wind.uTime, uSunColor: atmosphere.uSunColor },
      }),
    [],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-4} />
}
