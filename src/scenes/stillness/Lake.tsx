'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { atmosphere } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL } from '@/shaders/chunks'
import { useNarrative } from '@/store/narrative'
import { CHAPTERS } from '@/content/chapters'
import { AmbientEngine } from '@/audio/AmbientEngine'

const LINES = CHAPTERS.find((c) => c.id === 'stillness')!.discoveries!

/** region of the lake simulated for ripples (world metres) */
export const SIM = { center: new THREE.Vector2(1.5, -16), size: 64, res: 256 }
const MAX_DROPS = 16

/* ----------------------------- ripple simulation ----------------------------- */

const simVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const simFrag = /* glsl */ `
uniform sampler2D tPrev;
uniform vec2 uTexel;
uniform float uDamp;
uniform vec4 uDrops[${MAX_DROPS}]; // uv, radius (uv), strength
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tPrev, vUv);
  float n = texture2D(tPrev, vUv + vec2(uTexel.x, 0.0)).r + texture2D(tPrev, vUv - vec2(uTexel.x, 0.0)).r
          + texture2D(tPrev, vUv + vec2(0.0, uTexel.y)).r + texture2D(tPrev, vUv - vec2(0.0, uTexel.y)).r;
  // discrete wave equation: next = avg(neighbours)*2 - previous
  float h = (n * 0.5 - c.g) * uDamp;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    vec4 d = uDrops[i];
    if (d.w == 0.0) continue;
    float r = length(vUv - d.xy);
    h += d.w * smoothstep(d.z, 0.0, r);
  }
  // soft edge so waves fade instead of bouncing off the simulation border
  vec2 e = min(vUv, 1.0 - vUv);
  h *= smoothstep(0.0, 0.06, min(e.x, e.y));
  gl_FragColor = vec4(h, c.r, 0.0, 1.0);
}
`

/* --------------------------------- water --------------------------------- */

const waterShader = {
  name: 'StillLake',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tSim: { value: null },
    uSimCenter: { value: SIM.center },
    uSimSize: { value: SIM.size },
    uTexel: { value: 1 / SIM.res },
    uBreeze: { value: 0.3 },
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color('#0b1218') },
    // atmosphere uniforms are re-linked to the shared objects after creation
    uSunDir: { value: new THREE.Vector3() },
    uSunColor: { value: new THREE.Color() },
    uFogColor: { value: new THREE.Color() },
    uZenith: { value: new THREE.Color() },
    uAmbient: { value: new THREE.Color() },
    uFogDensity: { value: 0 },
    uSunUp: { value: 0 },
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
    ${noiseGLSL}
    ${atmosphereGLSL}
    uniform sampler2D tDiffuse;
    uniform sampler2D tSim;
    uniform vec2 uSimCenter;
    uniform float uSimSize;
    uniform float uTexel;
    uniform float uBreeze;
    uniform float uTime;
    uniform vec3 uDeep;
    varying vec4 vProj;
    varying vec3 vWorld;

    void main() {
      vec2 suv = (vWorld.xz - uSimCenter) / uSimSize + 0.5;
      float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
      float hl = texture2D(tSim, suv - vec2(uTexel, 0.0)).r;
      float hr = texture2D(tSim, suv + vec2(uTexel, 0.0)).r;
      float hd = texture2D(tSim, suv - vec2(0.0, uTexel)).r;
      float hu = texture2D(tSim, suv + vec2(0.0, uTexel)).r;
      vec3 n = vec3((hl - hr) * 6.0 * inside, 1.0, (hd - hu) * 6.0 * inside);

      // the breath of wind on the surface; it fades to a perfect mirror when you are still
      float dist = length(cameraPosition - vWorld);
      float far = 1.0 - smoothstep(20.0, 160.0, dist);
      vec2 w = vec2(vnoise(vWorld.xz * 0.9 + vec2(uTime * 0.35, 0.0)), vnoise(vWorld.xz * 0.9 + vec2(7.0, -uTime * 0.3))) - 0.5;
      vec2 w2 = vec2(vnoise(vWorld.xz * 3.1 - uTime * 0.6), vnoise(vWorld.xz * 3.1 + 11.0 + uTime * 0.5)) - 0.5;
      n.xz += (w + w2 * 0.4) * uBreeze * far;
      n = normalize(n);

      vec3 V = normalize(cameraPosition - vWorld);
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
      vec2 p = vProj.xy / vProj.w + n.xz * 0.05;
      vec3 refl = texture2D(tDiffuse, p).rgb;
      // water reflects strongly at grazing angles, shows its depth when looked into
      vec3 col = mix(uDeep + uAmbient * 0.08, refl, clamp(0.35 + fres * 0.9, 0.0, 1.0));
      gl_FragColor = vec4(max(applyFog(col, vWorld), vec3(0.0)), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

/** shared controls written by the scene */
export const lakeState = {
  breeze: 0.3,
  /** wave damping per step — lower when the visitor is still, so the surface settles */
  damp: 0.986,
  drops: [] as Array<{ x: number; z: number; r: number; s: number }>,
}

export function addDrop(x: number, z: number, r = 0.35, s = 0.6) {
  if (lakeState.drops.length < MAX_DROPS) lakeState.drops.push({ x, z, r, s })
  AmbientEngine.ping(Math.min(1, s * 1.2))
}

export function Lake({ quality, active }: { quality: 'low' | 'medium' | 'high'; active: boolean }) {
  const { gl } = useThree()
  const discover = useNarrative((s) => s.discover)

  const sim = useMemo(() => {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }
    const rt = [new THREE.WebGLRenderTarget(SIM.res, SIM.res, opts), new THREE.WebGLRenderTarget(SIM.res, SIM.res, opts)]
    const material = new THREE.ShaderMaterial({
      vertexShader: simVert,
      fragmentShader: simFrag,
      uniforms: {
        tPrev: { value: null },
        uTexel: { value: new THREE.Vector2(1 / SIM.res, 1 / SIM.res) },
        uDamp: { value: 0.986 },
        uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
      },
    })
    const scene = new THREE.Scene()
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    return { rt, material, scene, cam, i: 0, acc: 0 }
  }, [])

  const water = useMemo(() => {
    const size = quality === 'low' ? 512 : 1024
    const r = new Reflector(new THREE.PlaneGeometry(2400, 2400), {
      textureWidth: size,
      textureHeight: Math.round(size * 0.6),
      clipBias: 0.002,
      multisample: 0,
      shader: waterShader,
    })
    r.rotation.x = -Math.PI / 2
    const u = (r.material as THREE.ShaderMaterial).uniforms
    for (const k of Object.keys(atmosphere) as Array<keyof typeof atmosphere>) u[k] = atmosphere[k]
    return { r, u }
  }, [quality])

  useEffect(() => {
    // start from a flat lake
    const prev = gl.getRenderTarget()
    const prevColor = gl.getClearColor(new THREE.Color())
    const prevAlpha = gl.getClearAlpha()
    gl.setClearColor(0x000000, 0)
    for (const t of sim.rt) {
      gl.setRenderTarget(t)
      gl.clear()
    }
    gl.setClearColor(prevColor, prevAlpha)
    gl.setRenderTarget(prev)
    return () => {
      sim.rt.forEach((t) => t.dispose())
      sim.material.dispose()
      sim.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    }
  }, [gl, sim])
  useEffect(() => () => {
    water.r.dispose()
    water.r.geometry.dispose()
  }, [water])

  useFrame((state, dt) => {
    if (!active) return
    // fixed-rate steps keep wave speed independent of frame rate
    sim.acc = Math.min(sim.acc + dt, 1 / 20)
    const step = 1 / 60
    const drops = sim.material.uniforms.uDrops.value as THREE.Vector4[]
    while (sim.acc >= step) {
      sim.acc -= step
      for (let i = 0; i < MAX_DROPS; i++) {
        const d = lakeState.drops[i]
        if (d) {
          const u = (d.x - SIM.center.x) / SIM.size + 0.5
          const v = (d.z - SIM.center.y) / SIM.size + 0.5 // same mapping the water shader reads with
          drops[i].set(u, v, d.r / SIM.size, d.s)
        } else drops[i].set(0, 0, 0, 0)
      }
      lakeState.drops.length = 0
      sim.material.uniforms.uDamp.value = lakeState.damp
      const read = sim.rt[sim.i]
      const write = sim.rt[1 - sim.i]
      sim.material.uniforms.tPrev.value = read.texture
      const prev = gl.getRenderTarget()
      gl.setRenderTarget(write)
      gl.render(sim.scene, sim.cam)
      gl.setRenderTarget(prev)
      sim.i = 1 - sim.i
    }
    water.u.tSim.value = sim.rt[sim.i].texture
    water.u.uTime.value = state.clock.elapsedTime
    water.u.uBreeze.value = lakeState.breeze
  })

  // drops are placed in world xz (e.point), never in the plane's own uv
  const touched = useRef(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!active) return
    addDrop(e.point.x, e.point.z, 0.5, 0.9)
    if (!touched.current) {
      touched.current = true
      discover('stillness.touch', LINES['stillness.touch'])
    }
  }
  const last = useRef(0)
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!active || e.buttons === 0) return
    const now = performance.now()
    if (now - last.current < 90) return
    last.current = now
    addDrop(e.point.x, e.point.z, 0.35, 0.45)
  }

  return <primitive object={water.r} onPointerDown={onDown} onPointerMove={onMove} />
}
