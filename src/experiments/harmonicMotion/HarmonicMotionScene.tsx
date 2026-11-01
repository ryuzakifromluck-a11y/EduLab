import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { dampedAngularFrequency, decayRate, phaseRad, stateAt, type ShmParams } from '../../engines/harmonicMotion'
import { Label3D } from '../../components/lab/Label3D'
import { Arrow, Bench, LabLights, setArrowLength } from '../shared/three'
import { springGeometry } from './springGeometry'

/** World units per metre of displacement. */
const K = 4
const WALL_X = -1.6
const EQ_X = 0.4
const BLOCK = 0.36
const CIRCLE_Y = 1.45

export function HarmonicMotionScene({ clock, labels }: { clock: RefObject<{ t: number; params: ShmParams }>; labels: { equilibrium: string; circle: string } }) {
  const spring = useRef<THREE.Mesh>(null)
  const block = useRef<THREE.Group>(null)
  const dot = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const drop = useRef<THREE.Mesh>(null)
  const vArrow = useRef<THREE.Group>(null)
  const aArrow = useRef<THREE.Group>(null)
  const geom = useMemo(() => springGeometry(), [])

  useFrame(() => {
    const { t, params } = clock.current
    const s = stateAt(params, t)
    const x = EQ_X + s.x * K
    block.current?.position.set(x, BLOCK / 2 + 0.02, 0)
    if (spring.current) {
      spring.current.position.x = WALL_X
      spring.current.scale.x = x - BLOCK / 2 - WALL_X
    }
    // Reference circle: uniform circular motion whose projection is the block's motion.
    const r = params.amplitude * Math.exp(-decayRate(params) * t) * K
    const ang = dampedAngularFrequency(params) * t + phaseRad(params)
    dot.current?.position.set(EQ_X + r * Math.cos(ang), CIRCLE_Y + r * Math.sin(ang), 0)
    if (ring.current) ring.current.scale.setScalar(Math.max(0.001, r))
    if (drop.current) {
      const top = CIRCLE_Y + r * Math.sin(ang)
      const bottom = BLOCK + 0.05
      drop.current.position.set(EQ_X + r * Math.cos(ang), (top + bottom) / 2, 0)
      drop.current.scale.y = Math.max(0.001, top - bottom)
    }
    const vMax = params.amplitude * Math.sqrt(params.k / params.mass)
    setArrowLength(vArrow.current, (s.v / Math.max(1e-9, vMax)) * 0.6)
    if (vArrow.current) vArrow.current.rotation.z = s.v >= 0 ? -Math.PI / 2 : Math.PI / 2
    const aMax = vMax * Math.sqrt(params.k / params.mass)
    setArrowLength(aArrow.current, (s.a / Math.max(1e-9, aMax)) * 0.6)
    if (aArrow.current) aArrow.current.rotation.z = s.a >= 0 ? -Math.PI / 2 : Math.PI / 2
  })

  return (
    <>
      <LabLights />
      <Bench width={5} depth={2} />
      {/* Air track */}
      <mesh position={[0, 0.0, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.04, 0.5]} />
        <meshStandardMaterial color="#9aa4b8" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[WALL_X - 0.05, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.7, 0.6]} />
        <meshStandardMaterial color="#5a6478" />
      </mesh>
      <mesh ref={spring} geometry={geom} position={[WALL_X, BLOCK / 2 + 0.02, 0]}>
        <meshStandardMaterial color="#c0c6d2" metalness={0.85} roughness={0.25} />
      </mesh>
      <group ref={block}>
        <mesh castShadow>
          <boxGeometry args={[BLOCK, BLOCK, BLOCK]} />
          <meshStandardMaterial color="#3b5bdb" roughness={0.4} />
        </mesh>
        <Arrow ref={vArrow} color="#2fbf71" position={[0, BLOCK / 2 + 0.12, 0]} />
        <Arrow ref={aArrow} color="#e5484d" position={[0, -0.02, BLOCK / 2 + 0.08]} />
      </group>
      {/* Equilibrium marker */}
      <mesh position={[EQ_X, 0.03, 0.3]}>
        <boxGeometry args={[0.02, 0.02, 0.12]} />
        <meshStandardMaterial color="#f0a85c" />
      </mesh>
      <Label3D lines={[labels.equilibrium]} position={[EQ_X, 0.12, 0.48]} height={0.12} color="#f0a85c" background={null} font="600 34px Inter Variable, sans-serif" />
      {/* Reference circle */}
      <mesh ref={ring} position={[EQ_X, CIRCLE_Y, 0]}>
        <ringGeometry args={[0.985, 1, 96]} />
        <meshBasicMaterial color="#8a93a8" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial color="#f0a85c" emissive="#f0a85c" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={drop}>
        <boxGeometry args={[0.008, 1, 0.008]} />
        <meshBasicMaterial color="#f0a85c" transparent opacity={0.6} />
      </mesh>
      <Label3D lines={[labels.circle]} position={[EQ_X, CIRCLE_Y + 1.45, 0]} height={0.13} color="#e8ecf3" background="rgba(0,0,0,0.45)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
    </>
  )
}
