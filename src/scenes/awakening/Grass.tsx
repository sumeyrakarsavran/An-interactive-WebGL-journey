'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { atmosphere, wind } from '@/materials/sharedUniforms'
import { atmosphereGLSL, noiseGLSL, windGLSL } from '@/shaders/chunks'
import type { FieldData } from './field'

const vertex = /* glsl */ `
${noiseGLSL}
${windGLSL}
attribute vec3 aOffset;
attribute float aAngle;
attribute float aHeight;
attribute float aWidth;
attribute float aTint;
varying float vH;
varying float vTint;
varying vec3 vWorld;
varying float vSide;

void main() {
  float h = position.y;
  vec3 p = vec3(position.x * aWidth, h * aHeight, 0.0);
  // natural rest curve: blades lean slightly in their facing direction
  p.z += h * h * aHeight * 0.18;
  float c = cos(aAngle), s = sin(aAngle);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

  vec2 w = windOffset(aOffset) * (h * h) * aHeight;
  p.xz += w;
  // preserve approximate length while bending
  p.y -= dot(w, w) * 0.9 / max(aHeight, 0.1);

  vec3 world = aOffset + p;
  vWorld = world;
  vH = h;
  vTint = aTint;
  vSide = position.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`

const fragment = /* glsl */ `
${atmosphereGLSL}
uniform vec3 uBase;
uniform vec3 uTip;
uniform vec3 uTipDry;
uniform vec3 uStem;
varying float vH;
varying float vTint;
varying vec3 vWorld;
varying float vSide;

void main() {
  float flowerStem = step(1.5, vTint);
  vec3 tip = mix(uTip, uTipDry, smoothstep(0.55, 1.0, vTint) * (1.0 - flowerStem));
  tip = mix(tip, uStem, flowerStem);
  vec3 col = mix(uBase, tip, smoothstep(0.0, 0.9, vH));

  // midrib highlight across the blade
  col *= 0.88 + 0.12 * (1.0 - abs(vSide) * 2.0);
  float ao = mix(0.28, 1.0, smoothstep(0.0, 0.7, vH));

  vec3 V = normalize(cameraPosition - vWorld);
  // looking toward the sun -> light passes through the blade
  float back = pow(max(dot(-V, uSunDir), 0.0), 6.0);
  vec3 lit = col * (uAmbient * 1.15 + uSunColor * 0.35 * uSunUp) * ao;
  lit += uSunColor * col * back * vH * (0.2 + 1.1 * uSunUp);
  // thin rim on the tips catching first light
  lit += uSunColor * smoothstep(0.75, 1.0, vH) * back * 0.25 * uSunUp;

  gl_FragColor = vec4(applyFog(lit, vWorld), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function bladeGeometry(segments = 5) {
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= segments; i++) {
    const y = i / segments
    const w = 0.5 * Math.pow(1 - y, 0.75)
    pos.push(-w, y, 0, w, y, 0)
    if (i < segments) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

export function Grass({ field }: { field: FieldData }) {
  const geometry = useMemo(() => {
    const base = bladeGeometry()
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute('position', base.getAttribute('position'))
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(field.offsets, 3))
    g.setAttribute('aAngle', new THREE.InstancedBufferAttribute(field.angles, 1))
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(field.heights, 1))
    g.setAttribute('aWidth', new THREE.InstancedBufferAttribute(field.widths, 1))
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(field.tints, 1))
    g.instanceCount = field.count
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 200)
    return g
  }, [field])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.DoubleSide,
        uniforms: {
          ...wind,
          ...atmosphere,
          uBase: { value: new THREE.Color('#171a13') },
          uTip: { value: new THREE.Color('#68744f') },
          uTipDry: { value: new THREE.Color('#9c946c') },
          uStem: { value: new THREE.Color('#5d6a44') },
        },
      }),
    [],
  )

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
