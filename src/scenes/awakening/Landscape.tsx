'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL } from '@/shaders/chunks'
import { mulberry32 } from '@/utils/device'
import { groundHeight } from './terrain'

/* ---------------------------------- Sky ---------------------------------- */

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const skyFrag = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
uniform float uStars;
uniform float uTime;
varying vec3 vDir;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  vec3 horizon = fogColorFor(d);
  vec3 col = mix(horizon, uZenith, smoothstep(-0.02, 0.55, e));
  // warm band hugging the horizon, strongest toward the sun
  float band = exp(-abs(e - 0.01) * 22.0);
  float toward = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 3.0);
  col += uSunColor * band * toward * (0.25 + 0.6 * uSunUp);
  // sun disc + glow
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.5 + pow(s, 8.0) * 0.12) * (0.3 + uSunUp);
  // very faint high cloud streaks
  float c = fbm(vec2(d.x / max(e + 0.25, 0.05), d.z / max(e + 0.25, 0.05)) * 1.6 + vec2(0.0, 0.01));
  col = mix(col, horizon * 1.08, smoothstep(0.55, 0.85, c) * smoothstep(0.0, 0.25, e) * 0.35);

  // stars (only where a chapter asks for them)
  if (uStars > 0.001) {
    float g = 260.0;
    vec3 cell = floor(d * g);
    float h = hash13(cell);
    if (h > 0.9965) {
      vec3 centre = normalize((cell + 0.5) / g);
      float dist = length(d - centre) * g;
      float tw = 0.65 + 0.35 * sin(uTime * (0.7 + h * 4.0) + h * 40.0);
      float mag = pow(fract(h * 977.0), 3.0) * 2.4 + 0.25;
      col += vec3(0.9, 0.93, 1.0) * smoothstep(0.42, 0.0, dist) * tw * mag * uStars * smoothstep(0.0, 0.18, e);
    }
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/**
 * Sky dome. Re-centred on whichever camera is rendering it (main view, mirror, lake), so
 * planar reflections see a correct sky. Optional star field via `stars`.
 */
export function Sky({ stars }: { stars?: { value: number } }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { ...atmosphere, uTime: wind.uTime, uStars: stars ?? { value: 0 } },
      }),
    [stars],
  )
  const mesh = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), material)
    m.renderOrder = -10
    m.frustumCulled = false
    m.onBeforeRender = (_r, _s, camera) => {
      m.position.copy(camera.position)
      m.updateMatrixWorld()
    }
    return m
  }, [material])
  useEffect(() => () => {
    mesh.geometry.dispose()
    material.dispose()
  }, [mesh, material])
  return <primitive object={mesh} />
}

/* --------------------------------- Ground -------------------------------- */

const groundVert = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal2;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal2 = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const groundFrag = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
uniform vec3 uSoil;
uniform vec3 uMoss;
varying vec3 vWorld;
varying vec3 vNormal2;
void main() {
  float n = fbm(vWorld.xz * 0.35);
  float n2 = vnoise(vWorld.xz * 3.0);
  vec3 col = mix(uSoil, uMoss, smoothstep(0.35, 0.7, n));
  col *= 0.8 + 0.25 * n2;
  vec3 N = normalize(vNormal2);
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 lit = col * (uAmbient * 0.9 + uSunColor * ndl * 0.6 * uSunUp);
  gl_FragColor = vec4(applyFog(lit, vWorld), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function Ground() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(420, 420, 220, 220)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(p.getX(i), p.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        uniforms: {
          ...atmosphere,
          uSoil: { value: new THREE.Color('#2a241b') },
          uMoss: { value: new THREE.Color('#3b3f2b') },
        },
      }),
    [],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  return <mesh geometry={geometry} material={material} />
}

/* ------------------------------- Mountains ------------------------------- */

const ridgeVert = /* glsl */ `
varying float vY;
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vY = uv.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const ridgeFrag = /* glsl */ `
${atmosphereGLSL}
uniform vec3 uRidge;
uniform float uHaze;
varying float vY;
varying vec3 vWorld;
void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  vec3 fogC = fogColorFor(dir);
  // valley mist pooled at the foot of each ridge
  float mist = 1.0 - smoothstep(0.0, 0.55, vY);
  float k = clamp(uHaze + mist * (1.0 - uHaze) * 0.85, 0.0, 1.0);
  vec3 col = mix(uRidge * (0.6 + 0.4 * uSunUp), fogC, k);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function ridgeGeometry(seed: number, width: number, height: number, segments = 260) {
  const r = mulberry32(seed)
  const phases = Array.from({ length: 6 }, () => r() * Math.PI * 2)
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = (t - 0.5) * width
    let y = 0
    let amp = 1
    let f = 2.2
    for (let k = 0; k < 6; k++) {
      y += Math.abs(Math.sin(t * f * Math.PI + phases[k])) * amp
      amp *= 0.5
      f *= 2.1
    }
    y = (y / 1.9) * height
    pos.push(x, -30, 0, x, y, 0)
    uv.push(t, 0, t, 1)
    if (i < segments) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

const RIDGES = [
  { z: -150, w: 900, h: 22, haze: 0.42, color: '#2f3329', seed: 11 },
  { z: -260, w: 1300, h: 48, haze: 0.62, color: '#3a3f3a', seed: 23 },
  { z: -420, w: 1800, h: 90, haze: 0.78, color: '#454c4c', seed: 37 },
]

export function Mountains() {
  const items = useMemo(
    () =>
      RIDGES.map((r) => ({
        z: r.z,
        geometry: ridgeGeometry(r.seed, r.w, r.h),
        material: new THREE.ShaderMaterial({
          vertexShader: ridgeVert,
          fragmentShader: ridgeFrag,
          side: THREE.DoubleSide,
          uniforms: { ...atmosphere, uRidge: { value: new THREE.Color(r.color) }, uHaze: { value: r.haze } },
        }),
      })),
    [],
  )
  useEffect(() => () => items.forEach((i) => (i.geometry.dispose(), i.material.dispose())), [items])
  return (
    <group>
      {items.map((it, k) => (
        <mesh key={k} geometry={it.geometry} material={it.material} position={[0, 0, it.z]} renderOrder={-5 + k} />
      ))}
    </group>
  )
}
