import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { COIL_RADIUS, peakEmf, type InductionSimulation } from '../../engines/induction'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** World units per metre. */
const K = 9
const COIL_X = -1.2
const COIL_LEN = 0.6
const MAG_LEN = 0.9
const MAG_R = 0.1
const METER_X = COIL_X - 1.35

function coilGeometry(turns = 18) {
  const r = COIL_RADIUS * K + 0.05
  const pts: THREE.Vector3[] = []
  const n = turns * 32
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const a = u * turns * Math.PI * 2
    pts.push(new THREE.Vector3(-COIL_LEN / 2 + u * COIL_LEN, r * Math.cos(a), r * Math.sin(a)))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.022, 6, false)
}

export function InductionScene({ sim, labels }: { sim: InductionSimulation; labels: { meter: string } }) {
  const magnet = useRef<THREE.Group>(null)
  const needle = useRef<THREE.Group>(null)
  const coil = useMemo(() => coilGeometry(), [])
  const leads = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(COIL_X - COIL_LEN / 2, 0.2, 0.25),
      new THREE.Vector3(COIL_X - 0.6, 0.03, 0.3),
      new THREE.Vector3(METER_X + 0.2, 0.03, 0.1),
      new THREE.Vector3(METER_X + 0.2, 0.2, -0.3),
    ])
    return new THREE.TubeGeometry(curve, 40, 0.015, 6, false)
  }, [])
  const scale = useRef(1)

  useFrame(() => {
    // The dipole sits at the magnet's centre; z is its distance from the coil centre.
    magnet.current?.position.set(COIL_X + sim.z * K, 0.45, 0)
    if (magnet.current) magnet.current.rotation.y = sim.params.polarity === 1 ? 0 : Math.PI
    // Auto-ranging meter: full scale is the peak EMF at 1 Hz with the current coil and magnet.
    const ref = Math.max(1e-6, peakEmf({ ...sim.params, frequency: 1 }, 90))
    scale.current += (ref - scale.current) * 0.1
    const deflection = Math.max(-1, Math.min(1, sim.emf / (scale.current * 2.2)))
    if (needle.current) needle.current.rotation.z = -deflection * 1.1
  })

  return (
    <>
      <LabLights />
      <Bench width={6} depth={2.4} />
      {/* Coil on a plastic former */}
      <mesh position={[COIL_X, 0.45, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[COIL_RADIUS * K + 0.02, COIL_RADIUS * K + 0.02, COIL_LEN + 0.12, 32, 1, true]} />
        <meshStandardMaterial color="#dfe3ec" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={coil} position={[COIL_X, 0.45, 0]}>
        <meshStandardMaterial color="#c4682f" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[COIL_X, 0.07, 0]}>
        <boxGeometry args={[COIL_LEN + 0.3, 0.14, 0.7]} />
        <meshStandardMaterial color="#3a4256" />
      </mesh>
      {/* Bar magnet: red north, blue south */}
      <group ref={magnet}>
        <mesh position={[-MAG_LEN / 4, 0, 0]} rotation-z={Math.PI / 2} castShadow>
          <boxGeometry args={[MAG_R * 2, MAG_LEN / 2, MAG_R * 2]} />
          <meshStandardMaterial color="#e5484d" roughness={0.45} />
        </mesh>
        <mesh position={[MAG_LEN / 4, 0, 0]} rotation-z={Math.PI / 2} castShadow>
          <boxGeometry args={[MAG_R * 2, MAG_LEN / 2, MAG_R * 2]} />
          <meshStandardMaterial color="#3b6fe0" roughness={0.45} />
        </mesh>
        <Label3D lines={['N']} position={[-MAG_LEN / 4, 0, MAG_R + 0.01]} height={0.14} color="#ffffff" background={null} font="700 64px Inter Variable, sans-serif" />
        <Label3D lines={['S']} position={[MAG_LEN / 4, 0, MAG_R + 0.01]} height={0.14} color="#ffffff" background={null} font="700 64px Inter Variable, sans-serif" />
      </group>
      {/* Leads to the meter */}
      <mesh geometry={leads}>
        <meshStandardMaterial color="#1f2533" />
      </mesh>
      {/* Centre-zero meter */}
      <group position={[METER_X, 0.55, -0.35]} rotation-y={0.35}>
        <mesh>
          <boxGeometry args={[1.0, 0.75, 0.2]} />
          <meshStandardMaterial color="#e8ecf3" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0.105]}>
          <circleGeometry args={[0.38, 48, Math.PI * 0.15, Math.PI * 0.7]} />
          <meshBasicMaterial color="#fffdf5" />
        </mesh>
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI / 2 + ((i - 5) / 5) * 1.1
          return (
            <mesh key={i} position={[0.33 * Math.cos(a), -0.2 + 0.33 * Math.sin(a) + 0.02, 0.11]} rotation-z={a - Math.PI / 2}>
              <boxGeometry args={[0.008, i === 5 ? 0.07 : 0.04, 0.002]} />
              <meshBasicMaterial color="#222" />
            </mesh>
          )
        })}
        <group ref={needle} position={[0, -0.2, 0.115]}>
          <mesh position={[0, 0.17, 0]}>
            <boxGeometry args={[0.012, 0.34, 0.004]} />
            <meshBasicMaterial color="#e5484d" />
          </mesh>
        </group>
        <Label3D lines={[labels.meter]} position={[0, -0.27, 0.12]} height={0.09} color="#222" background={null} font="600 36px Inter Variable, sans-serif" />
      </group>
    </>
  )
}
