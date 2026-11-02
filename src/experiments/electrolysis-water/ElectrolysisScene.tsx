import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ChemEquipment } from '../../components/chemistry/ChemEquipment'
import { ReactionEffect } from '../../components/chemistry/ReactionEffect'
import { Label3D } from '../../components/lab/Label3D'
import { ELECTRODES, TUBE_CAPACITY } from '../../engines/electrolysisWater'
import { Bench, LabLights } from '../shared/three'
import type { ElectrolysisController } from './useElectrolysis'

const TUBE_R = 0.13
const TUBE_X = 0.55
const BOTTOM = 0.55
const TOP = 3.4
/** y of the 0 mL mark (gas collects from the tap downwards). */
const GRAD_TOP = TOP - 0.15
const GRAD_LEN = 2.3
const ELECTRODE_Y = BOTTOM + 0.3
const WATER = '#8fbdf0'

const gasLength = (mL: number) => (Math.min(mL, TUBE_CAPACITY) / TUBE_CAPACITY) * GRAD_LEN

/** One collecting tube: glass, liquid below the gas, graduations, tap and electrode. */
function Tube({ x, liquid, electrodeColor }: { x: number; liquid: React.RefObject<THREE.Mesh | null>; electrodeColor: string }) {
  const marks = [0, 10, 20, 30, 40, 50]
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, (TOP + BOTTOM) / 2, 0]}>
        <cylinderGeometry args={[TUBE_R, TUBE_R, TOP - BOTTOM, 32, 1, true]} />
        <meshStandardMaterial color="#d8e6ff" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} roughness={0.1} />
      </mesh>
      <mesh ref={liquid} renderOrder={1}>
        <cylinderGeometry args={[TUBE_R * 0.9, TUBE_R * 0.9, 1, 24]} />
        <meshStandardMaterial color={WATER} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {marks.map((ml) => (
        <mesh key={ml} position={[0, GRAD_TOP - (ml / TUBE_CAPACITY) * GRAD_LEN, TUBE_R]}>
          <boxGeometry args={[0.1, 0.008, 0.002]} />
          <meshBasicMaterial color="#5b6478" />
        </mesh>
      ))}
      {/* Tap at the top */}
      <mesh position={[0, TOP + 0.08, 0]}>
        <cylinderGeometry args={[0.04, TUBE_R, 0.16, 20]} />
        <meshStandardMaterial color="#d8e6ff" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, TOP + 0.12, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 0.22, 12]} />
        <meshStandardMaterial color="#2b3245" />
      </mesh>
      {/* Electrode */}
      <mesh position={[0, ELECTRODE_Y, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.02]} />
        <meshStandardMaterial color={electrodeColor} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, BOTTOM - 0.15, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
        <meshStandardMaterial color="#8a909c" />
      </mesh>
    </group>
  )
}

/** Hofmann voltameter wired to a DC supply. Bubbles rise from both electrodes into the side tubes. */
export function ElectrolysisScene({ ctl, labels }: { ctl: ElectrolysisController; labels: { h2: string; o2: string; supply: string; cathode: string; anode: string } }) {
  const left = useRef<THREE.Mesh>(null)
  const right = useRef<THREE.Mesh>(null)
  const anodeMat = useRef<THREE.MeshStandardMaterial>(null)
  const smooth = useRef({ h2: 0, o2: 0 })
  const blue = useMemo(() => new THREE.Color('#2f74c0'), [])
  const water = useMemo(() => new THREE.Color(WATER), [])

  useFrame(() => {
    const s = smooth.current
    s.h2 += (ctl.volumes.h2 - s.h2) * 0.2
    s.o2 += (ctl.volumes.o2 - s.o2) * 0.2
    for (const [mesh, ml] of [
      [left.current, s.h2],
      [right.current, s.o2],
    ] as const) {
      if (!mesh) continue
      const top = GRAD_TOP - gasLength(ml)
      mesh.scale.y = Math.max(0.001, top - BOTTOM)
      mesh.position.y = (top + BOTTOM) / 2
    }
    if (anodeMat.current) anodeMat.current.color.copy(water).lerp(blue, ctl.copperBlue * 0.8)
  })

  const rate = ctl.current
  const bubbling = rate > 1e-4
  const electrodeColor = ELECTRODES[ctl.electrode].color
  const sinceTest = ctl.test ? (performance.now() - ctl.test.at) / 1000 : Infinity

  return (
    <>
      <LabLights />
      <Bench width={5} depth={3} />
      {/* Stand */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2, 0.1, 0.8]} />
        <meshStandardMaterial color="#3a4256" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.9, -0.35]}>
        <cylinderGeometry args={[0.035, 0.035, 3.7, 12]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Bottom connecting tube and central reservoir */}
      <mesh position={[0, BOTTOM, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[TUBE_R * 0.8, TUBE_R * 0.8, TUBE_X * 2, 24]} />
        <meshStandardMaterial ref={anodeMat} color={WATER} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 3.3, 20]} />
        <meshStandardMaterial color={WATER} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.95, 0]}>
        <sphereGeometry args={[0.28, 24, 16]} />
        <meshStandardMaterial color="#d8e6ff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <Tube x={-TUBE_X} liquid={left} electrodeColor={electrodeColor} />
      <Tube x={TUBE_X} liquid={right} electrodeColor={electrodeColor} />
      {/* Bubbles: hydrogen at the cathode forms twice as fast as oxygen at the anode */}
      <ReactionEffect effect="electrolytic-bubble" active={bubbling} speed={Math.min(3, 0.6 + rate * 3)} playing={ctl.powerOn} position={[-TUBE_X, ELECTRODE_Y + 0.55, TUBE_R + 0.01]} height={1.1} color="#4f6f99" />
      <ReactionEffect
        effect="electrolytic-bubble"
        active={bubbling && ctl.inertAnode}
        speed={Math.min(3, 0.3 + rate * 1.5)}
        playing={ctl.powerOn}
        position={[TUBE_X, ELECTRODE_Y + 0.55, TUBE_R + 0.01]}
        height={1.1}
        color="#4f6f99"
        opacity={0.75}
      />
      {/* Splint tests at the taps */}
      {ctl.test?.gas === 'H2' && ctl.test.result === 'pop' && sinceTest < 1 && <ReactionEffect key={ctl.test.at} effect="explode" position={[-TUBE_X, TOP + 0.45, 0.3]} height={0.9} />}
      {ctl.test?.gas === 'O2' && ctl.test.result === 'relight' && sinceTest < 2.5 && <ReactionEffect key={ctl.test.at} effect="candle-fire" position={[TUBE_X, TOP + 0.4, 0.1]} height={0.45} />}
      <Label3D lines={[labels.cathode, labels.h2]} position={[-TUBE_X - 0.75, 2.9, 0]} height={0.36} />
      <Label3D lines={[labels.anode, labels.o2]} position={[TUBE_X + 0.75, 2.9, 0]} height={0.36} />
      {/* Power supply and wires */}
      <ChemEquipment item="battery" position={[0, 0.5, 1.1]} height={0.55} />
      <Label3D lines={[labels.supply]} position={[0, 1.05, 1.1]} height={0.2} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * TUBE_X * 0.6, 0.32, 0.55]} rotation={[Math.PI / 2.6, 0, side * 0.6]}>
          <cylinderGeometry args={[0.012, 0.012, 1.0, 8]} />
          <meshStandardMaterial color={side < 0 ? '#1f2430' : '#d6332a'} emissive={ctl.powerOn ? (side < 0 ? '#000000' : '#5a1010') : '#000000'} />
        </mesh>
      ))}
    </>
  )
}
