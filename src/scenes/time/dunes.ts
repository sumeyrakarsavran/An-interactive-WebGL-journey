import * as THREE from 'three'

/**
 * Desert height field — one analytic function shared by GLSL (terrain, shadows, particles,
 * footprints) and JS (camera path, pointer picking). Asymmetric dunes: a long windward
 * slope rising to a sharp crest, then a short steep slip face.
 */
export const PILES = 10

/** sand gathered by the visitor: xz centre, height, radius — eroded by the wind */
export const piles = {
  uPiles: { value: Array.from({ length: PILES }, () => new THREE.Vector4(0, 0, 0, 1)) },
}

export const DUNES_GLSL = /* glsl */ `
uniform vec4 uPiles[${PILES}];

float duneProfile(float s) {
  // max(): fract() can come back a hair below zero on some GPUs, and pow() of a negative is NaN
  s = clamp(s, 0.0, 1.0);
  return s < 0.78 ? pow(s / 0.78, 1.5) : pow(max(1.0 - (s - 0.78) / 0.22, 0.0), 1.25);
}
float dunes(vec2 p) {
  vec2 q = p + vec2(sin(p.y * 0.013) * 22.0, sin(p.x * 0.011) * 14.0);
  float s = fract((q.x * 0.034 + q.y * 0.010) / 3.14159265);
  float amp = 5.5 + 3.5 * sin(p.y * 0.0061 + 1.3) + 2.0 * sin(p.x * 0.0043);
  float h = duneProfile(s) * amp;
  h += sin(p.x * 0.009 + p.y * 0.014) * 2.4 + sin(p.y * 0.0035 - 0.5) * 4.0;
  return h;
}
float pilesAt(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < ${PILES}; i++) {
    vec4 k = uPiles[i];
    if (k.z <= 0.001) continue;
    vec2 d = p - k.xy;
    h += k.z * exp(-dot(d, d) / (k.w * k.w));
  }
  return h;
}
float groundH(vec2 p) { return dunes(p) + pilesAt(p); }
`

function duneProfile(s: number) {
  return s < 0.78 ? Math.pow(s / 0.78, 1.5) : Math.pow(Math.max(1 - (s - 0.78) / 0.22, 0), 1.25)
}
const fract = (x: number) => x - Math.floor(x)

export function dunes(x: number, z: number) {
  const qx = x + Math.sin(z * 0.013) * 22
  const qz = z + Math.sin(x * 0.011) * 14
  const s = fract((qx * 0.034 + qz * 0.01) / Math.PI)
  const amp = 5.5 + 3.5 * Math.sin(z * 0.0061 + 1.3) + 2.0 * Math.sin(x * 0.0043)
  return duneProfile(s) * amp + Math.sin(x * 0.009 + z * 0.014) * 2.4 + Math.sin(z * 0.0035 - 0.5) * 4.0
}

export function pilesAt(x: number, z: number) {
  let h = 0
  for (const k of piles.uPiles.value) {
    if (k.z <= 0.001) continue
    const dx = x - k.x
    const dz = z - k.y
    h += k.z * Math.exp(-(dx * dx + dz * dz) / (k.w * k.w))
  }
  return h
}

export const groundH = (x: number, z: number) => dunes(x, z) + pilesAt(x, z)

/** Pick the sand under a screen ray (march + bisection against the analytic field). */
export function pickGround(ray: THREE.Ray, out: THREE.Vector3, maxDist = 60) {
  let t0 = 0
  let t = 0.2
  const p = new THREE.Vector3()
  while (t < maxDist) {
    ray.at(t, p)
    if (p.y < groundH(p.x, p.z)) {
      for (let i = 0; i < 12; i++) {
        const m = (t0 + t) / 2
        ray.at(m, p)
        if (p.y < groundH(p.x, p.z)) t = m
        else t0 = m
      }
      ray.at(t, out)
      return true
    }
    t0 = t
    t += Math.max(0.1, t * 0.08)
  }
  return false
}
