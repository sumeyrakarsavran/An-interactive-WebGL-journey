'use client'
import { useEffect, useMemo } from 'react'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { noiseGLSL } from '@/shaders/chunks'
import { MIRROR } from './layout'

/** Endless dark floor: polished stone with a soft, blurred reflection (plain gloss on low tier). */
const floorShader = {
  name: 'NafsFloor',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vProj;
    varying vec3 vWorld;
    void main() {
      vProj = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec4 vProj;
    varying vec3 vWorld;
    void main() {
      vec2 p = vProj.xy / vProj.w;
      // a soft 9-tap blur: honed stone, not glass
      float b = 0.006;
      vec3 r = texture2D(tDiffuse, p).rgb * 0.2;
      r += (texture2D(tDiffuse, p + vec2(b, 0.0)).rgb + texture2D(tDiffuse, p - vec2(b, 0.0)).rgb
          + texture2D(tDiffuse, p + vec2(0.0, b)).rgb + texture2D(tDiffuse, p - vec2(0.0, b)).rgb) * 0.12;
      r += (texture2D(tDiffuse, p + vec2(b, b) * 1.6).rgb + texture2D(tDiffuse, p - vec2(b, b) * 1.6).rgb
          + texture2D(tDiffuse, p + vec2(b, -b) * 1.6).rgb + texture2D(tDiffuse, p - vec2(b, -b) * 1.6).rgb) * 0.08;
      vec3 V = normalize(cameraPosition - vWorld);
      float fres = 0.18 + 0.82 * pow(1.0 - max(V.y, 0.0), 4.0);
      // the floor dissolves into the void away from the mirror
      float d = length(vWorld.xz - vec2(0.0, 3.0));
      float fade = 1.0 - smoothstep(10.0, 60.0, d);
      vec3 col = vec3(0.012) + r * fres * 0.75 * fade;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

export function Floor({ reflective }: { reflective: boolean }) {
  const reflector = useMemo(() => {
    if (!reflective) return null
    const r = new Reflector(new THREE.PlaneGeometry(400, 400), {
      textureWidth: 512,
      textureHeight: 512,
      clipBias: 0.003,
      multisample: 0,
      shader: floorShader,
    })
    r.rotation.x = -Math.PI / 2
    return r
  }, [reflective])
  useEffect(
    () => () => {
      reflector?.dispose()
      reflector?.geometry.dispose()
    },
    [reflector],
  )
  if (reflector) return <primitive object={reflector} />
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#121212" roughness={0.35} metalness={0.6} />
    </mesh>
  )
}

/** The back and edges of the mirror: dark stone, almost invisible. */
export function Slab() {
  return (
    <mesh position={[MIRROR.center.x, MIRROR.center.y, -0.07]}>
      <boxGeometry args={[MIRROR.width + 0.08, MIRROR.height + 0.08, 0.12]} />
      <meshStandardMaterial color="#1a1918" roughness={0.6} metalness={0.2} />
    </mesh>
  )
}

/* ------------------------------------------------------------------------ */

const mistVert = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const mistFrag = /* glsl */ `
${noiseGLSL}
uniform float uTime;
uniform vec3 uFogColor;
uniform float uAlpha;
uniform float uSeed;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz * 0.12 + vec2(uTime * 0.012, uTime * 0.006) + uSeed;
  float n = fbm(p) * fbm(p * 2.3 - uTime * 0.01);
  // fade with distance from the mirror so the hall dissolves into nothing
  float d = length(vWorld.xz - vec2(0.0, 3.0));
  float a = smoothstep(0.08, 0.32, n) * uAlpha * (1.0 - smoothstep(6.0, 38.0, d));
  gl_FragColor = vec4(uFogColor * a, a);
}
`

/** Low drifting mist pooled on the floor — gives the void depth. */
export function Mist() {
  const layers = useMemo(
    () =>
      [0.06, 0.22, 0.45].map(
        (y, i) =>
          [
            y,
            new THREE.ShaderMaterial({
              vertexShader: mistVert,
              fragmentShader: mistFrag,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              uniforms: {
                uTime: wind.uTime,
                uFogColor: atmosphere.uFogColor,
                uAlpha: { value: 0.22 - i * 0.05 },
                uSeed: { value: i * 7.3 },
              },
            }),
          ] as const,
      ),
    [],
  )
  useEffect(() => () => layers.forEach(([, m]) => m.dispose()), [layers])
  return (
    <group>
      {layers.map(([y, m], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[0, y, 0]} material={m}>
          <planeGeometry args={[90, 90]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------------ */

const shaftVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const shaftFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  // clamp: pow() of a tiny negative at the plane edge is NaN, which bloom would smear across the frame
  float x = clamp(1.0 - abs(vUv.x - 0.5) * 2.0, 0.0, 1.0);
  float a = pow(x, 2.5) * smoothstep(0.0, 0.7, vUv.y) * uAlpha;
  gl_FragColor = vec4(uColor * a, a);
}
`

/** A faint column of light falling on the mirror from far above. */
export function LightShaft() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shaftVert,
        fragmentShader: shaftFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color('#c9d0d4') }, uAlpha: { value: 0.07 } },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  return (
    <group position={[0, 0, 1.2]}>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} rotation-y={r} position={[0, 9, 0]} material={material}>
          <planeGeometry args={[3.2, 18]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------------ */

const glowFrag = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float r = length((vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.6));
  float a = pow(clamp(1.0 - r * 2.0, 0.0, 1.0), 2.2);
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * A pale, distant opening behind the visitor. The camera never looks back at it, but the
 * mirror does: it is what the reflected self is seen against.
 */
export function BackGlow() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shaftVert,
        fragmentShader: glowFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color('#9aa2a6').multiplyScalar(1.4) } },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh position={[0, 3, 34]} rotation-y={Math.PI} material={material}>
      <planeGeometry args={[46, 30]} />
    </mesh>
  )
}
