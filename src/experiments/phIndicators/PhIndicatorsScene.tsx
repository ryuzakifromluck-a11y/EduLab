import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { IndicatorId } from '../../engines/indicators'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { TUBE_ORDER, tubeColor } from './tubes'

const GAP = 0.46
const R = 0.13
const H = 1.3
const FILL = 0.62
const X0 = -((TUBE_ORDER.length - 1) * GAP) / 2

/** A rack of test tubes: the same sample with a different indicator in each. */
export function PhIndicatorsScene({ pH, selected, glass, labels }: { pH: number; selected: IndicatorId; glass: string; labels: { names: Record<IndicatorId, string>; reading: string } }) {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const tubes = useRef<(THREE.Group | null)[]>([])
  const target = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4) // colours develop over about half a second
    TUBE_ORDER.forEach((ind, i) => {
      const m = mats.current[i]
      if (m) m.color.lerp(target.set(tubeColor(ind, pH)), k)
      const g = tubes.current[i]
      if (g) g.position.y += ((ind.id === selected ? 0.25 : 0) - g.position.y) * k
    })
  })

  return (
    <>
      <LabLights />
      <Bench width={4.6} depth={2.6} />
      {/* Rack */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[TUBE_ORDER.length * GAP + 0.3, 0.06, 0.5]} />
        <meshStandardMaterial color="#b98a5a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[TUBE_ORDER.length * GAP + 0.3, 0.06, 0.5]} />
        <meshStandardMaterial color="#b98a5a" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * ((TUBE_ORDER.length * GAP) / 2 + 0.12), 0.27, 0]}>
          <boxGeometry args={[0.06, 0.5, 0.5]} />
          <meshStandardMaterial color="#a57a4d" roughness={0.8} />
        </mesh>
      ))}
      {TUBE_ORDER.map((ind, i) => (
        <group key={ind.id} position={[X0 + i * GAP, 0, 0]}>
          <group ref={(g) => void (tubes.current[i] = g)}>
            <mesh position={[0, 0.06 + R + H / 2, 0]}>
              <cylinderGeometry args={[R, R, H, 32, 1, true]} />
              <meshStandardMaterial color={glass} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.06 + R + FILL / 2, 0]} renderOrder={1}>
              <cylinderGeometry args={[R - 0.015, R - 0.015, FILL, 32]} />
              <meshStandardMaterial ref={(m) => void (mats.current[i] = m)} color="#dfe9f2" roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.06 + R, 0]} renderOrder={1}>
              <sphereGeometry args={[R - 0.015, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <meshStandardMaterial ref={(m) => void (mats.current[i + TUBE_ORDER.length] = m)} color="#dfe9f2" roughness={0.25} />
            </mesh>
          </group>
          <Label3D
            lines={[labels.names[ind.id]]}
            position={[0, -0.22, 0.42]}
            height={0.19}
            color={ind.id === selected ? '#ffffff' : '#c9d1e0'}
            background={ind.id === selected ? 'rgba(18,140,110,0.9)' : 'rgba(0,0,0,0.55)'}
            border="rgba(0,0,0,0)"
            font="600 30px Inter Variable, sans-serif"
          />
        </group>
      ))}
      <BottomSync mats={mats} />
      <Label3D lines={[labels.reading]} position={[0, 2.0, -0.3]} height={0.28} />
    </>
  )
}

/** The rounded bottoms follow their tube's colour. */
function BottomSync({ mats }: { mats: RefObject<(THREE.MeshStandardMaterial | null)[]> }) {
  useFrame(() => {
    const n = TUBE_ORDER.length
    for (let i = 0; i < n; i++) {
      const top = mats.current[i]
      const bottom = mats.current[i + n]
      if (top && bottom) bottom.color.copy(top.color)
    }
  })
  return null
}
