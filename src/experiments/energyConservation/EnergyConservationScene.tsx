import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { trackHeight, X_MAX, type EnergySimulation } from '../../engines/energyConservation'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** World units per metre. */
const K = 0.6
const BAR_H = 2.2
const BAR_X = X_MAX * K + 0.9
const BALL_R = 0.14

export function EnergyConservationScene({ sim, labels }: { sim: EnergySimulation; labels: { kinetic: string; potential: string; thermal: string; release: string } }) {
  const ball = useRef<THREE.Mesh>(null)
  const bars = useRef<(THREE.Mesh | null)[]>([])
  const release = useRef<THREE.Mesh>(null)

  const rails = useMemo(() => {
    const pts = Array.from({ length: 81 }, (_, i) => {
      const x = -X_MAX + (2 * X_MAX * i) / 80
      return new THREE.Vector3(x * K, trackHeight(x) * K, 0)
    })
    const curve = new THREE.CatmullRomCurve3(pts)
    return [-0.18, 0.18].map((z) => {
      const g = new THREE.TubeGeometry(curve, 160, 0.035, 8, false)
      g.translate(0, 0, z)
      return g
    })
  }, [])

  const ties = useMemo(
    () =>
      Array.from({ length: 33 }, (_, i) => {
        const x = -X_MAX + (2 * X_MAX * i) / 32
        const angle = Math.atan(2 * 0.25 * x)
        return { position: [x * K, trackHeight(x) * K - 0.03, 0] as [number, number, number], angle }
      }),
    [],
  )

  useFrame(() => {
    const x = sim.x
    const h = trackHeight(x)
    // Offset the ball along the track normal so it sits on the rails.
    const slope = 2 * 0.25 * x
    const nrm = new THREE.Vector2(-slope, 1).normalize()
    ball.current?.position.set(x * K + nrm.x * BALL_R, h * K + nrm.y * BALL_R + 0.02, 0)
    const e = sim.energies
    const vals = [e.kinetic, e.potential, e.thermal]
    vals.forEach((v, i) => {
      const m = bars.current[i]
      if (!m) return
      const f = e.total > 0 ? v / e.total : 0
      m.scale.y = Math.max(0.001, f)
      m.position.y = (f * BAR_H) / 2 + 0.01
    })
    if (release.current) release.current.position.y = Math.min(sim.params.height, trackHeight(X_MAX)) * K
  })

  const barColors = ['#2fbf71', '#4c8dff', '#f0a85c']
  const barLabels = [labels.kinetic, labels.potential, labels.thermal]

  return (
    <>
      <LabLights />
      <Bench width={9} depth={2.6} />
      {rails.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      {ties.map((tie, i) => (
        <mesh key={i} position={tie.position} rotation-z={tie.angle}>
          <boxGeometry args={[0.05, 0.03, 0.46]} />
          <meshStandardMaterial color="#6b4f3a" roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * X_MAX * K, (trackHeight(X_MAX) * K) / 2, -0.25]}>
          <boxGeometry args={[0.06, trackHeight(X_MAX) * K, 0.06]} />
          <meshStandardMaterial color="#5a6478" />
        </mesh>
      ))}
      {/* Release height reference */}
      <mesh ref={release} position={[0, 0, -0.3]}>
        <boxGeometry args={[X_MAX * 2 * K, 0.01, 0.01]} />
        <meshBasicMaterial color="#f0a85c" transparent opacity={0.7} />
      </mesh>
      <Label3D lines={[labels.release]} position={[-X_MAX * K - 0.1, Math.min(sim.params.height, 4) * K + 0.18, -0.3]} height={0.15} color="#f0a85c" background={null} font="600 34px Inter Variable, sans-serif" />
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[BALL_R, 32, 32]} />
        <meshStandardMaterial color="#e5484d" roughness={0.35} />
      </mesh>
      {/* Energy bars, each as a share of the total energy */}
      <group position={[BAR_X, 0, 0]}>
        {barColors.map((color, i) => (
          <group key={i} position={[(i - 1) * 0.36, 0, 0]}>
            <mesh position={[0, BAR_H / 2, -0.01]}>
              <boxGeometry args={[0.28, BAR_H, 0.02]} />
              <meshStandardMaterial color="#1f2533" transparent opacity={0.35} />
            </mesh>
            <mesh ref={(m) => void (bars.current[i] = m)} position={[0, 0, 0.02]}>
              <boxGeometry args={[0.26, BAR_H, 0.12]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
            <Label3D lines={[barLabels[i]]} position={[0, -0.18, 0.1]} height={0.13} color="#e8ecf3" background="rgba(0,0,0,0.5)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
          </group>
        ))}
      </group>
    </>
  )
}
