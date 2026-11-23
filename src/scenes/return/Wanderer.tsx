'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL, windGLSL } from '@/shaders/chunks'
import { WANDERER } from './path'

/**
 * Someone who walked ahead, standing on the rise and facing the sunrise — seen only from
 * behind, faceless, an outline lit at the edges. Cloak and hair are pinned at the shoulders and
 * head and move with the shared WindField: a vertex shader, not a simulation.
 */
const bodyVert = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
// shared look: almost black, with a warm rim where the sun comes round the edges
const backlit = /* glsl */ `
vec3 backlit(vec3 N, vec3 W, float glow) {
  vec3 V = normalize(cameraPosition - W);
  float rim = pow(1.0 - abs(dot(N, V)), 2.2);
  float behind = pow(max(dot(-V, uSunDir), 0.0), 2.0);
  vec3 col = vec3(0.022, 0.02, 0.02) + uAmbient * 0.05;
  col += uSunColor * rim * (0.15 + 0.9 * behind);
  col += uSunColor * glow * behind * 0.6;
  // a figure against the light keeps its darkness: only half the haze
  return mix(col, applyFog(col, W), 0.5);
}
`
const bodyFrag = /* glsl */ `
${atmosphereGLSL}
${backlit}
varying vec3 vN;
varying vec3 vW;
void main() {
  gl_FragColor = vec4(backlit(normalize(vN), vW, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const clothVert = /* glsl */ `
${noiseGLSL}
${windGLSL}
uniform float uLength;   // how far the cloth hangs (metres)
uniform float uFlutter;
varying vec3 vN;
varying vec3 vW;
varying float vFree;
void main() {
  // uv.y = 1 at the pinned edge, 0 at the free end
  float free = pow(1.0 - uv.y, 1.4);
  vec3 p = position;
  vec4 root = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 w = windOffset(root.xyz);
  float t = uTime;
  float wave = sin(t * 5.2 - uv.y * 9.0 + uv.x * 2.0) * 0.5 + sin(t * 8.7 - uv.y * 15.0) * 0.25;
  vec3 world = (modelMatrix * vec4(p, 1.0)).xyz;
  world.x += w.x * free * uLength * 0.9;
  world.z += w.y * free * uLength * 0.9;
  world.y += length(w) * free * uLength * 0.25; // lifted a little by the gusts
  world += vec3(0.4, 0.15, 1.0) * wave * free * uFlutter * (0.4 + length(w));
  vW = world;
  vN = normalize(mat3(modelMatrix) * normal);
  vFree = free;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const clothFrag = /* glsl */ `
${atmosphereGLSL}
${backlit}
varying vec3 vN;
varying vec3 vW;
varying float vFree;
void main() {
  vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  // thin cloth lets the sun through toward its free edge
  gl_FragColor = vec4(backlit(N, vW, 0.18 + 0.25 * vFree), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function Wanderer() {
  const built = useMemo(() => {
    const body = new THREE.ShaderMaterial({ vertexShader: bodyVert, fragmentShader: bodyFrag, uniforms: { ...atmosphere } })
    const cloth = (length: number, flutter: number) =>
      new THREE.ShaderMaterial({
        vertexShader: clothVert,
        fragmentShader: clothFrag,
        side: THREE.DoubleSide,
        uniforms: { ...wind, ...atmosphere, uLength: { value: length }, uFlutter: { value: flutter } },
      })
    const cloakMat = cloth(1.3, 0.06)
    const hairMat = cloth(0.35, 0.03)

    const g = new THREE.Group()
    const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 14)
    const add = (geo: THREE.BufferGeometry, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], rotZ = 0) => {
      const m = new THREE.Mesh(geo, body)
      m.position.set(...pos)
      m.scale.set(...scale)
      m.rotation.z = rotZ
      g.add(m)
    }
    add(new THREE.SphereGeometry(0.105, 20, 14), [0, 1.64, 0], [0.9, 1.12, 1])
    add(cap(0.045, 0.08), [0, 1.5, 0])
    add(cap(0.17, 0.42), [0, 1.18, 0], [1.25, 1, 0.68])
    add(cap(0.15, 0.08), [0, 0.9, 0], [1.2, 1, 0.75])
    add(cap(0.068, 0.74), [-0.1, 0.47, 0])
    add(cap(0.068, 0.74), [0.1, 0.47, 0])
    add(cap(0.044, 0.56), [-0.27, 1.1, 0], [1, 1, 1], -0.09)
    add(cap(0.044, 0.56), [0.27, 1.1, 0], [1, 1, 1], 0.09)

    // cloak: pinned across the shoulders, hanging behind (toward the viewer, +z)
    const cloakGeo = new THREE.PlaneGeometry(0.62, 1.35, 12, 28)
    cloakGeo.translate(0, -0.675, 0)
    const cloak = new THREE.Mesh(cloakGeo, cloakMat)
    cloak.position.set(0, 1.44, 0.13)
    cloak.rotation.x = 0.06
    g.add(cloak)

    // hair: a few ribbons from the back of the head
    const hairGeo = new THREE.PlaneGeometry(0.035, 0.32, 1, 10)
    hairGeo.translate(0, -0.16, 0)
    for (let i = 0; i < 9; i++) {
      const h = new THREE.Mesh(hairGeo, hairMat)
      const a = (i / 8 - 0.5) * 1.6
      h.position.set(Math.sin(a) * 0.08, 1.7, 0.06 + Math.cos(a) * 0.03)
      h.rotation.set(0.25, a * 0.6, 0)
      g.add(h)
    }

    g.position.copy(WANDERER)
    g.rotation.y = 0.15 // turned a little toward the sun
    return { g, body, cloakMat, hairMat, cloakGeo, hairGeo }
  }, [])

  useEffect(
    () => () => {
      built.g.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      ;[built.body, built.cloakMat, built.hairMat].forEach((m) => m.dispose())
    },
    [built],
  )

  return <primitive object={built.g} />
}
