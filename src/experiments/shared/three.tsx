import type { ThreeElements } from '@react-three/fiber'
import { forwardRef } from 'react'
import * as THREE from 'three'

const HEAD = 0.16

/**
 * An arrow along its local +Y axis whose length is set every frame with
 * `setArrowLength`. Rotate the group to point it.
 */
export const Arrow = forwardRef<THREE.Group, { color: string; radius?: number } & Omit<ThreeElements['group'], 'ref'>>(
  function Arrow({ color, radius = 0.035, ...props }, ref) {
    return (
      <group ref={ref} {...props}>
        <mesh name="shaft" position={[0, 0.5, 0]}>
          <cylinderGeometry args={[radius, radius, 1, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
        <mesh name="head" position={[0, 1, 0]}>
          <coneGeometry args={[radius * 2.6, HEAD, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
      </group>
    )
  },
)

export function setArrowLength(group: THREE.Group | null, length: number) {
  if (!group) return
  const len = Math.abs(length)
  group.visible = len > 0.02
  if (!group.visible) return
  const shaftLen = Math.max(0.001, len - HEAD)
  const shaft = group.getObjectByName('shaft')
  const head = group.getObjectByName('head')
  if (shaft) {
    shaft.scale.y = shaftLen
    shaft.position.y = shaftLen / 2
  }
  if (head) head.position.y = shaftLen + HEAD / 2
}

/** Standard three-point lighting used by the new labs. */
export function LabLights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 8, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={0.35} />
    </>
  )
}

/** A simple bench top. */
export function Bench({ width = 8, depth = 4, y = -0.05, color = '#2e3a4f' }: { width?: number; depth?: number; y?: number; color?: string }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow>
      <boxGeometry args={[width, 0.1, depth]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  )
}
