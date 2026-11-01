import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { EquilibriumSimulation } from '../../engines/equilibrium'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { V_MAX } from './useEquilibrium'

const RADIUS = 0.5
const END = -1.6 // closed end of the syringe
const LENGTH_PER_L = 1.5 // world units of barrel per litre
const MOL_PER_PARTICLE = 0.0006
const MAX = 260
const Y = 0.75

/** Gas syringe: the brown colour is NO₂; pale pairs are N₂O₄ molecules. */
export function EquilibriumScene({ sim, glass, labels }: { sim: EquilibriumSimulation; glass: string; labels: { no2: string; n2o4: string; reading: string } }) {
  const gas = useRef<THREE.Mesh>(null)
  const gasMat = useRef<THREE.MeshStandardMaterial>(null)
  const piston = useRef<THREE.Group>(null)
  const no2 = useRef<THREE.InstancedMesh>(null)
  const n2o4 = useRef<THREE.InstancedMesh>(null)

  // Fixed random positions in a unit cylinder (x along the barrel 0–1), plus a phase for jiggling.
  const seeds = useMemo(() => {
    let seed = 3
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    return Array.from({ length: MAX * 2 }, () => {
      const r = Math.sqrt(rand()) * (RADIUS - 0.07)
      const a = rand() * Math.PI * 2
      return { u: rand(), y: r * Math.cos(a), z: r * Math.sin(a), p: rand() * 100, w: 0.6 + rand() }
    })
  }, [])
  const d = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    const L = sim.volume * LENGTH_PER_L
    if (gas.current) {
      gas.current.scale.y = L
      gas.current.position.x = END + L / 2
    }
    // Colour intensity follows the NO₂ concentration.
    if (gasMat.current) gasMat.current.opacity = Math.min(0.85, sim.no2 * 22)
    if (piston.current) piston.current.position.x = END + L
    const t = state.clock.elapsedTime
    const place = (mesh: THREE.InstancedMesh | null, n: number, offset: number) => {
      if (!mesh) return
      const count = Math.min(MAX, Math.round(n))
      for (let i = 0; i < count; i++) {
        const s = seeds[i + offset]
        const j = 0.05
        d.position.set(
          END + 0.06 + (s.u * (L - 0.12)) + Math.sin(t * s.w * 3 + s.p) * j,
          Y + s.y + Math.sin(t * s.w * 2.3 + s.p * 2) * j,
          s.z + Math.cos(t * s.w * 2.7 + s.p) * j,
        )
        d.rotation.set(t * s.w + s.p, t * s.w * 0.7, 0)
        d.scale.setScalar(1)
        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
    }
    place(no2.current, sim.nNO2 / MOL_PER_PARTICLE, 0)
    place(n2o4.current, sim.nN2O4 / MOL_PER_PARTICLE, MAX)
  })

  const barrel = V_MAX * LENGTH_PER_L + 0.3
  return (
    <>
      <LabLights />
      <Bench width={5} depth={2.6} />
      {/* Clamp stand */}
      {[END + 0.4, END + barrel - 0.4].map((x) => (
        <mesh key={x} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.16, 0.24, 0.9]} />
          <meshStandardMaterial color="#5a6478" metalness={0.5} />
        </mesh>
      ))}
      {/* Barrel */}
      <mesh position={[END + barrel / 2, Y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[RADIUS, RADIUS, barrel, 40, 1, true]} />
        <meshStandardMaterial color={glass} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} roughness={0.08} />
      </mesh>
      <mesh position={[END - 0.02, Y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[RADIUS, RADIUS, 0.04, 40]} />
        <meshStandardMaterial color={glass} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* Brown NO₂ haze */}
      <mesh ref={gas} position={[END + 0.75, Y, 0]} rotation-z={Math.PI / 2} renderOrder={1}>
        <cylinderGeometry args={[RADIUS - 0.02, RADIUS - 0.02, 1, 40]} />
        <meshStandardMaterial ref={gasMat} color="#9a4416" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <group ref={piston}>
        <mesh position={[0.03, Y, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[RADIUS - 0.01, RADIUS - 0.01, 0.08, 40]} />
          <meshStandardMaterial color="#2a2f3a" roughness={0.6} />
        </mesh>
        <mesh position={[1.2, Y, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 2.3, 16]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.6} />
        </mesh>
        <mesh position={[2.35, Y, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.6} />
        </mesh>
      </group>
      <instancedMesh ref={no2} args={[undefined, undefined, MAX]} frustumCulled={false} renderOrder={2}>
        <sphereGeometry args={[0.045, 12, 8]} />
        <meshStandardMaterial color="#b4501a" roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={n2o4} args={[undefined, undefined, MAX]} frustumCulled={false} renderOrder={2}>
        <capsuleGeometry args={[0.04, 0.07, 4, 10]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.4} />
      </instancedMesh>
      <Label3D lines={[labels.reading]} position={[0.2, 1.68, 0]} height={0.28} />
      <Label3D lines={[labels.no2]} position={[END + 0.2, -0.05, 0.9]} height={0.18} color="#f0a070" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      <Label3D lines={[labels.n2o4]} position={[END + 1.4, -0.05, 0.9]} height={0.18} color="#efe6cf" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
    </>
  )
}
