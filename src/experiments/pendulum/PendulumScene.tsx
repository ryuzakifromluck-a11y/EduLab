import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PendulumSimulation } from '../../engines/pendulum'

const PIVOT_Y = 3.4
const TRAIL_POINTS = 140

/** 3D pendulum rig: everything is in metres, the pivot sits 3.4 m above the base. */
export function PendulumScene({
  sim,
  trail,
  accent,
}: {
  sim: PendulumSimulation
  trail: boolean
  accent: string
}) {
  const arm = useRef<THREE.Group>(null)
  const string = useRef<THREE.Mesh>(null)
  const bob = useRef<THREE.Mesh>(null)
  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const trailCount = useRef(0)
  const arcGeom = useMemo(() => new THREE.BufferGeometry(), [])

  const trailLine = useMemo(
    () => new THREE.Line(trailGeom, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55 })),
    [trailGeom, accent],
  )
  const arcLine = useMemo(
    () => new THREE.Line(arcGeom, new THREE.LineBasicMaterial({ color: '#f0a85c' })),
    [arcGeom],
  )

  useFrame(() => {
    const { theta } = sim.state
    const L = sim.params.length
    if (arm.current) arm.current.rotation.z = theta
    if (string.current) {
      string.current.scale.y = L
      string.current.position.y = -L / 2
    }
    if (bob.current) bob.current.position.y = -L

    // Motion trail of the bob in world space.
    const x = L * Math.sin(theta)
    const y = PIVOT_Y - L * Math.cos(theta)
    const pos = trailGeom.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    if (trailCount.current < TRAIL_POINTS) trailCount.current++
    arr.copyWithin(3, 0, (TRAIL_POINTS - 1) * 3)
    arr[0] = x
    arr[1] = y
    arr[2] = 0
    pos.needsUpdate = true
    trailGeom.setDrawRange(0, trailCount.current)

    // Angle arc from the vertical to the string.
    const r = Math.min(0.6, L * 0.4)
    const steps = 24
    const pts: number[] = []
    for (let i = 0; i <= steps; i++) {
      const a = (theta * i) / steps
      pts.push(r * Math.sin(a), PIVOT_Y - r * Math.cos(a), 0.01)
    }
    arcGeom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  })

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 7, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />

      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[4, 64]} />
        <meshStandardMaterial color="#8792ab" roughness={0.95} transparent opacity={0.12} />
      </mesh>
      <gridHelper args={[8, 16, '#7d88a3', '#7d88a3']} position-y={0.002} material-transparent material-opacity={0.18} />

      {/* Stand */}
      <mesh position={[-1.6, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.08, 0.7]} />
        <meshStandardMaterial color="#3a4256" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[-1.6, PIVOT_Y / 2 + 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, PIVOT_Y + 0.1, 16]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[-0.75, PIVOT_Y + 0.08, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.8, 16]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Pivot */}
      <mesh position={[0, PIVOT_Y, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 20]} />
        <meshStandardMaterial color="#2b3245" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Vertical reference */}
      <mesh position={[0, PIVOT_Y - 1.6, -0.02]}>
        <boxGeometry args={[0.004, 3.2, 0.004]} />
        <meshBasicMaterial color="#8a93a8" transparent opacity={0.45} />
      </mesh>

      {/* Swinging arm */}
      <group ref={arm} position={[0, PIVOT_Y, 0]}>
        <mesh ref={string} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 1, 8]} />
          <meshStandardMaterial color="#d6dbe6" />
        </mesh>
        <mesh ref={bob} castShadow>
          <sphereGeometry args={[0.11, 40, 40]} />
          <meshStandardMaterial color={accent} metalness={0.2} roughness={0.35} />
        </mesh>
      </group>

      <primitive object={arcLine} />
      {trail && <primitive object={trailLine} />}
    </>
  )
}
