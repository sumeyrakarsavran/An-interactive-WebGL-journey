'use client'
import { Suspense, useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperience } from '@/store/experience'
import { SCENES } from '@/scenes/registry'
import { CameraRig } from '@/camera/CameraRig'

/**
 * Compiles a pre-mounted (hidden) chapter's shaders in the background, so the swap inside the
 * threshold light does not stall on shader compilation. compile() walks every mesh, visible or
 * not; compileAsync() uses KHR_parallel_shader_compile where the driver supports it.
 */
function Precompile({ target, enabled }: { target: RefObject<THREE.Group | null>; enabled: boolean }) {
  const { gl, camera, scene } = useThree()
  useEffect(() => {
    if (!enabled || !target.current) return
    let cancelled = false
    const id = window.setTimeout(() => {
      if (cancelled || !target.current) return
      gl.compileAsync(target.current, camera, scene).catch(() => {
        /* a failed precompile only means the swap compiles lazily, as before */
      })
    }, 50)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [enabled, gl, camera, scene, target])
  return null
}

/** Everything GPU-side a chapter owns, gathered while it is mounted. */
function collect(root: THREE.Object3D, bag: { geo: Set<THREE.BufferGeometry>; mat: Set<THREE.Material>; tex: Set<THREE.Texture> }) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.geometry) bag.geo.add(m.geometry)
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
    for (const mat of mats) {
      bag.mat.add(mat)
      // textures held directly, or wrapped as { value } (custom materials keep uniforms that way)
      for (const v of Object.values(mat as unknown as Record<string, unknown>)) {
        if (v instanceof THREE.Texture) bag.tex.add(v)
        else if (v && typeof v === 'object' && (v as { value?: unknown }).value instanceof THREE.Texture) bag.tex.add((v as { value: THREE.Texture }).value)
      }
      const uniforms = (mat as THREE.ShaderMaterial).uniforms
      if (uniforms) for (const u of Object.values(uniforms)) if (u?.value instanceof THREE.Texture) bag.tex.add(u.value)
    }
  })
}

function Chapter({ id, active }: { id: string; active: boolean }) {
  const { Component } = SCENES[id]
  const group = useRef<THREE.Group>(null)
  // a safety net under each scene's own cleanup: dispose whatever was ever under this chapter
  useEffect(() => {
    const bag = { geo: new Set<THREE.BufferGeometry>(), mat: new Set<THREE.Material>(), tex: new Set<THREE.Texture>() }
    // collect early and often: by the time this cleanup runs the scene graph is already detached,
    // and a chapter flown through on the way elsewhere may live for well under a second
    const grab = () => group.current && collect(group.current, bag)
    grab()
    const id = window.setInterval(grab, 250)
    return () => {
      window.clearInterval(id)
      grab()
      bag.geo.forEach((g) => g.dispose())
      bag.mat.forEach((m) => m.dispose())
      bag.tex.forEach((t) => !t.userData.keep && t.dispose())
    }
  }, [])
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <Component active={active} />
        <Precompile target={group} enabled={!active} />
      </Suspense>
    </group>
  )
}

/**
 * Mounts the current chapter, plus its neighbour while the camera approaches a threshold
 * (hidden, paused and precompiled, so it is ready before the swap). Anything else is unmounted.
 */
export function SceneManager() {
  const chapterId = useExperience((s) => s.chapterId)
  const neighbor = useExperience((s) => s.neighbor)
  const ids = [chapterId, neighbor].filter((id, i, a): id is string => !!id && !!SCENES[id] && a.indexOf(id) === i)
  return (
    <>
      <CameraRig />
      {ids.map((id) => (
        <Chapter key={id} id={id} active={id === chapterId} />
      ))}
    </>
  )
}
