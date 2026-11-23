'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmosphere, wind, windAt } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL, windGLSL } from '@/shaders/chunks'
import { mulberry32 } from '@/utils/device'

/** One tree on a small island — a silhouette against the afterglow, doubled by the water. */
export const ISLAND = new THREE.Vector3(7, 0, -62)

interface Seg {
  a: THREE.Vector3
  b: THREE.Vector3
  r: number
}

function grow(seed: number) {
  const rand = mulberry32(seed)
  const segs: Seg[] = []
  const tips: THREE.Vector3[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const branch = (a: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    // a slightly bent limb in two pieces
    const mid = a.clone().addScaledVector(dir, len * 0.5)
    const bent = dir.clone().add(new THREE.Vector3(rand() - 0.5, rand() * 0.3, rand() - 0.5).multiplyScalar(0.25)).normalize()
    const b = mid.clone().addScaledVector(bent, len * 0.5)
    segs.push({ a, b: mid, r }, { a: mid, b, r: r * 0.85 })
    if (depth === 0) {
      tips.push(b)
      return
    }
    const kids = depth > 3 ? 2 : 3
    for (let i = 0; i < kids; i++) {
      const ang = (i / kids) * Math.PI * 2 + rand() * 1.2
      const tilt = 0.45 + rand() * 0.45
      const side = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang))
      const d = bent.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt))
      d.addScaledVector(up, 0.25).normalize() // reach for the light
      branch(b, d, len * (0.68 + rand() * 0.12), r * 0.66, depth - 1)
    }
    if (depth <= 2) tips.push(b.clone())
  }
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 1, 0).normalize(), 3.4, 0.24, 6)
  return { segs, tips }
}

const leafVert = /* glsl */ `
${noiseGLSL}
${windGLSL}
attribute vec4 aLeaf; // xyz centre (tree space), size
attribute float aSeed;
uniform mat4 uTree;
varying vec2 vUv;
varying vec3 vWorld;
varying float vSeed;
void main() {
  vec3 c = (uTree * vec4(aLeaf.xyz, 1.0)).xyz;
  vec2 w = windOffset(c) * 0.12 * (0.5 + aSeed);
  c.xz += w;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float a = aSeed * 6.28;
  vec2 p = vec2(cos(a) * position.x - sin(a) * position.y, sin(a) * position.x + cos(a) * position.y);
  vec3 world = c + (right * p.x + up * p.y) * aLeaf.w;
  vUv = uv;
  vWorld = world;
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`
const leafFrag = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}
varying vec2 vUv;
varying vec3 vWorld;
varying float vSeed;
void main() {
  // a loose cluster of small leaves, not a disc
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;
  float n = vnoise(vUv * 9.0 + vSeed * 17.0);
  float body = smoothstep(1.0, 0.55, r + (n - 0.5) * 0.9);
  if (body < 0.5) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  float back = pow(max(dot(-V, uSunDir), 0.0), 3.0);
  vec3 col = vec3(0.03, 0.035, 0.03) + uAmbient * 0.12 + uSunColor * back * 0.12 * n;
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function Tree() {
  const group = useRef<THREE.Group>(null)
  const built = useMemo(() => {
    const { segs, tips } = grow(17)
    const geo = new THREE.CylinderGeometry(0.72, 1, 1, 7, 1)
    geo.translate(0, 0.5, 0)
    const bark = new THREE.MeshStandardMaterial({ color: '#15120f', roughness: 0.95 })
    const limbs = new THREE.InstancedMesh(geo, bark, segs.length)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const yAxis = new THREE.Vector3(0, 1, 0)
    segs.forEach((s, i) => {
      const d = s.b.clone().sub(s.a)
      q.setFromUnitVectors(yAxis, d.clone().normalize())
      m.compose(s.a, q, new THREE.Vector3(s.r, d.length(), s.r))
      limbs.setMatrixAt(i, m)
    })

    const rand = mulberry32(99)
    const leaves: number[] = []
    const seeds: number[] = []
    tips.forEach((t) => {
      for (let k = 0; k < 7; k++) {
        leaves.push(t.x + (rand() - 0.5) * 1.3, t.y + (rand() - 0.3) * 0.9, t.z + (rand() - 0.5) * 1.3, 0.55 + rand() * 0.6)
        seeds.push(rand())
      }
    })
    const plane = new THREE.PlaneGeometry(1, 1)
    const lg = new THREE.InstancedBufferGeometry()
    lg.index = plane.index
    lg.setAttribute('position', plane.getAttribute('position'))
    lg.setAttribute('uv', plane.getAttribute('uv'))
    lg.setAttribute('aLeaf', new THREE.InstancedBufferAttribute(new Float32Array(leaves), 4))
    lg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1))
    lg.instanceCount = seeds.length
    const leafMat = new THREE.ShaderMaterial({
      vertexShader: leafVert,
      fragmentShader: leafFrag,
      side: THREE.DoubleSide,
      uniforms: { ...wind, ...atmosphere, uTree: { value: new THREE.Matrix4() } },
    })
    const leafMesh = new THREE.Mesh(lg, leafMat)
    leafMesh.frustumCulled = false

    // the island: a low dark mound
    const island = new THREE.Mesh(
      new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#12110e', roughness: 1 }),
    )
    island.scale.set(7, 0.9, 5.5)
    island.position.y = -0.2
    return { limbs, geo, bark, leafMesh, lg, leafMat, island }
  }, [])

  useEffect(
    () => () => {
      built.geo.dispose()
      built.bark.dispose()
      built.lg.dispose()
      built.leafMat.dispose()
      built.island.geometry.dispose()
    },
    [built],
  )

  useFrame((state) => {
    const g = group.current
    if (!g) return
    // the whole crown leans a little with the gusts
    const w = windAt(ISLAND.x, ISLAND.z, state.clock.elapsedTime)
    g.rotation.z = -w.x * 0.012
    g.rotation.x = w.z * 0.012
    g.updateMatrixWorld()
    built.leafMat.uniforms.uTree.value.copy(g.matrixWorld)
  })

  return (
    <group position={ISLAND}>
      <primitive object={built.island} />
      <group ref={group} position={[0, 0.5, 0]} scale={1.7}>
        <primitive object={built.limbs} />
      </group>
      <primitive object={built.leafMesh} />
    </group>
  )
}
