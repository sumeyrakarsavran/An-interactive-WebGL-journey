'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { noiseGLSL } from '@/shaders/chunks'
import { cameraState } from '@/camera/cameraState'
import { useNarrative } from '@/store/narrative'
import { useExperience } from '@/store/experience'
import { CHAPTERS } from '@/content/chapters'
import { lenis } from '@/hooks/useSmoothScroll'
import { MIRROR, POLISH_FROM, POLISH_TO, REFLECTION_LAYER } from './layout'

const LINES = CHAPTERS.find((c) => c.id === 'nafs')!.discoveries!
const RIPPLES = 8
const MASK = 256
/** share of polished area (permanent memory) at which the mirror opens into water */
const OPEN_AT = 0.3

const shader = {
  name: 'NafsMirror',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tClean: { value: null },
    tMemory: { value: null },
    uTime: { value: 0 },
    uWater: { value: 0 },
    uAspect: { value: MIRROR.width / MIRROR.height },
    uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vProj;
    varying vec2 vUv;
    void main() {
      vProj = textureMatrix * vec4(position, 1.0);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    ${noiseGLSL}
    uniform sampler2D tDiffuse;
    uniform sampler2D tClean;
    uniform sampler2D tMemory;
    uniform float uTime;
    uniform float uWater;
    uniform float uAspect;
    uniform vec4 uRipples[${RIPPLES}];
    varying vec4 vProj;
    varying vec2 vUv;

    void main() {
      vec2 p = vProj.xy / vProj.w;

      // what has been polished: the fresh stroke fades back, half of it is remembered
      float clean = max(texture2D(tClean, vUv).r, texture2D(tMemory, vUv).r * 0.55);
      clean = max(clean, uWater);
      float tarnish = 1.0 - clean;

      // ripples (water state)
      vec2 off = vec2(0.0);
      float ring = 0.0;
      for (int i = 0; i < ${RIPPLES}; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (age < 0.0 || age > 7.0 || r.w <= 0.0) continue;
        vec2 d = (vUv - r.xy) * vec2(uAspect, 1.0);
        float dist = length(d);
        float front = age * 0.2;
        float w = sin((dist - front) * 75.0) * exp(-age * 0.6) * smoothstep(0.14, 0.0, abs(dist - front)) * r.w;
        off += (d / max(dist, 1e-4)) * w * 0.01;
        ring += w;
      }
      off += uWater * vec2(sin(vUv.y * 22.0 + uTime * 1.2), cos(vUv.x * 17.0 + uTime * 0.9)) * 0.0012;

      // tarnish blurs the image before it hides it
      float b = tarnish * 0.014 + 0.0004;
      vec2 q = p + off;
      vec3 refl = texture2D(tDiffuse, q).rgb * 0.36
        + texture2D(tDiffuse, q + vec2(b, 0.0)).rgb * 0.16
        + texture2D(tDiffuse, q - vec2(b, 0.0)).rgb * 0.16
        + texture2D(tDiffuse, q + vec2(0.0, b)).rgb * 0.16
        + texture2D(tDiffuse, q - vec2(0.0, b)).rgb * 0.16;

      // an even breath-fog, a little uneven in density; old silver patina creeps in from the edges
      float n = fbm(vUv * vec2(3.0, 5.0));
      float speck = smoothstep(0.62, 0.8, fbm(vUv * vec2(90.0, 160.0)));
      float fromEdge = min(min(vUv.x, 1.0 - vUv.x) * 1.8, min(vUv.y, 1.0 - vUv.y));
      float patinaAmt = (1.0 - smoothstep(0.0, 0.22, fromEdge + (n - 0.5) * 0.12)) * 0.85 + speck * 0.35;
      vec3 breath = vec3(0.30, 0.31, 0.32) * (0.82 + 0.3 * n);
      vec3 patina = vec3(0.07, 0.072, 0.06) + vec3(0.06, 0.05, 0.03) * n;
      vec3 dirty = mix(breath, patina, clamp(patinaAmt, 0.0, 1.0));
      // a ghost of the reflection always shows through the fog
      vec3 col = mix(refl * 0.95, dirty + refl * 0.18, smoothstep(0.0, 1.0, tarnish));

      // water: a cooler, deeper surface with glints on the ring crests
      col = mix(col, col * vec3(0.82, 0.93, 1.0), uWater * 0.45);
      col += vec3(0.55, 0.62, 0.68) * max(ring, 0.0) * 0.12 * uWater;

      float edge = smoothstep(0.0, 0.018, vUv.x) * smoothstep(1.0, 0.982, vUv.x) * smoothstep(0.0, 0.01, vUv.y) * smoothstep(1.0, 0.99, vUv.y);
      col *= 0.55 + 0.45 * edge;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

function makeMask() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = MASK
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, MASK, MASK)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  return { canvas, ctx, tex }
}

export function Mirror({ quality, active }: { quality: 'low' | 'medium' | 'high'; active: boolean }) {
  const { gl, camera } = useThree()
  const discover = useNarrative((s) => s.discover)

  const built = useMemo(() => {
    const size = quality === 'low' ? 512 : 1024
    const reflector = new Reflector(new THREE.PlaneGeometry(MIRROR.width, MIRROR.height), {
      textureWidth: size,
      textureHeight: Math.round(size * (MIRROR.height / MIRROR.width) * 0.6),
      clipBias: 0.003,
      multisample: 0, // the tarnish blur hides aliasing; MSAA here only costs frames
      shader,
    })
    reflector.position.copy(MIRROR.center)
    const clean = makeMask()
    const memory = makeMask()
    const u = (reflector.material as THREE.ShaderMaterial).uniforms
    u.tClean.value = clean.tex
    u.tMemory.value = memory.tex
    // a tiny canvas to measure how much has been polished
    const probe = document.createElement('canvas')
    probe.width = probe.height = 32
    return { reflector, u, clean, memory, probe: probe.getContext('2d', { willReadFrequently: true })! }
  }, [quality])

  useEffect(
    () => () => {
      built.reflector.dispose()
      built.reflector.geometry.dispose()
      built.clean.tex.dispose()
      built.memory.tex.dispose()
    },
    [built],
  )

  const s = useRef({
    polishing: false,
    /** touch: waiting to see whether this is a sideways stroke (polish) or a vertical swipe (scroll) */
    pending: null as null | { x: number; y: number; uv: THREE.Vector2 },
    earned: false,
    lastMeasure: 0,
    ripple: 0,
    lastRipple: 0,
    passRipple: 0,
    last: null as THREE.Vector2 | null,
  })

  const inWindow = () => active && cameraState.chapterId === 'nafs' && cameraState.t > POLISH_FROM && cameraState.t < POLISH_TO + 0.1

  const brush = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) => {
    // the canvas is square, the mirror is not — squash the brush so it is round on the glass
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, MIRROR.width / MIRROR.height)
    ctx.translate(-x, -y)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const paintAt = (uv: THREE.Vector2) => {
    const st = s.current
    const from = st.last ?? uv
    // interpolate along the stroke so fast drags leave a continuous trail
    const steps = Math.max(1, Math.ceil(from.distanceTo(uv) * MASK / 6))
    for (let i = 1; i <= steps; i++) {
      const p = from.clone().lerp(uv, i / steps)
      const x = p.x * MASK
      const y = (1 - p.y) * MASK
      brush(built.clean.ctx, x, y, 20, 0.22)
      brush(built.memory.ctx, x, y, 17, 0.05)
    }
    st.last = uv.clone()
    built.clean.tex.needsUpdate = true
    built.memory.tex.needsUpdate = true
  }

  const addRipple = (uv: THREE.Vector2, strength = 1) => {
    const st = s.current
    const r = built.u.uRipples.value[st.ripple % RIPPLES] as THREE.Vector4
    r.set(uv.x, uv.y, built.u.uTime.value, strength)
    st.ripple++
  }

  const begin = (uv: THREE.Vector2, lockScroll: boolean) => {
    const st = s.current
    st.polishing = true
    st.pending = null
    st.last = null
    // a mouse drag should not also scroll the page; a finger never locks scrolling (on a phone the
    // mirror/water fills the screen, and a lock here would leave the visitor stuck)
    if (lockScroll) lenis?.stop()
    if (built.u.uWater.value > 0.5) {
      addRipple(uv, 1)
      discover('nafs.water', LINES['nafs.water'])
    } else {
      paintAt(uv)
      discover('nafs.polish', LINES['nafs.polish'])
    }
  }

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!inWindow() || !e.uv) return
    e.stopPropagation()
    const st = s.current
    const touch = e.nativeEvent.pointerType === 'touch'
    // on touch the browser keeps vertical swipes for scrolling (touch-action: pan-y), so a visitor
    // is never stuck at the mirror; a sideways stroke is what wipes the glass. A tap on water ripples.
    const water = built.u.uWater.value > 0.5
    if (touch && !water) st.pending = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, uv: e.uv.clone() }
    else begin(e.uv, !touch && !water)
    const up = () => {
      st.polishing = false
      st.pending = null
      st.last = null
      lenis?.start()
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const st = s.current
    if (st.pending && e.uv) {
      const dx = Math.abs(e.nativeEvent.clientX - st.pending.x)
      const dy = Math.abs(e.nativeEvent.clientY - st.pending.y)
      if (dx > 8 && dx > dy) begin(st.pending.uv, false)
      else if (dy > 10) st.pending = null // a scroll: let the browser have it
    }
    if (!st.polishing || !e.uv) return
    if (built.u.uWater.value > 0.5) {
      const now = performance.now()
      if (now - st.lastRipple > 140) {
        addRipple(e.uv, 0.6)
        st.lastRipple = now
      }
    } else paintAt(e.uv)
  }

  useFrame((state, dt) => {
    if (!active) return
    const d = Math.min(dt, 1 / 20)
    const st = s.current
    const t = cameraState.t
    built.u.uTime.value = state.clock.elapsedTime

    // the reflection camera also sees the reflected self
    built.reflector.getReflectionCamera(camera).layers.enable(REFLECTION_LAYER)


    // fresh polish fogs over again, slowly
    const ctx = built.clean.ctx
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, 0.09 * d)})`
    ctx.fillRect(0, 0, MASK, MASK)
    built.clean.tex.needsUpdate = true

    // measure what has been remembered (twice a second)
    const now = state.clock.elapsedTime
    if (!st.earned && now - st.lastMeasure > 0.5) {
      st.lastMeasure = now
      built.probe.drawImage(built.memory.canvas, 0, 0, 32, 32)
      const data = built.probe.getImageData(0, 0, 32, 32).data
      let sum = 0
      for (let i = 0; i < data.length; i += 4) sum += data[i]
      const mean = sum / (255 * 32 * 32)
      if (mean > OPEN_AT) {
        st.earned = true
        discover('nafs.clear', LINES['nafs.clear'])
      }
    }

    // the mirror opens into water once polished — or, so no one is ever trapped, on the way through
    const reduced = useExperience.getState().reducedMotion
    const target = Math.max(st.earned ? 1 : 0, THREE.MathUtils.smoothstep(t, 0.86, 0.92))
    built.u.uWater.value = reduced ? target : THREE.MathUtils.damp(built.u.uWater.value, target, 1.2, d)
    // passing through: the surface trembles as the camera reaches it
    if (t > 0.93 && now - st.passRipple > 0.4) {
      addRipple(new THREE.Vector2(0.5, (1.66 - MIRROR.bottom) / MIRROR.height), 1)
      st.passRipple = now
    }
  })

  return (
    <primitive
      object={built.reflector}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerOver={() => inWindow() && (gl.domElement.style.cursor = 'crosshair')}
      onPointerOut={() => (gl.domElement.style.cursor = '')}
    />
  )
}
