'use client'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL } from '@/shaders/chunks'
import { mulberry32 } from '@/utils/device'
import { DUNES_GLSL, piles } from './dunes'
import { WALK_LINE } from './path'

/** scene-driven controls for the drifting sand */
export const sandState = {
  /** accumulated travel along the wind — it slows to a stop at the threshold */
  uFlow: { value: 0 },
  /** how hard the wind is taking the gathered piles right now */
  uErode: { value: 0 },
}

/* ======================= drifting sand (saltation) ======================= */

const driftVert = /* glsl */ `
${noiseGLSL}
${DUNES_GLSL}
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec3 uCenter;
uniform float uBox;
uniform float uFlow;     // accumulated travel along the wind (slows to a stop at the threshold)
uniform float uErode;    // how hard the wind is taking the gathered piles
attribute vec4 aSeed;
varying float vAlpha;
varying vec3 vWorld;

void main() {
  float r = aSeed.w;
  vec2 dir = uWindDir;
  vec2 perp = vec2(-dir.y, dir.x);
  // each grain travels along the wind; wrap inside a box that follows the camera
  vec2 base = (aSeed.xy - 0.5) * uBox;
  vec2 xz = base + dir * uFlow * (0.7 + r * 0.8);
  vec2 rel = xz - uCenter.xz;
  rel = mod(rel + uBox * 0.5, uBox) - uBox * 0.5;
  xz = uCenter.xz + rel;

  // saltation: low hops, most grains within a hand's height of the sand
  float hop = pow(aSeed.z, 3.0) * 0.45 + 0.01;
  float bounce = abs(sin(uFlow * 3.0 * (0.5 + r) + r * 20.0));
  float y = groundH(xz) + hop * bounce;

  // sand "snakes": density rides travelling bands of gusts
  float snake = smoothstep(0.42, 0.78, vnoise(xz * 0.09 - dir * uFlow * 0.35 + perp * 0.3));
  float a = snake * (0.25 + uWindStrength);
  // grains blown off the gathered piles
  float pileNear = pilesAt(xz);
  y += pileNear * 0.9 * r;
  a += clamp(pileNear, 0.0, 1.0) * uErode * 2.5;

  float edge = 1.0 - smoothstep(0.35, 0.5, length(rel) / uBox);
  vAlpha = clamp(a, 0.0, 1.0) * edge;

  // a streak along the wind: position.x runs along it, position.y is its thin height
  vec3 along = normalize(vec3(dir.x, 0.0, dir.y));
  float len = 0.06 + uWindStrength * 0.22;
  vec3 world = vec3(xz.x, y, xz.y) + along * position.x * len + vec3(0.0, position.y * 0.012, 0.0);
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const driftFrag = /* glsl */ `
${atmosphereGLSL}
varying float vAlpha;
varying vec3 vWorld;
void main() {
  vec3 V = normalize(vWorld - cameraPosition);
  float fwd = pow(max(dot(V, uSunDir), 0.0), 3.0);
  vec3 col = mix(vec3(0.78, 0.62, 0.42), uSunColor * 1.8, fwd);
  float a = vAlpha * 0.5;
  gl_FragColor = vec4(col * a, a);
}
`

export function SandDrift({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    const r = mulberry32(88)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = r()
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    g.instanceCount = count
    return g
  }, [count])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: driftVert,
        fragmentShader: driftFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          ...wind,
          ...atmosphere,
          ...piles,
          ...sandState,
          uCenter: { value: new THREE.Vector3() },
          uBox: { value: 34 },
        },
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

/* ============ dust on the horizon: "raising dust" (100:4), never horses ============ */

const dustVert = /* glsl */ `
${DUNES_GLSL}
uniform float uTime;
uniform vec3 uCenter;
attribute vec4 aPuff; // front index, offset along front, size, seed
varying vec2 vUv;
varying float vFade;
varying vec3 vWorld;
varying float vSeed;
void main() {
  float front = aPuff.x;
  float period = 26.0;
  float phase = fract((uTime + front * 9.0) / period);
  // a front sweeps across the far dunes from right to left
  float x = uCenter.x + 160.0 - phase * 320.0 + aPuff.y;
  float z = uCenter.z - 70.0 - front * 28.0 + sin(aPuff.w * 30.0) * 6.0;
  float y = dunes(vec2(x, z)) + aPuff.z * 0.35;
  vec3 c = vec3(x, y, z);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // the cloud trails behind its leading edge
  float trail = 1.0 + max(0.0, -aPuff.y) * 0.04;
  vec3 world = c + (right * position.x * trail + up * position.y) * aPuff.z;
  vUv = uv;
  vFade = smoothstep(0.0, 0.12, phase) * smoothstep(1.0, 0.85, phase);
  vWorld = world;
  vSeed = aPuff.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const dustFrag = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
uniform float uTime;
uniform float uAlpha;
varying vec2 vUv;
varying float vFade;
varying vec3 vWorld;
varying float vSeed;
void main() {
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;
  float n = fbm(vUv * 3.0 + vec2(uTime * 0.4, vSeed * 7.0));
  float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.7) * vFade * uAlpha;
  vec3 V = normalize(vWorld - cameraPosition);
  float fwd = pow(max(dot(V, uSunDir), 0.0), 4.0);
  vec3 col = mix(uFogColor * 1.05, uSunColor * 1.4, fwd * 0.7);
  gl_FragColor = vec4(applyFog(col, vWorld), a);
}
`

export function DustFronts() {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    g.setAttribute('uv', plane.getAttribute('uv'))
    const r = mulberry32(31)
    const puffs: number[] = []
    for (let f = 0; f < 3; f++) for (let k = 0; k < 12; k++) puffs.push(f, -k * 5 - r() * 4, 6 + r() * 9, r())
    g.setAttribute('aPuff', new THREE.InstancedBufferAttribute(new Float32Array(puffs), 4))
    g.instanceCount = puffs.length / 4
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { ...wind, ...atmosphere, ...piles, uCenter: { value: new THREE.Vector3() }, uAlpha: { value: 0.38 } },
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

/* ============ footprints: those who walked before; behind you they vanish ============ */

const printVert = /* glsl */ `
${DUNES_GLSL}
uniform vec3 uCam;
attribute vec4 aPrint; // x, z, heading, side
varying vec2 vUv;
varying float vAlpha;
varying vec3 vWorld;
void main() {
  float c = cos(aPrint.z), s = sin(aPrint.z);
  vec2 local = vec2(position.x * 0.12, position.y * 0.29);
  vec2 xz = aPrint.xy + vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  vec3 world = vec3(xz.x, groundH(xz) + 0.03, xz.y);
  // behind the walker the wind erases them; far ahead they are faint, older
  float behind = aPrint.y - uCam.z;
  vAlpha = (1.0 - smoothstep(0.5, 7.0, behind)) * (1.0 - smoothstep(25.0, 70.0, -behind));
  vUv = uv;
  if (aPrint.w > 0.0) vUv.x = 1.0 - vUv.x;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const printFrag = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
varying vec2 vUv;
varying float vAlpha;
varying vec3 vWorld;
void main() {
  // sole + heel, slightly turned out
  vec2 q = vUv - vec2(0.5, 0.5);
  float sole = length((q - vec2(0.03, 0.12)) * vec2(2.4, 1.6));
  float heel = length((q - vec2(-0.01, -0.27)) * vec2(2.8, 3.0));
  float d = min(sole, heel);
  float inside = smoothstep(0.55, 0.42, d);
  float rim = smoothstep(0.62, 0.52, d) - inside;
  // erosion breaks the edges up
  float n = vnoise(vWorld.xz * 18.0);
  float a = (inside * 0.55 + rim * 0.25) * vAlpha * (0.6 + 0.4 * n);
  vec3 col = mix(vec3(0.0), uSunColor * 0.25, rim);
  gl_FragColor = vec4(col, a);
}
`

export function Footprints() {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    g.setAttribute('uv', plane.getAttribute('uv'))
    const prints: number[] = []
    const line = new THREE.CatmullRomCurve3(WALK_LINE)
    const len = line.getLength()
    const stride = 0.72
    const p = new THREE.Vector3()
    const tan = new THREE.Vector3()
    for (let d = 3, k = 0; d < len - 2; d += stride, k++) {
      line.getPointAt(d / len, p)
      line.getTangentAt(d / len, tan)
      const side = k % 2 === 0 ? -1 : 1
      // rotate local +y (heel→toe) onto the walking direction
      const heading = Math.atan2(-tan.x, tan.z)
      // a walker drifts a little from the ideal line
      const wander = Math.sin(d * 0.21) * 0.25
      prints.push(p.x - tan.z * 0.13 * side + wander, p.z + tan.x * 0.13 * side, heading, side)
    }
    g.setAttribute('aPrint', new THREE.InstancedBufferAttribute(new Float32Array(prints), 4))
    g.instanceCount = prints.length / 4
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: printVert,
        fragmentShader: printFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        // the terrain is a piecewise-linear approximation of the curved field: stay on top of it
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        uniforms: { ...atmosphere, ...piles, uCam: { value: new THREE.Vector3() } },
      }),
    [],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  useFrame(({ camera }) => material.uniforms.uCam.value.copy(camera.position))
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
}

/* ===================== the glint that is never reached ===================== */

const glintVert = /* glsl */ `
uniform float uTime;
uniform float uPx;
varying float vTw;
void main() {
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
  vTw = 0.55 + 0.45 * sin(uTime * 2.3) * sin(uTime * 3.7 + 1.0);
  gl_PointSize = uPx * (0.7 + 0.6 * vTw);
}
`
const glintFrag = /* glsl */ `
uniform vec3 uSunColor;
uniform float uFade;
varying float vTw;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  // a four-point star
  float star = max(smoothstep(0.06, 0.0, abs(c.x)) * smoothstep(0.5, 0.0, abs(c.y)),
                   smoothstep(0.06, 0.0, abs(c.y)) * smoothstep(0.5, 0.0, abs(c.x)));
  float a = (smoothstep(0.18, 0.0, d) + star * 0.7) * vTw * uFade;
  gl_FragColor = vec4(uSunColor * 3.0 * a, a);
}
`

export function Glint({ fade }: { fade: { value: number } }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glintVert,
        fragmentShader: glintFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: wind.uTime, uSunColor: atmosphere.uSunColor, uPx: { value: 18 }, uFade: fade },
      }),
    [fade],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  return <points geometry={geometry} material={material} frustumCulled={false} />
}
