import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GEL_LENGTH, LANES, SAMPLES, type GelSimulation } from '../../engines/gelElectrophoresis'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** Scene units per cm of gel. */
const K = 0.3
const GEL_D = GEL_LENGTH * K + 0.3
const LANE_GAP = 0.36
const WELL_Z = -GEL_D / 2 + 0.2

/** Gel tank with electrodes, the agarose slab with wells and bands, and the power supply. */
export function GelElectrophoresisScene({ sim, uv, selected, display }: { sim: GelSimulation; uv: boolean; selected: number; display: string[] }) {
  const bands = useRef<THREE.Group>(null)
  const dyes = useRef<THREE.Group>(null)
  const bubbles = useRef<THREE.Group>(null)
  const gelMat = useRef<THREE.MeshStandardMaterial>(null)
  const laneX = (i: number) => (i - (LANES.length - 1) / 2) * LANE_GAP
  const items = useMemo(() => LANES.flatMap((id, i) => SAMPLES[id].map((bp) => ({ id, i, bp }))), [])
  const gelColor = useMemo(() => new THREE.Color(), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    gelColor.set(uv ? '#2a1748' : '#cfe3ee')
    gelMat.current?.color.copy(gelColor)
    if (gelMat.current) gelMat.current.opacity = uv ? 0.95 : 0.55
    const w = sim.width
    bands.current?.children.forEach((m, k) => {
      const { bp } = items[k]
      const d = sim.position(bp)
      m.visible = uv && d >= 0 && d <= GEL_LENGTH
      m.position.z = WELL_Z + d * K
      m.scale.z = Math.max(0.3, w / 0.15)
    })
    const dye = sim.dye
    if (dyes.current) {
      dyes.current.visible = dye > 0.05 && dye <= GEL_LENGTH
      dyes.current.position.z = WELL_Z + dye * K
    }
    // Gas bubbles at both electrodes while current flows.
    const on = sim.settings.voltage > 0 && sim.time > 0
    bubbles.current?.children.forEach((b, i) => {
      b.visible = on
      b.position.y = 0.12 + ((t * 0.4 + i * 0.13) % 0.35)
    })
  })

  const anodeZ = sim.settings.polarity === 'normal' ? GEL_D / 2 + 0.15 : -GEL_D / 2 - 0.15
  const cathodeZ = -anodeZ
  return (
    <>
      <LabLights />
      <Bench width={5.5} depth={3.4} />
      {/* Tank and buffer */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.3, 0.44, GEL_D + 0.8]} />
        <meshStandardMaterial color="#bcd3ea" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2.2, 0.02, GEL_D + 0.7]} />
        <meshStandardMaterial color="#9cc8f0" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Agarose slab */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[LANES.length * LANE_GAP + 0.3, 0.12, GEL_D]} />
        <meshStandardMaterial ref={gelMat} color="#cfe3ee" transparent opacity={0.55} roughness={0.3} />
      </mesh>
      {/* Wells */}
      {LANES.map((id, i) => (
        <mesh key={id} position={[laneX(i), 0.265, WELL_Z]}>
          <boxGeometry args={[0.24, 0.02, 0.05]} />
          <meshStandardMaterial color={i === selected + 1 ? '#7cc24a' : uv ? '#140a26' : '#7f9db0'} />
        </mesh>
      ))}
      <group ref={bands}>
        {items.map(({ id, i, bp }) => (
          <mesh key={`${id}-${bp}`} position={[laneX(i), 0.268, WELL_Z]}>
            <boxGeometry args={[0.22, 0.012, 0.045]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={dyes}>
        {LANES.map((id, i) => (
          <mesh key={id} position={[laneX(i), 0.27, 0]}>
            <boxGeometry args={[0.22, 0.012, 0.04]} />
            <meshStandardMaterial color="#3c55d8" transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
      {/* Electrodes: platinum wires, black (−) and red (+) */}
      <mesh position={[0, 0.08, cathodeZ]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 2.1, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, 0.08, anodeZ]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 2.1, 8]} />
        <meshStandardMaterial color="#d33" />
      </mesh>
      <group ref={bubbles}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-0.9 + (i % 7) * 0.3, 0.12, i < 7 ? cathodeZ : anodeZ]}>
            <sphereGeometry args={[i < 7 ? 0.022 : 0.015, 8, 6]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      <Label3D lines={['−']} position={[1.35, 0.5, cathodeZ]} height={0.24} color="#ffffff" background="#222222" />
      <Label3D lines={['+']} position={[1.35, 0.5, anodeZ]} height={0.24} color="#ffffff" background="#c22222" />
      {/* Power supply */}
      <group position={[-2.05, 0, -0.4]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.9, 0.7, 0.8]} />
          <meshStandardMaterial color="#3a4458" />
        </mesh>
        <Label3D lines={display} position={[0, 0.42, 0.42]} height={0.26} />
      </group>
      {/* UV transilluminator glow under the gel */}
      {uv && <pointLight position={[0, -0.1, 0]} color="#8a4dff" intensity={2} distance={2.5} />}
    </>
  )
}
