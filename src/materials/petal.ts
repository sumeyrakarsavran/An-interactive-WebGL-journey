import * as THREE from 'three'
import { atmosphere, wind } from './sharedUniforms'
import { atmosphereGLSL, noiseGLSL } from '@/shaders/chunks'

/**
 * Translucent petal material shared by all chapters.
 * - transmission when backlit, vein pattern, cell grain
 * - uShiver: touch response · uAnatomy: veins glow (long press, Ch. 02)
 * - uWilt: browning + inward curl · uGlass: hardens into a reflective surface (threshold to Ch. 03)
 */

const vert = /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
uniform float uShiver;
uniform float uWilt;
uniform float uLen;
uniform float uWid;
attribute vec2 aPetal;
attribute float aPhase;
attribute float aFlex;
varying vec2 vPetal;
varying vec3 vWorld;
varying vec3 vN;

void main() {
  vec3 p = position;
  float u = aPetal.x;
  float v = aPetal.y;
  float s = uLen / 0.064; // flutter scales with petal size
  float flutter = sin(uTime * 4.3 + aPhase + u * 3.0) * 0.0014 * uWindStrength
                + sin(uTime * 11.0 + aPhase * 2.0 + v * 4.0) * 0.0004 * uWindStrength;
  float shiver = uShiver * sin(uTime * 46.0 + aPhase + u * 7.0) * 0.0022;
  p.y += (flutter + shiver) * s * u * u * aFlex * (1.0 - uWilt);

  // wilting: curl inward, narrow, wrinkle (mirrors wiltOffset() in petalShape.ts)
  p.y += uWilt * (u * u * uLen * 0.32 + v * v * uWid * 0.45);
  p.y += uWilt * sin(u * 31.0 + v * 7.0) * 0.012 * uLen * u;

  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vPetal = aPetal;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const frag = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
uniform vec3 uBase;
uniform vec3 uMid;
uniform vec3 uTip;
uniform float uVeinFreq;
uniform float uGrain;
uniform float uVeinStrength;
uniform float uAnatomy;
uniform float uWilt;
uniform float uGlass;
varying vec2 vPetal;
varying vec3 vWorld;
varying vec3 vN;

void main() {
  float u = vPetal.x;
  float v = vPetal.y;
  vec3 col = mix(uBase, uMid, smoothstep(0.0, 0.28, u));
  col = mix(col, uTip, smoothstep(0.35, 1.0, u));

  // veins fan out from the base; a finer secondary network between them
  float fan = v * (1.0 + 0.35 * u) + 0.005 * sin(u * 14.0 + v * 3.0);
  float vein = 1.0 - smoothstep(0.0, 0.18, abs(fract(fan * uVeinFreq) - 0.5) * 2.0);
  float fine = 1.0 - smoothstep(0.0, 0.25, abs(fract(fan * uVeinFreq * 3.0 + vnoise(vPetal * 30.0) * 0.6) - 0.5) * 2.0);
  float midrib = 1.0 - smoothstep(0.0, 0.05, abs(v));
  float veinMask = (vein * 0.6 + fine * 0.18 + midrib) * (1.0 - u * 0.55);

  // soft cell structure (visible at macro scale)
  float cells = vnoise(vPetal * vec2(260.0, 110.0));

  vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 V = normalize(cameraPosition - vWorld);
  float wrap = max((dot(N, uSunDir) + 0.6) / 1.6, 0.0);

  // wilting: browning from the edges and tip, dark blotches, less light passes through
  float spots = smoothstep(0.55, 0.8, vnoise(vPetal * vec2(9.0, 4.0) + 3.0));
  float brownAmt = uWilt * clamp(0.35 + 0.65 * max(u, abs(v)) + spots * 0.4, 0.0, 1.0);
  col = mix(col, mix(vec3(0.24, 0.15, 0.08), vec3(0.42, 0.3, 0.18), u), brownAmt);

  float back = pow(max(dot(-V, uSunDir), 0.0), 1.6);
  float thin = 1.0 - (0.45 + uVeinStrength) * veinMask;
  vec3 transmitted = col * uSunColor * back * thin * (0.7 + 1.6 * uSunUp) * (1.0 - 0.8 * uWilt);

  vec3 diffuse = col * (uAmbient * 1.25 + uSunColor * wrap * 0.35 * (0.3 + uSunUp));
  diffuse *= (1.0 - uGrain) + uGrain * 2.0 * cells;
  // veins carry deeper pigment rather than just shadow
  diffuse = mix(diffuse, diffuse * vec3(0.82, 0.52, 0.56), clamp(veinMask, 0.0, 1.0) * uVeinStrength * 1.6);
  // the underside is a little deeper in tone; the base sits in the flower's own shade
  if (!gl_FrontFacing) diffuse *= vec3(0.86, 0.76, 0.76);
  diffuse *= 0.62 + 0.38 * smoothstep(0.0, 0.4, u);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float edge = smoothstep(0.82, 1.0, abs(v));
  vec3 rim = uSunColor * (fres * 0.25 + edge * back * 0.6) * (1.0 - uWilt * 0.7);

  vec3 c = diffuse + transmitted + rim;

  // anatomy light: the vein network glows, everything else recedes
  c *= 1.0 - 0.45 * uAnatomy * (1.0 - clamp(veinMask, 0.0, 1.0));
  c += vec3(1.0, 0.82, 0.5) * uSunColor * clamp(veinMask, 0.0, 1.2) * uAnatomy * 1.8;

  // glass: the dead petal hardens into a mirror of the sky
  vec3 R = reflect(-V, N);
  vec3 env = mix(uFogColor, uZenith, smoothstep(-0.1, 0.7, R.y)) + uSunColor * pow(max(dot(R, uSunDir), 0.0), 90.0) * 4.0;
  float fr = 0.12 + 0.88 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
  // a broad soft highlight slides across the surface as the view changes — reads as polish
  float sheen = smoothstep(0.35, 0.0, abs(v * 0.8 + (u - 0.5) * 0.6 + V.x * 0.8 - 0.15));
  vec3 glass = env * (0.55 + 0.45 * fr) + uSunColor * sheen * 0.35 + vec3(0.07) * veinMask;
  c = mix(c, glass, uGlass);

  gl_FragColor = vec4(applyFog(c, vWorld), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export interface PetalMaterialOptions {
  base: string
  mid: string
  tip: string
  length: number
  width: number
  veinFreq?: number
  grain?: number
  veinStrength?: number
  /** uniform objects to share by reference (e.g. one uAnatomy for a whole flower) */
  shared?: Record<string, THREE.IUniform>
}

export function createPetalMaterial(o: PetalMaterialOptions) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.DoubleSide,
    uniforms: {
      ...wind,
      ...atmosphere,
      uShiver: { value: 0 },
      uAnatomy: { value: 0 },
      uWilt: { value: 0 },
      uGlass: { value: 0 },
      uLen: { value: o.length },
      uWid: { value: o.width },
      uVeinFreq: { value: o.veinFreq ?? 7 },
      uGrain: { value: o.grain ?? 0.03 },
      uVeinStrength: { value: o.veinStrength ?? 0.12 },
      uBase: { value: new THREE.Color(o.base) },
      uMid: { value: new THREE.Color(o.mid) },
      uTip: { value: new THREE.Color(o.tip) },
      ...o.shared,
    },
  })
}
