import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { saltById, type SolutionSimulation } from '../../engines/solubility'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

const R = 0.6
const H = 1.5
const BASE = 0.32 // top of the hot plate
const LEVEL = 0.95 // water height for 100 g
const CRYSTALS = 400
/** Grams of undissolved salt represented by the full set of crystals. */
const FULL_PILE = 150

/** Beaker of water on a hot plate with undissolved crystals at the bottom. */
export function SolubilityScene({ sim, glass, labels }: { sim: SolutionSimulation; glass: string; labels: { temperature: string; state: string } }) {
  const crystals = useRef<THREE.InstancedMesh>(null)
  const liquidMat = useRef<THREE.MeshStandardMaterial>(null)
  const plateMat = useRef<THREE.MeshStandardMaterial>(null)

  const matrices = useMemo(() => {
    const d = new THREE.Object3D()
    let seed = 7
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    return Array.from({ length: CRYSTALS }, (_, i) => {
      // Fill a low cone from the bottom up so a bigger pile is also higher.
      const layer = i / CRYSTALS
      const r = Math.sqrt(rand()) * (R - 0.08) * (1 - 0.6 * layer)
      const a = rand() * Math.PI * 2
      d.position.set(r * Math.cos(a), BASE + 0.03 + layer * 0.3 * (1 - r / R), r * Math.sin(a))
      d.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      const s = 0.7 + rand() * 0.6
      d.scale.set(s, s, s)
      d.updateMatrix()
      return d.matrix.clone()
    })
  }, [])

  const water = useMemo(() => new THREE.Color('#cfe3f2'), [])
  const tint = useMemo(() => new THREE.Color(), [])
  const cold = useMemo(() => new THREE.Color('#3a4150'), [])
  const hot = useMemo(() => new THREE.Color('#e5484d'), [])

  useFrame(() => {
    const n = Math.min(CRYSTALS, Math.round((sim.undissolved / FULL_PILE) * CRYSTALS + (sim.undissolved > 0.05 ? 3 : 0)))
    if (crystals.current) {
      for (let i = 0; i < n; i++) crystals.current.setMatrixAt(i, matrices[i])
      crystals.current.count = n
      crystals.current.instanceMatrix.needsUpdate = true
    }
    const salt = saltById(sim.salt)
    if (liquidMat.current) {
      if (salt.color) tint.copy(water).lerp(new THREE.Color(salt.color), Math.min(1, sim.dissolved / 40))
      else tint.copy(water)
      liquidMat.current.color.copy(tint)
    }
    plateMat.current?.emissive.copy(cold).lerp(hot, Math.max(0, (sim.temperature - 20) / 80))
  })

  const crystalColor = saltById(sim.salt).color ?? '#ffffff'

  return (
    <>
      <LabLights />
      <Bench width={4.4} depth={3} />
      {/* Hot plate */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[1.8, 0.28, 1.6]} />
        <meshStandardMaterial color="#d9dde5" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.03, 48]} />
        <meshStandardMaterial ref={plateMat} color="#2a2f3a" emissive="#3a4150" roughness={0.6} />
      </mesh>
      {/* Beaker */}
      <mesh position={[0, BASE + H / 2, 0]}>
        <cylinderGeometry args={[R, R, H, 48, 1, true]} />
        <meshStandardMaterial color={glass} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} roughness={0.1} />
      </mesh>
      <mesh position={[0, BASE + 0.01, 0]}>
        <cylinderGeometry args={[R, R, 0.02, 48]} />
        <meshStandardMaterial color={glass} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {[0.3, 0.6, 0.9, 1.2].map((y) => (
        <mesh key={y} position={[R * 0.72, BASE + y, R * 0.7]} rotation-y={Math.PI / 4}>
          <boxGeometry args={[0.18, 0.012, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      <instancedMesh key={crystalColor} ref={crystals} args={[undefined, undefined, CRYSTALS]} frustumCulled={false}>
        <boxGeometry args={[0.055, 0.055, 0.055]} />
        <meshStandardMaterial color={crystalColor} roughness={0.35} />
      </instancedMesh>
      <mesh position={[0, BASE + LEVEL / 2 + 0.02, 0]} renderOrder={1}>
        <cylinderGeometry args={[R - 0.02, R - 0.02, LEVEL, 48]} />
        <meshStandardMaterial ref={liquidMat} color="#cfe3f2" transparent opacity={0.45} depthWrite={false} roughness={0.15} />
      </mesh>
      {/* Thermometer */}
      <group position={[0.3, BASE, -0.15]} rotation-z={-0.12}>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.9, 12]} />
          <meshStandardMaterial color={glass} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
      </group>
      <Label3D lines={[labels.temperature]} position={[1.45, 1.75, 0]} height={0.32} />
      <Label3D lines={[labels.state]} position={[-1.5, 1.45, 0]} height={0.26} font="600 34px Inter Variable, sans-serif" />
    </>
  )
}
