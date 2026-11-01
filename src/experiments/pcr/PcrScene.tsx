import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PcrSimulation } from '../../engines/pcr'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { heatColor } from '../shared/lab'
import { strandPose } from './strands'

const STRAND_LEN = 2.6
const STRAND_Y = 2.0

/** Thermal cycler with eight tubes, and a magnified template showing the current step of the cycle. */
export function PcrScene({ sim, display }: { sim: PcrSimulation; display: string[] }) {
  const block = useRef<THREE.MeshStandardMaterial>(null)
  const lid = useRef<THREE.Group>(null)
  const top = useRef<THREE.Group>(null)
  const bottom = useRef<THREE.Group>(null)
  const primerA = useRef<THREE.Mesh>(null)
  const primerB = useRef<THREE.Mesh>(null)
  const newA = useRef<THREE.Mesh>(null)
  const newB = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.PointLight>(null)
  const color = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const st = sim.state
    const pose = strandPose(st.phase, st.stepProgress, sim.settings)
    color.set(heatColor(st.temp, 4, 100))
    block.current?.color.copy(color)
    block.current?.emissive.copy(color)
    if (glow.current) {
      glow.current.color.copy(color)
      glow.current.intensity = st.phase === 'idle' ? 0 : 0.6 + st.temp / 60
    }
    if (lid.current) lid.current.rotation.x = sim.time > 0 && !sim.done ? 0 : -1.1
    const half = 0.12 + 0.35 * pose.gap
    if (top.current) top.current.position.y = STRAND_Y + half
    if (bottom.current) bottom.current.position.y = STRAND_Y - half
    // Primers bind at opposite ends and are extended toward each other.
    for (const [p, y, side] of [
      [primerA.current, STRAND_Y + half - 0.14, -1],
      [primerB.current, STRAND_Y - half + 0.14, 1],
    ] as const) {
      if (!p) continue
      p.visible = pose.primers > 0
      p.scale.x = pose.primers
      p.position.set((side * STRAND_LEN) / 2 - side * 0.2, y, 0)
    }
    for (const [m, y, side] of [
      [newA.current, STRAND_Y + half - 0.14, -1],
      [newB.current, STRAND_Y - half + 0.14, 1],
    ] as const) {
      if (!m) continue
      const len = Math.max(0.001, (STRAND_LEN - 0.4) * pose.built)
      m.visible = pose.built > 0.01
      m.scale.x = len
      m.position.set((side * STRAND_LEN) / 2 - side * (0.4 + len / 2), y, 0)
    }
  })

  const tubes = Array.from({ length: 8 }, (_, i) => -0.84 + i * 0.24)
  return (
    <>
      <LabLights />
      <Bench width={5} depth={3} />
      {/* Cycler body */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.4, 0.9, 1.6]} />
        <meshStandardMaterial color="#e6e9ef" roughness={0.6} />
      </mesh>
      <mesh position={[0.65, 0.5, 0.81]}>
        <boxGeometry args={[0.8, 0.4, 0.02]} />
        <meshStandardMaterial color="#0f1a14" />
      </mesh>
      <Label3D lines={display} position={[0.65, 0.5, 0.86]} height={0.32} />
      {/* Heated block (colour follows its temperature) and tubes */}
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[2.0, 0.08, 0.5]} />
        <meshStandardMaterial ref={block} color="#888" emissiveIntensity={0.25} metalness={0.4} roughness={0.4} />
      </mesh>
      <pointLight ref={glow} position={[0, 1.2, 0.3]} distance={2} intensity={0} />
      {tubes.map((x) => (
        <group key={x} position={[x, 1.0, 0]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.07, 0.035, 0.26, 16]} />
            <meshStandardMaterial color="#f4f6fb" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.055, 0.03, 0.08, 12]} />
            <meshStandardMaterial color="#8fc6ff" transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
      {/* Heated lid on a hinge at the back */}
      <group ref={lid} position={[0, 0.95, -0.8]}>
        <mesh position={[0, 0.06, 0.8]}>
          <boxGeometry args={[2.3, 0.12, 1.6]} />
          <meshStandardMaterial color="#c9ced9" roughness={0.5} />
        </mesh>
      </group>

      {/* Magnified template: two strands, primers and the new strands */}
      <group ref={top}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, STRAND_LEN, 12]} />
          <meshStandardMaterial color="#4c7be0" />
        </mesh>
      </group>
      <group ref={bottom}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, STRAND_LEN, 12]} />
          <meshStandardMaterial color="#4c7be0" />
        </mesh>
      </group>
      <mesh ref={primerA}>
        <boxGeometry args={[0.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#f0a85c" emissive="#f0a85c" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={primerB}>
        <boxGeometry args={[0.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#f0a85c" emissive="#f0a85c" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={newA}>
        <boxGeometry args={[1, 0.08, 0.08]} />
        <meshStandardMaterial color="#7cc24a" emissive="#7cc24a" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={newB}>
        <boxGeometry args={[1, 0.08, 0.08]} />
        <meshStandardMaterial color="#7cc24a" emissive="#7cc24a" emissiveIntensity={0.3} />
      </mesh>
    </>
  )
}
