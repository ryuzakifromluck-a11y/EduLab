import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ReactionSimulation } from '../../engines/reactionRate'
import { Label3D } from '../../components/lab/Label3D'
import { FLASK, flaskRadius, liquidHeight } from '../titration/flaskGeometry'

const SOLUTION_ML = 100 // 50 mL thiosulfate + 50 mL acid
const PARTICLES = 320
const CLEAR = new THREE.Color('#e6f0f6')
const CLOUDY = new THREE.Color('#f2e7a8')

function profile(height: number, inset = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)]
  const n = 32
  for (let i = 0; i <= n; i++) {
    const y = (height * i) / n
    pts.push(new THREE.Vector2(Math.max(0.001, flaskRadius(y) - inset), y))
  }
  pts.push(new THREE.Vector2(0, height))
  return pts
}

/** Conical flask on a paper cross. The solution clouds over as colloidal sulfur forms. */
export function ReactionRateScene({
  sim,
  glass,
  labels,
}: {
  sim: ReactionSimulation
  glass: string
  labels: { clock: string; temperature: string }
}) {
  const liquidMat = useRef<THREE.MeshStandardMaterial>(null)
  const crossMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#111318', transparent: true }), [])
  const particles = useRef<THREE.InstancedMesh>(null)
  const color = useMemo(() => new THREE.Color(), [])
  const h = liquidHeight(SOLUTION_ML)

  const shellGeom = useMemo(() => {
    const pts = profile(FLASK.coneHeight)
    pts.pop()
    pts.push(new THREE.Vector2(FLASK.neckRadius, FLASK.coneHeight + FLASK.neckHeight))
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  const liquidGeom = useMemo(() => new THREE.LatheGeometry(profile(h, 0.015), 48), [h])

  // Fixed random positions for sulfur particles inside the liquid cone.
  const particleMatrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: PARTICLES }, () => {
      const y = 0.03 + rand() * (h - 0.06)
      const r = Math.sqrt(rand()) * (flaskRadius(y) - 0.05)
      const a = rand() * Math.PI * 2
      dummy.position.set(r * Math.cos(a), y, r * Math.sin(a))
      dummy.scale.setScalar(0.6 + rand() * 0.8)
      dummy.updateMatrix()
      return dummy.matrix.clone()
    })
  }, [h])

  useFrame(() => {
    const turb = sim.turbidity
    if (liquidMat.current) {
      color.copy(CLEAR).lerp(CLOUDY, Math.min(1, turb * 1.2))
      liquidMat.current.color.copy(color)
      liquidMat.current.opacity = 0.28 + 0.7 * turb
    }
    crossMat.opacity = 0.08 + 0.92 * sim.visibility
    if (particles.current) {
      const n = Math.round(turb * PARTICLES)
      for (let i = 0; i < n; i++) particles.current.setMatrixAt(i, particleMatrices[i])
      particles.current.count = n
      particles.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 6, 4]} intensity={1.3} castShadow />
      <directionalLight position={[-3, 3, -4]} intensity={0.4} />

      {/* Bench and paper with the cross */}
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.06, 2.6]} />
        <meshStandardMaterial color="#3a4256" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1.7, 1.7]} />
        <meshStandardMaterial color="#f7f7f4" roughness={0.9} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((rot) => (
        <mesh key={rot} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, rot]} material={crossMat}>
          <planeGeometry args={[0.72, 0.07]} />
        </mesh>
      ))}

      {/* Flask */}
      <group position={[0, 0.006, 0]}>
        <mesh geometry={shellGeom}>
          <meshStandardMaterial color={glass} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} roughness={0.1} />
        </mesh>
        <mesh geometry={liquidGeom} renderOrder={1}>
          <meshStandardMaterial ref={liquidMat} color="#e6f0f6" transparent opacity={0.28} depthWrite={false} roughness={0.25} />
        </mesh>
        <instancedMesh ref={particles} args={[undefined, undefined, PARTICLES]} renderOrder={2}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#e8d96a" roughness={0.8} />
        </instancedMesh>
      </group>

      {/* Thermometer resting in the flask */}
      <group position={[0.08, 0.05, 0.02]} rotation-z={-0.12}>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.5, 12]} />
          <meshStandardMaterial color={glass} transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
        <mesh position={[0, 0.04 + (0.2 + sim.params.temperatureC / 100) / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.2 + sim.params.temperatureC / 100, 8]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
      </group>

      <Label3D lines={[labels.temperature]} position={[0.55, 1.7, 0]} height={0.2} color="#ffd1cc" background="#2a1513" />
      <Label3D lines={[labels.clock]} position={[-1.35, 0.6, 0.4]} height={0.3} />
    </>
  )
}
