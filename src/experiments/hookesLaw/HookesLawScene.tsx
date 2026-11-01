import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SpringSystem } from '../../engines/hookesLaw'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** World units per metre. */
const K = 2.4
const TOP = 3.1
const DISC_H = 0.07

function verticalSpring(turns = 16, radius = 0.1, wire = 0.014) {
  const pts: THREE.Vector3[] = []
  const n = turns * 24
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const a = u * turns * Math.PI * 2
    pts.push(new THREE.Vector3(radius * Math.cos(a), -u, radius * Math.sin(a)))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 6, false)
}

export function HookesLawScene({ sys, labels }: { sys: SpringSystem; labels: { ruler: string; limit: string | null } }) {
  const spring = useRef<THREE.Mesh>(null)
  const hanger = useRef<THREE.Group>(null)
  const pointer = useRef<THREE.Mesh>(null)
  const discs = useRef<(THREE.Mesh | null)[]>([])
  const springMat = useRef<THREE.MeshStandardMaterial>(null)
  const geom = useMemo(() => verticalSpring(), [])
  const natural = sys.spring.length

  useFrame(() => {
    const len = (natural + Math.max(0, sys.x)) * K
    if (spring.current) spring.current.scale.y = len
    const bottom = TOP - len
    hanger.current?.position.set(0, bottom, 0)
    pointer.current?.position.set(0.32, bottom - 0.02, 0)
    const n = Math.round(sys.massKg * 1000) / 50
    discs.current.forEach((d, i) => {
      if (!d) return
      d.visible = i < Math.ceil(n)
      d.scale.y = i < Math.floor(n) ? 1 : 0.5
    })
    springMat.current?.color.set(sys.overLimit ? '#e8a07a' : '#c0c6d2')
  })

  const ticks = useMemo(() => Array.from({ length: 21 }, (_, i) => i * 5), [])
  const zeroY = TOP - natural * K

  return (
    <>
      <LabLights />
      <Bench width={3.5} depth={2.2} />
      {/* Retort stand */}
      <mesh position={[-0.9, 0.02, 0]}>
        <boxGeometry args={[1.0, 0.04, 0.7]} />
        <meshStandardMaterial color="#3a4256" />
      </mesh>
      <mesh position={[-1.2, 1.7, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 3.4, 16]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[-0.6, TOP + 0.05, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 1.25, 16]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh ref={spring} geometry={geom} position={[0, TOP, 0]}>
        <meshStandardMaterial ref={springMat} color="#c0c6d2" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Hanger with slotted 50 g discs */}
      <group ref={hanger}>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
          <meshStandardMaterial color="#8a93a8" metalness={0.7} />
        </mesh>
        {Array.from({ length: 20 }, (_, i) => (
          <mesh key={i} ref={(m) => void (discs.current[i] = m)} position={[0, -0.26 - i * DISC_H, 0]}>
            <cylinderGeometry args={[0.13, 0.13, DISC_H * 0.92, 28]} />
            <meshStandardMaterial color={i % 2 ? '#b08d3a' : '#c9a24a'} metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
      </group>
      {/* Metre rule: 0 at the bottom of the unstretched spring */}
      <group position={[0.42, 0, -0.05]}>
        <mesh position={[0.06, zeroY - 0.5 * K, 0]}>
          <boxGeometry args={[0.14, K * 1.04, 0.02]} />
          <meshStandardMaterial color="#f3e7c4" roughness={0.8} />
        </mesh>
        {ticks.map((cm) => (
          <mesh key={cm} position={[cm % 10 === 0 ? 0.03 : 0.015, zeroY - (cm / 100) * K, 0.012]}>
            <boxGeometry args={[cm % 10 === 0 ? 0.06 : 0.03, 0.006, 0.004]} />
            <meshBasicMaterial color="#222" />
          </mesh>
        ))}
        {ticks
          .filter((cm) => cm % 20 === 0)
          .map((cm) => (
            <Label3D key={cm} lines={[`${cm}`]} position={[0.1, zeroY - (cm / 100) * K, 0.02]} height={0.12} color="#222" background={null} font="600 40px Inter Variable, sans-serif" />
          ))}
        <Label3D lines={[labels.ruler]} position={[0.08, zeroY + 0.16, 0.02]} height={0.14} color="#e8ecf3" background="rgba(0,0,0,0.5)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      </group>
      <mesh ref={pointer} rotation-z={Math.PI / 2}>
        <coneGeometry args={[0.035, 0.12, 12]} />
        <meshStandardMaterial color="#e5484d" />
      </mesh>
      {labels.limit && (
        <Label3D lines={[labels.limit]} position={[-0.4, TOP + 0.35, 0]} height={0.16} color="#ffb4a2" background="rgba(60,0,0,0.6)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      )}
    </>
  )
}
