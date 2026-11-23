/** Shared GLSL chunks. Kept as TS strings so no bundler loader is needed. */

export const noiseGLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`

export const windGLSL = /* glsl */ `
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec3 uPointer;
uniform float uPointerForce;

// horizontal displacement at full flex for a point rooted at worldPos
vec2 windOffset(vec3 worldPos) {
  vec2 p = worldPos.xz;
  float g = sin(dot(p, uWindDir) * 0.15 - uTime * 1.1) * 0.5 + 0.5;
  float gust = g * g;
  float n = vnoise(p * 0.35 + uWindDir * uTime * 0.6);
  float flutter = sin(uTime * 2.7 + p.x * 3.1 + p.y * 2.3) * 0.12
                + sin(uTime * 7.3 + p.x * 9.0 - p.y * 7.0) * 0.05;
  float s = uWindStrength * (0.35 + 0.9 * gust + 0.45 * n + flutter);
  vec2 off = uWindDir * s;

  // pointer: a soft radial push, like a hand moving through the field
  vec2 d = p - uPointer.xz;
  float dist = length(d);
  float push = uPointerForce * smoothstep(2.2, 0.0, dist);
  off += (d / max(dist, 1e-3)) * push;
  return off;
}
`

export const atmosphereGLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform vec3 uZenith;
uniform vec3 uAmbient;
uniform float uFogDensity;
uniform float uSunUp;

vec3 fogColorFor(vec3 dir) {
  float sunAmt = pow(max(dot(dir, uSunDir), 0.0), 9.0);
  return mix(uFogColor, uSunColor, sunAmt * 0.45);
}

vec3 applyFog(vec3 col, vec3 worldPos) {
  vec3 v = worldPos - cameraPosition;
  float d = length(v);
  vec3 dir = v / max(d, 1e-4);
  // height fog: thicker in the valley floor
  float hf = exp(-max(worldPos.y, 0.0) * 0.12);
  float f = 1.0 - exp(-d * uFogDensity * (0.45 + 1.1 * hf));
  return mix(col, fogColorFor(dir), clamp(f, 0.0, 1.0));
}
`
