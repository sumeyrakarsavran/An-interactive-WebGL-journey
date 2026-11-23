'use client'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL } from '@/shaders/chunks'
import { DUNES_GLSL, piles } from './dunes'

/**
 * The desert floor. A polar grid follows the camera (dense underfoot, sparse at the horizon);
 * the height, normals, ripples and long raymarched shadows all come from the analytic dune
 * function per pixel, so lighting quality does not depend on mesh density.
 */
const vert = /* glsl */ `
${DUNES_GLSL}
uniform vec3 uCenter;
varying vec3 vWorld;
void main() {
  vec2 xz = position.xz + uCenter.xz;
  vWorld = vec3(xz.x, groundH(xz), xz.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`

const frag = (steps: number) => /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
${DUNES_GLSL}
uniform vec2 uWindDir;
uniform float uTime;
uniform vec3 uSandA;
uniform vec3 uSandB;
varying vec3 vWorld;

void main() {
  vec2 p = vWorld.xz;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;

  float eps = max(0.04, dist * 0.003);
  float h0 = groundH(p);
  vec3 N = normalize(vec3(h0 - groundH(p + vec2(eps, 0.0)), eps, h0 - groundH(p + vec2(0.0, eps))));

  // wind ripples: crests across the wind, bent by noise, only near (they would alias far away)
  float near = 1.0 - smoothstep(6.0, 40.0, dist);
  float flatness = smoothstep(0.75, 0.95, N.y); // ("flat" is reserved in GLSL 3)
  float ph = dot(p, uWindDir) * 7.5 + vnoise(p * 0.55) * 5.0 + vnoise(p * 2.1) * 0.8;
  N = normalize(N + vec3(uWindDir.x, 0.0, uWindDir.y) * (-sin(ph)) * 0.22 * near * flatness);

  // long shadows: march toward the sun through the height field
  vec3 L = uSunDir;
  float sh = 1.0;
  float tr = 0.25;
  vec3 o = vWorld + vec3(0.0, 0.04, 0.0);
  for (int i = 0; i < ${steps}; i++) {
    vec3 q = o + L * tr;
    float hq = i < 5 ? groundH(q.xz) : dunes(q.xz);
    float dh = q.y - hq;
    if (dh < 0.0) { sh = 0.0; break; }
    sh = min(sh, 9.0 * dh / tr);
    tr *= 1.42;
    if (tr > 500.0) break;
  }
  sh = clamp(sh, 0.0, 1.0);

  vec3 alb = mix(uSandA, uSandB, vnoise(p * 0.07)) * (0.93 + 0.07 * vnoise(p * 3.3));
  // ripple troughs collect finer, darker grains
  alb *= 0.94 + 0.06 * cos(ph) * near;
  float ndl = max(dot(N, L), 0.0);
  vec3 sky = uAmbient * (0.55 + 0.45 * N.y);
  vec3 col = alb * (sky + uSunColor * ndl * sh * 1.7 * (0.25 + 0.75 * uSunUp));
  // shadowed sand takes the blue of the sky
  col += alb * uZenith * 0.25 * (1.0 - sh) * N.y;

  // glints: single grains catching the sun
  float g = hash12(floor(p * 60.0));
  vec3 Hh = normalize(L + V);
  col += uSunColor * step(0.988, g) * pow(max(dot(N, Hh), 0.0), 40.0) * 2.5 * sh * near;

  // never let a stray NaN reach bloom (it would smear across the whole frame)
  gl_FragColor = vec4(max(applyFog(col, vWorld), vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function polarGrid() {
  const rings: number[] = []
  for (let i = 0; i < 20; i++) rings.push(i * 0.3)
  let r = 6
  while (r < 900) {
    rings.push(r)
    r *= 1.035
  }
  const SEG = 180
  const pos: number[] = []
  const idx: number[] = []
  rings.forEach((rr) => {
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2
      pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr)
    }
  })
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j
      const b = i * SEG + ((j + 1) % SEG)
      const c = a + SEG
      const d = b + SEG
      idx.push(a, b, c, b, d, c) // counter-clockwise seen from above
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

export function Desert({ shadowSteps }: { shadowSteps: number }) {
  const geometry = useMemo(polarGrid, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag(shadowSteps),
        uniforms: {
          ...wind,
          ...atmosphere,
          ...piles,
          uCenter: { value: new THREE.Vector3() },
          uSandA: { value: new THREE.Color('#c89a63') },
          uSandB: { value: new THREE.Color('#d8b07a') },
        },
      }),
    [shadowSteps],
  )
  useFrame(({ camera }) => material.uniforms.uCenter.value.copy(camera.position))
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
