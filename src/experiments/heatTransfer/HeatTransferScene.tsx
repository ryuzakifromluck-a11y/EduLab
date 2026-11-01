import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Rod } from '../../engines/heatTransfer'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { heatColor } from '../shared/lab'
import { T_COLD } from './useHeatTransfer'

const ROD_LEN = 3.2
const ROD_R = 0.09
const Y = 0.55

function RodMesh({ rod, z, tMax }: { rod: Rod; z: number; tMax: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const n = rod.segments
  const color = useMemo(() => new THREE.Color(), [])
  const seg = ROD_LEN / n


  useFrame(() => {
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < n; i++) {
      const T = (rod.temps[i] + rod.temps[i + 1]) / 2
      color.set(heatColor(T, T_COLD, tMax))
      m.setColorAt(i, color)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={(m) => {
        mesh.current = m
        if (!m) return
        const d = new THREE.Object3D()
        for (let i = 0; i < n; i++) {
          d.position.set(-ROD_LEN / 2 + seg * (i + 0.5), Y, z)
          d.rotation.set(0, 0, Math.PI / 2)
          d.updateMatrix()
          m.setMatrixAt(i, d.matrix)
          m.setColorAt(i, new THREE.Color(heatColor(T_COLD, T_COLD, tMax)))
        }
        m.instanceMatrix.needsUpdate = true
      }}
      args={[undefined, undefined, n]}
      castShadow
    >
      <cylinderGeometry args={[ROD_R, ROD_R, seg * 1.02, 16]} />
      <meshStandardMaterial roughness={0.45} metalness={0.3} />
    </instancedMesh>
  )
}

export function HeatTransferScene({ a, b, tHot, labels }: { a: Rod; b: Rod; tHot: number; labels: { a: string; b: string; hot: string; cold: string } }) {
  return (
    <>
      <LabLights />
      <Bench width={6} depth={2.4} />
      {/* Hot bath */}
      <mesh position={[-ROD_LEN / 2 - 0.45, 0.5, 0]} castShadow>
        <boxGeometry args={[0.9, 1.0, 1.7]} />
        <meshStandardMaterial color={heatColor(tHot, T_COLD, 100)} emissive="#e0342a" emissiveIntensity={0.15 + (0.35 * (tHot - T_COLD)) / 80} roughness={0.4} />
      </mesh>
      {/* Cold bath */}
      <mesh position={[ROD_LEN / 2 + 0.45, 0.5, 0]} castShadow>
        <boxGeometry args={[0.9, 1.0, 1.7]} />
        <meshStandardMaterial color="#5c8fe0" roughness={0.3} />
      </mesh>
      <Label3D lines={[labels.hot]} position={[-ROD_LEN / 2 - 0.45, 1.25, 0]} height={0.22} color="#ffffff" background="rgba(160,30,20,0.85)" border="rgba(0,0,0,0)" font="600 36px Inter Variable, sans-serif" />
      <Label3D lines={[labels.cold]} position={[ROD_LEN / 2 + 0.45, 1.25, 0]} height={0.22} color="#ffffff" background="rgba(30,70,160,0.85)" border="rgba(0,0,0,0)" font="600 36px Inter Variable, sans-serif" />
      <RodMesh rod={a} z={-0.4} tMax={tHot} />
      <RodMesh rod={b} z={0.4} tMax={tHot} />
      {/* Probes at the midpoints */}
      {[-0.4, 0.4].map((z) => (
        <mesh key={z} position={[0, Y + (z < 0 ? 0.22 : -0.16), z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color="#d8dde8" metalness={0.6} />
        </mesh>
      ))}
      <Label3D lines={[labels.a]} position={[0, Y + 0.62, -0.4]} height={0.2} />
      <Label3D lines={[labels.b]} position={[0, Y - 0.32, 0.62]} height={0.2} />
    </>
  )
}
