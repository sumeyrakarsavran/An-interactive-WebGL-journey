import * as THREE from 'three'

/**
 * Parametric petal shared by every chapter (a 6 cm wildflower in Ch. 01,
 * a 3 m macro petal in Ch. 02). u runs base→tip, v runs edge→edge (-1..1).
 */
export interface PetalSpec {
  yaw: number
  elev: number
  length: number
  width: number
  cup: number
  curl: number
  phase: number
  flex: number
}

export function petalWidth(u: number, W: number) {
  return W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.62)
}

/** Wilting curls the petal inward and wrinkles it — must match the GLSL in petal.ts. */
export function wiltOffset(spec: PetalSpec, u: number, v: number) {
  return u * u * spec.length * 0.32 + v * v * spec.width * 0.45
}

/** local petal surface: x along length, z across, y = up (cup + curl) */
export function petalPoint(spec: PetalSpec, u: number, v: number, out = new THREE.Vector3(), wilt = 0) {
  const w = petalWidth(u, spec.width)
  const x = u * spec.length
  const z = v * w
  const ruffle = 0.0018 * (spec.length / 0.064) * Math.sin(v * 9 + u * 6) * Math.abs(v) ** 3 * u
  const y = spec.cup * v * v * w * 0.9 + spec.curl * u * u * spec.length + ruffle + wilt * wiltOffset(spec, u, v)
  return out.set(x, y, z)
}

export function petalMatrix(spec: PetalSpec) {
  const m = new THREE.Matrix4().makeRotationY(-spec.yaw)
  m.multiply(new THREE.Matrix4().makeRotationZ(spec.elev))
  return m
}

export function petalGeometry(spec: PetalSpec, U = 28, Vn = 14) {
  const pos: number[] = []
  const pet: number[] = []
  const idx: number[] = []
  const tmp = new THREE.Vector3()
  for (let i = 0; i <= U; i++) {
    for (let j = 0; j <= Vn; j++) {
      const u = i / U
      const v = (j / Vn) * 2 - 1
      petalPoint(spec, u, v, tmp)
      pos.push(tmp.x, tmp.y, tmp.z)
      pet.push(u, v)
      if (i < U && j < Vn) {
        const a = i * (Vn + 1) + j
        const b = a + Vn + 1
        idx.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aPetal', new THREE.Float32BufferAttribute(pet, 2))
  const n = (U + 1) * (Vn + 1)
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(new Array(n).fill(spec.phase), 1))
  g.setAttribute('aFlex', new THREE.Float32BufferAttribute(new Array(n).fill(spec.flex), 1))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
