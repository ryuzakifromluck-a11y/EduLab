import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Body, Fluid, Reading } from '../../engines/archimedesPrinciple'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** World units per centimetre. */
const U = 0.08
const CAN_R = 4.5 * U
const CAN_H = 13 * U
const SURFACE = CAN_H - 0.6 * U
const TOP = 3.0
/** Spring stretch per newton, world units. */
const SPRING_K = 0.32

/**
 * Spring balance on a stand holding a cylinder over an overflow can. Lowering
 * it pushes liquid out of the spout into a catch beaker.
 */
export function ArchimedesPrincipleScene({
  body,
  fluid,
  reading,
  lowered,
  labels,
}: {
  body: Body
  fluid: Fluid
  reading: Reading
  /** cm the balance has been lowered below first contact. */
  lowered: number
  labels: { balance: string; caught: string }
}) {
  const spring = useRef<THREE.Mesh>(null)
  const caught = useRef<THREE.Mesh>(null)
  const radius = Math.sqrt(body.volume / (Math.PI * body.height)) * U
  const h = body.height * U

  // Where the bottom of the body would be if it simply followed the balance down.
  const virtualBottom = SURFACE - Math.min(lowered, body.height + 2) * U
  // A floating body stops at its floating depth; the string goes slack.
  const bottom = reading.floating ? SURFACE - reading.submerged * h : virtualBottom
  const slack = reading.floating
  const hookY = virtualBottom + h + 0.3
  const springLen = 0.25 + reading.apparent * SPRING_K
  const springTop = hookY + springLen
  const balanceTop = springTop + 0.08
  const bodyTop = bottom + h

  const springGeom = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const turns = 14
    for (let i = 0; i <= turns * 20; i++) {
      const u = i / (turns * 20)
      const a = u * turns * Math.PI * 2
      pts.push(new THREE.Vector3(0.06 * Math.cos(a), -u, 0.06 * Math.sin(a)))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 280, 0.008, 6, false)
  }, [])

  useFrame(() => {
    if (spring.current) spring.current.scale.y = springLen
    if (caught.current) {
      const ml = reading.displaced
      const level = Math.min(1, ml / 160) * 1.0 * U * 10
      caught.current.scale.y = Math.max(0.001, level)
      caught.current.position.y = level / 2 + 0.02
    }
  })

  return (
    <>
      <LabLights />
      <Bench width={4} depth={2.2} />
      {/* Stand */}
      <mesh position={[-0.9, 0.02, 0]}>
        <boxGeometry args={[0.9, 0.04, 0.7]} />
        <meshStandardMaterial color="#3a4256" />
      </mesh>
      <mesh position={[-1.15, TOP / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, TOP, 16]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[-0.58, balanceTop + 0.12, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 1.15, 16]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Spring balance: transparent tube, spring, scale */}
      <mesh position={[0, balanceTop - 0.45, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.0, 24, 1, true]} />
        <meshStandardMaterial color="#cfe3ff" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, balanceTop + 0.06, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.06, 24]} />
        <meshStandardMaterial color="#444b5c" />
      </mesh>
      <mesh ref={spring} geometry={springGeom} position={[0, springTop, 0]}>
        <meshStandardMaterial color="#c0c6d2" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0.13, balanceTop - 0.45, 0]}>
        <boxGeometry args={[0.05, 1.0, 0.01]} />
        <meshStandardMaterial color="#f3e7c4" />
      </mesh>
      <mesh position={[0.1, hookY, 0]} rotation-z={Math.PI / 2}>
        <coneGeometry args={[0.025, 0.08, 12]} />
        <meshStandardMaterial color="#e5484d" />
      </mesh>
      <Label3D lines={[labels.balance]} position={[0.55, balanceTop - 0.2, 0]} height={0.3} />
      {/* String to the body (slack when it floats) */}
      <mesh position={[0, (hookY + (slack ? hookY - 0.15 : bodyTop)) / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, Math.max(0.01, hookY - (slack ? hookY - 0.15 : bodyTop)), 6]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      {/* Body */}
      <mesh position={[0, bottom + h / 2, 0]}>
        <cylinderGeometry args={[radius, radius, h, 32]} />
        <meshStandardMaterial color={body.color} metalness={body.id === 'aluminium' || body.id === 'brass' ? 0.3 : 0.05} roughness={0.4} />
      </mesh>
      {/* Overflow can with liquid */}
      <mesh position={[0, CAN_H / 2, 0]}>
        <cylinderGeometry args={[CAN_R, CAN_R, CAN_H, 40, 1, true]} />
        <meshStandardMaterial color="#d8e6f5" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, SURFACE / 2, 0]}>
        <cylinderGeometry args={[CAN_R - 0.01, CAN_R - 0.01, SURFACE, 40]} />
        <meshStandardMaterial color={fluid.color} transparent opacity={0.45} />
      </mesh>
      <mesh position={[CAN_R + 0.12, SURFACE - 0.02, 0]} rotation-z={-Math.PI / 2.6}>
        <cylinderGeometry args={[0.03, 0.03, 0.32, 12, 1, true]} />
        <meshStandardMaterial color="#d8e6f5" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Catch beaker */}
      <group position={[CAN_R + 0.42, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 1.0, 32, 1, true]} />
          <meshStandardMaterial color="#d8e6f5" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={caught} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 1, 32]} />
          <meshStandardMaterial color={fluid.color} transparent opacity={0.6} />
        </mesh>
        <Label3D lines={[labels.caught]} position={[0.1, 1.25, 0]} height={0.14} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      </group>
    </>
  )
}
