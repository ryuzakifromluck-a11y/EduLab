import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CalorimeterSimulation } from '../../engines/calorimetry'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

const CUP_R = 0.62
const CUP_H = 1.5
const GRAINS = 140

/** Coffee-cup calorimeter: two nested polystyrene cups, lid, thermometer and stirrer. */
export function ExoEndoScene({ sim, labels, glass }: { sim: CalorimeterSimulation; labels: { reading: string }; glass: string }) {
  const liquid = useRef<THREE.Mesh>(null)
  const liquidMat = useRef<THREE.MeshStandardMaterial>(null)
  const column = useRef<THREE.Mesh>(null)
  const grains = useRef<THREE.InstancedMesh>(null)
  const stirrer = useRef<THREE.Group>(null)
  const level = 0.2 + (sim.params.water / 200) * 0.9

  const grainMatrices = useMemo(() => {
    const d = new THREE.Object3D()
    let seed = 11
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    return Array.from({ length: GRAINS }, () => {
      const r = Math.sqrt(rand()) * 0.35
      const a = rand() * Math.PI * 2
      d.position.set(r * Math.cos(a), 0.05 + rand() * 0.08 * (1 - r / 0.35), r * Math.sin(a))
      d.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      d.updateMatrix()
      return d.matrix.clone()
    })
  }, [])

  const cold = useMemo(() => new THREE.Color('#9fc8f0'), [])
  const warm = useMemo(() => new THREE.Color('#f0b49a'), [])
  const neutral = useMemo(() => new THREE.Color('#cfe3f2'), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const visible = sim.started ? Math.round((1 - sim.extent) * GRAINS) : 0
    if (grains.current) {
      for (let i = 0; i < visible; i++) grains.current.setMatrixAt(i, grainMatrices[i])
      grains.current.count = visible
      grains.current.instanceMatrix.needsUpdate = true
    }
    // Liquid tint hints at warming (orange) or cooling (blue).
    const d = Math.max(-1, Math.min(1, sim.deltaT / 15))
    tmp.copy(neutral).lerp(d > 0 ? warm : cold, Math.abs(d))
    liquidMat.current?.color.copy(tmp)
    // Thermometer column: 0 °C at the bulb, 60 °C at the top.
    const h = Math.max(0.02, (sim.temperature / 60) * 1.6)
    if (column.current) {
      column.current.scale.y = h
      column.current.position.y = 0.15 + h / 2
    }
    if (stirrer.current && sim.started && sim.extent < 0.999) stirrer.current.rotation.y += dt * 4
  })

  return (
    <>
      <LabLights />
      <Bench width={4} depth={3} />
      {/* Outer and inner cups */}
      {[CUP_R + 0.06, CUP_R].map((r, i) => (
        <mesh key={i} position={[0, CUP_H / 2, 0]}>
          <cylinderGeometry args={[r, r * 0.82, CUP_H, 48, 1, true]} />
          <meshStandardMaterial color="#f4f4ef" roughness={0.95} transparent opacity={i ? 0.35 : 0.55} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={liquid} position={[0, level / 2 + 0.02, 0]} renderOrder={1}>
        <cylinderGeometry args={[CUP_R * (0.82 + 0.18 * (level / CUP_H)) - 0.02, CUP_R * 0.82 - 0.02, level, 48]} />
        <meshStandardMaterial ref={liquidMat} color="#cfe3f2" transparent opacity={0.6} depthWrite={false} roughness={0.2} />
      </mesh>
      <instancedMesh ref={grains} args={[undefined, undefined, GRAINS]} renderOrder={2} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </instancedMesh>
      {/* Lid */}
      <mesh position={[0, CUP_H + 0.02, 0]}>
        <cylinderGeometry args={[CUP_R + 0.1, CUP_R + 0.1, 0.05, 48]} />
        <meshStandardMaterial color="#f4f4ef" roughness={0.95} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Thermometer */}
      <group position={[0.22, 0, 0.1]}>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.1, 12]} />
          <meshStandardMaterial color={glass} transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
        <mesh ref={column} position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 1, 8]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
      </group>
      {/* Stirrer */}
      <group ref={stirrer} position={[-0.2, 0, -0.05]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 2.0, 8]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.15, 0.015, 8, 24]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.7} />
        </mesh>
      </group>
      <Label3D lines={[labels.reading]} position={[1.35, 1.6, 0]} height={0.34} />
    </>
  )
}
