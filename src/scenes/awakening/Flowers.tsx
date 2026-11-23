'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL, windGLSL } from '@/shaders/chunks'
import type { FieldData } from './field'

/** Small wildflower heads, one draw call. Their stems are blades inside <Grass/>. */

const vertex = /* glsl */ `
${noiseGLSL}
${windGLSL}
attribute vec4 aBase;   // xyz root, w stem height
attribute vec3 aParams; // scale, angle, colorIndex
varying vec2 vUv;
varying vec3 vWorld;
varying float vColor;

void main() {
  vec3 p = position * 0.022 * aParams.x;
  // tilt face slightly toward the open sky / camera side
  float tilt = 0.5 + 0.3 * sin(aParams.y * 3.0);
  float ct = cos(tilt), st = sin(tilt);
  p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
  float c = cos(aParams.y), s = sin(aParams.y);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

  vec2 w = windOffset(aBase.xyz) * aBase.w;
  // same rest lean as the stem blade in <Grass/> (0.18 * h along its facing)
  float lean = aBase.w * 0.18;
  vec3 tip = aBase.xyz + vec3(w.x + s * lean, aBase.w - dot(w, w) * 0.9 / max(aBase.w, 0.1), w.y + c * lean);
  vec3 world = tip + p;
  vWorld = world;
  vUv = uv;
  vColor = aParams.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`

const fragment = /* glsl */ `
${atmosphereGLSL}
uniform vec3 uColors[4];
uniform vec3 uCenter;
varying vec2 vUv;
varying vec3 vWorld;
varying float vColor;

void main() {
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;
  float a = atan(q.y, q.x);
  // five soft petals
  float petal = 0.55 + 0.45 * cos(a * 5.0);
  if (r > petal) discard;
  int ci = int(vColor + 0.5);
  vec3 col = uColors[0];
  if (ci == 1) col = uColors[1];
  if (ci == 2) col = uColors[2];
  if (ci == 3) col = uColors[3];
  col = mix(uCenter, col, smoothstep(0.12, 0.3, r));
  col *= 0.75 + 0.25 * smoothstep(petal, petal * 0.4, r);

  vec3 V = normalize(cameraPosition - vWorld);
  float back = pow(max(dot(-V, uSunDir), 0.0), 3.0);
  vec3 lit = col * (uAmbient * 1.3 + uSunColor * 0.3 * uSunUp) + col * uSunColor * back * (0.5 + 1.2 * uSunUp);
  gl_FragColor = vec4(applyFog(lit, vWorld), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function Flowers({ field }: { field: FieldData }) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    g.setAttribute('uv', plane.getAttribute('uv'))
    const n = field.flowerCount
    const base = new Float32Array(n * 4)
    const params = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const o = i * 7
      base.set([field.flowers[o], field.flowers[o + 1], field.flowers[o + 2], field.flowers[o + 3]], i * 4)
      params.set([field.flowers[o + 4], field.flowers[o + 5], field.flowers[o + 6]], i * 3)
    }
    g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 4))
    g.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 3))
    g.instanceCount = n
    return g
  }, [field])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.DoubleSide,
        uniforms: {
          ...wind,
          ...atmosphere,
          uColors: {
            value: [
              new THREE.Color('#efe6d4'), // ivory
              new THREE.Color('#c9a3a0'), // dusty rose
              new THREE.Color('#d8be87'), // pale gold
              new THREE.Color('#e6dccb'), // cream
            ],
          },
          uCenter: { value: new THREE.Color('#8a6a2e') },
        },
      }),
    [],
  )

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
