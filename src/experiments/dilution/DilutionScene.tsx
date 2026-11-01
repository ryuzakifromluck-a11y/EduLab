import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DilutionSimulation } from '../../engines/dilution'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { BULB_R, MARK, NECK_H, NECK_R, liquidHeight } from './flask'
import { blueness } from './useDilution'

const WATER = new THREE.Color('#e3eef7')
const BLUE = new THREE.Color('#1f63c9')
const tint = (c: number, out: THREE.Color) => out.copy(WATER).lerp(BLUE, blueness(c))

/** Volumetric flask, stock beaker, pipette and wash-bottle stream. */
export function DilutionScene({ sim, glass, labels }: { sim: DilutionSimulation; glass: string; labels: { stock: string; flask: string } }) {
  const scale = Math.cbrt(sim.v2 / 100)
  const cap = useRef<THREE.Mesh>(null)
  const top = useRef<THREE.Mesh>(null)
  const neck = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const stockLayer = useRef<THREE.Mesh>(null)
  const stockMat = useRef<THREE.MeshStandardMaterial>(null)
  const pipette = useRef<THREE.Group>(null)
  const stream = useRef<THREE.Mesh>(null)
  const flask = useRef<THREE.Group>(null)
  const tmp = useMemo(() => new THREE.Color(), [])
  const cap2 = useMemo(() => new THREE.Color(), [])
  const stockColor = useMemo(() => tint(sim.c1, new THREE.Color()), [sim.c1])

  useFrame((state) => {
    const R = BULB_R
    const f = sim.volume / sim.v2
    const h = liquidHeight(f)
    const inBulb = Math.min(h, 2 * R)
    // Bottom cap of the bulb, as a partial sphere.
    if (cap.current) {
      cap.current.visible = h > 0.001
      const theta = Math.acos(1 - inBulb / R)
      const g = cap.current.geometry as THREE.SphereGeometry
      if (Math.abs(g.parameters.thetaLength - theta) > 1e-4) {
        g.dispose()
        cap.current.geometry = new THREE.SphereGeometry(R - 0.012, 40, 20, 0, Math.PI * 2, Math.PI - theta, theta)
      }
    }
    if (top.current) {
      const y = inBulb - R
      const r = Math.sqrt(Math.max(0, R * R - y * y))
      top.current.visible = h > 0.001 && h < 2 * R - 0.01
      top.current.position.y = R + y
      top.current.scale.set(Math.max(0.001, r - 0.012), 1, Math.max(0.001, r - 0.012))
    }
    if (neck.current) {
      const nh = Math.max(0, h - 2 * R)
      neck.current.visible = nh > 0.001
      neck.current.scale.y = Math.max(0.001, nh)
      neck.current.position.y = 2 * R + nh / 2
    }
    // Until it is mixed the colour sits in a dense layer at the bottom.
    const mixed = sim.mixing
    tint(sim.concentration, cap2)
    tmp.copy(WATER).lerp(cap2, mixed)
    mat.current?.color.copy(tmp)
    if (stockLayer.current && stockMat.current) {
      const hs = liquidHeight(sim.v1 / sim.v2)
      stockLayer.current.visible = sim.stage !== 'empty' && mixed < 0.999
      const theta = Math.acos(1 - Math.min(hs, 2 * R) / R)
      const g = stockLayer.current.geometry as THREE.SphereGeometry
      if (Math.abs(g.parameters.thetaLength - theta) > 1e-4) {
        g.dispose()
        stockLayer.current.geometry = new THREE.SphereGeometry(R - 0.02, 40, 20, 0, Math.PI * 2, Math.PI - theta, theta)
      }
      stockMat.current.opacity = 0.9 * (1 - mixed)
    }
    if (pipette.current) pipette.current.visible = sim.stage === 'stock'
    if (stream.current) {
      stream.current.visible = sim.stage === 'filling'
      stream.current.scale.x = stream.current.scale.z = 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 30)
    }
    // Inverting the flask to mix: a quick rock back and forth.
    if (flask.current) flask.current.rotation.z = sim.stage === 'mark' ? Math.sin(state.clock.elapsedTime * 5) * 0.5 * Math.sin(Math.PI * sim.mixing) : 0
  })

  const R = BULB_R
  return (
    <>
      <LabLights />
      <Bench width={4.4} depth={3} />
      <group ref={flask} scale={scale}>
        {/* Glass */}
        <mesh position={[0, R, 0]}>
          <sphereGeometry args={[R, 48, 32]} />
          <meshStandardMaterial color={glass} transparent opacity={0.25} depthWrite={false} roughness={0.08} />
        </mesh>
        <mesh position={[0, 2 * R + NECK_H / 2 - 0.05, 0]}>
          <cylinderGeometry args={[NECK_R, NECK_R, NECK_H, 24, 1, true]} />
          <meshStandardMaterial color={glass} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 2 * R + MARK * NECK_H, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[NECK_R + 0.003, 0.006, 6, 32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Liquid */}
        <mesh ref={cap} position={[0, R, 0]} renderOrder={1}>
          <sphereGeometry args={[R - 0.012, 40, 20, 0, Math.PI * 2, Math.PI - 0.01, 0.01]} />
          <meshStandardMaterial ref={mat} color="#e3eef7" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={top} renderOrder={1}>
          <cylinderGeometry args={[1, 1, 0.004, 40]} />
          <meshStandardMaterial color="#e3eef7" transparent opacity={0.6} depthWrite={false} />
        </mesh>
        <mesh ref={neck} renderOrder={1}>
          <cylinderGeometry args={[NECK_R - 0.01, NECK_R - 0.01, 1, 20]} />
          <meshStandardMaterial color="#e3eef7" transparent opacity={0.8} depthWrite={false} />
        </mesh>
        <mesh ref={stockLayer} position={[0, R, 0]} renderOrder={2}>
          <sphereGeometry args={[R - 0.02, 40, 20, 0, Math.PI * 2, Math.PI - 0.01, 0.01]} />
          <meshStandardMaterial ref={stockMat} color={stockColor} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Pipette delivering the stock */}
        <group ref={pipette} position={[0, 2 * R + 0.3, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.012, 2.0, 12]} />
            <meshStandardMaterial color={glass} transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
        {/* Water from the wash bottle */}
        <mesh ref={stream} position={[0, 2 * R + NECK_H + 0.3, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.9, 8]} />
          <meshStandardMaterial color="#9cc8f0" transparent opacity={0.7} />
        </mesh>
      </group>
      {/* Stock solution */}
      <group position={[-1.5, 0, 0.2]}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.7, 32, 1, true]} />
          <meshStandardMaterial color={glass} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.24, 0]} renderOrder={1}>
          <cylinderGeometry args={[0.28, 0.28, 0.46, 32]} />
          <meshStandardMaterial color={stockColor} transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <Label3D lines={[labels.stock]} position={[0, 0.98, 0]} height={0.24} font="600 34px Inter Variable, sans-serif" />
      </group>
      <Label3D lines={[labels.flask]} position={[1.55, 1.6, 0]} height={0.3} />
    </>
  )
}
