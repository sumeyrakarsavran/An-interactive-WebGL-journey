'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MIRROR, REFLECTION_LAYER } from './layout'

/**
 * The visitor's reflected self. It exists only for the mirror (a layer the main camera
 * never renders), stands where the camera stands — and follows a moment too late.
 * Deliberately faceless: an outline, not a portrait.
 */
const vert = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const frag = /* glsl */ `
uniform vec3 uRim;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float rim = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.6);
  // light from above catches shoulders and crown
  float top = smoothstep(0.2, 1.0, normalize(vN).y) * 0.25;
  vec3 col = vec3(0.02, 0.02, 0.024) + uRim * (rim * 0.35 + top * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

type Part = [geo: THREE.BufferGeometry, pos: [number, number, number], rot?: [number, number, number], scale?: [number, number, number]]

export function Silhouette() {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Mesh>(null)

  const { material, parts } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uRim: { value: new THREE.Color('#aeb6ba') } },
    })
    const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 14)
    const parts: Part[] = [
      [cap(0.045, 0.08), [0, 1.5, 0]], // neck
      [cap(0.17, 0.4), [0, 1.18, 0], undefined, [1.25, 1, 0.68]], // torso
      [cap(0.15, 0.08), [0, 0.9, 0], undefined, [1.2, 1, 0.75]], // hips
      [cap(0.068, 0.74), [-0.1, 0.47, 0]], // legs
      [cap(0.068, 0.74), [0.1, 0.47, 0]],
      [cap(0.044, 0.56), [-0.275, 1.1, 0], [0, 0, -0.07]], // arms
      [cap(0.044, 0.56), [0.275, 1.1, 0], [0, 0, 0.07]],
    ]
    return { material, parts }
  }, [])

  const headGeo = useMemo(() => new THREE.SphereGeometry(0.105, 24, 18), [])

  useEffect(() => {
    // only the mirror's reflection camera renders this layer
    root.current?.traverse((o) => o.layers.set(REFLECTION_LAYER))
    return () => {
      material.dispose()
      headGeo.dispose()
      parts.forEach(([g]) => g.dispose())
    }
  }, [material, parts, headGeo])

  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const g = root.current
    if (!g) return
    const d = Math.min(dt, 1 / 20)
    const cam = state.camera.position
    target.set(cam.x, 0, cam.z)
    // the reflected self follows, but late — never quite in step
    g.position.x = THREE.MathUtils.damp(g.position.x, target.x, 1.1, d)
    g.position.z = THREE.MathUtils.damp(g.position.z, target.z, 1.1, d)
    const face = Math.atan2(MIRROR.center.x - g.position.x, MIRROR.center.z - g.position.z)
    // shortest way round (the facing angle wraps at ±π right in front of the mirror)
    const delta = THREE.MathUtils.euclideanModulo(face - g.rotation.y + Math.PI, Math.PI * 2) - Math.PI
    g.rotation.y += delta * (1 - Math.exp(-0.9 * d))
    // breath and a slow, independent turn of the head
    const t = state.clock.elapsedTime
    g.scale.y = 1 + Math.sin(t * 1.1) * 0.004
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.23) * 0.12
      head.current.rotation.x = Math.sin(t * 0.17 + 1.0) * 0.05
    }
  })

  return (
    <group ref={root}>
      <mesh ref={head} geometry={headGeo} material={material} position={[0, 1.64, 0]} scale={[0.9, 1.15, 1]} />
      {parts.map(([geo, pos, rot, scale], i) => (
        <mesh key={i} geometry={geo} material={material} position={pos} rotation={rot} scale={scale} />
      ))}
    </group>
  )
}
