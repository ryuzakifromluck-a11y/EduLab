import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ProjectileSample, ProjectileSimulation } from '../../engines/projectile'
import { Label3D } from '../../components/lab/Label3D'
import { niceStep, viewScale } from './sceneScale'

const BALL_R = 0.12
const BARREL_LEN = 0.7
const TRAIL_POINTS = 2000

/**
 * 3D launch range. Distances are scaled (see viewScale) so the predicted
 * trajectory always fits the view; the ground ticks show real metres.
 */
export function ProjectileScene({
  sim,
  prediction,
  showPrediction,
  accent,
  labels,
}: {
  sim: ProjectileSimulation
  prediction: { range: number; maxHeight: number; path: ProjectileSample[] }
  showPrediction: boolean
  accent: string
  labels: { range: string; height: string }
}) {
  const k = viewScale(prediction.range, prediction.maxHeight)
  const ball = useRef<THREE.Mesh>(null)
  const barrel = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)

  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const trailLine = useMemo(
    () => new THREE.Line(trailGeom, new THREE.LineBasicMaterial({ color: accent })),
    [trailGeom, accent],
  )
  const trailCount = useRef(0)
  const lastTime = useRef(-1)

  const predLine = useMemo(() => {
    const pts = prediction.path.map((p) => new THREE.Vector3(p.x * k, p.y * k, 0))
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#f0a85c', dashSize: 0.12, gapSize: 0.08 }))
    line.computeLineDistances()
    return line
  }, [prediction.path, k])
  useEffect(() => () => predLine.geometry.dispose(), [predLine])

  useFrame(() => {
    const { x, y } = sim.state
    ball.current?.position.set(x * k, y * k + BALL_R, 0)
    if (shadow.current) {
      shadow.current.position.x = x * k
      const s = Math.max(0.3, 1 - (y * k) / 6)
      shadow.current.scale.set(s, s, 1)
    }
    if (barrel.current) barrel.current.rotation.z = (sim.params.angleDeg * Math.PI) / 180 - Math.PI / 2

    // Trail of the actual flight, reset whenever the simulation restarts.
    if (sim.time < lastTime.current || sim.time === 0) trailCount.current = 0
    if (sim.time !== lastTime.current && trailCount.current < TRAIL_POINTS) {
      const arr = (trailGeom.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
      const i = trailCount.current++ * 3
      arr[i] = x * k
      arr[i + 1] = y * k + BALL_R
      arr[i + 2] = 0
      trailGeom.getAttribute('position').needsUpdate = true
    }
    trailGeom.setDrawRange(0, trailCount.current)
    lastTime.current = sim.time
  })

  const h0 = sim.params.height * k
  const step = niceStep(Math.max(prediction.range, 1) * 1.1)
  const ticks: number[] = []
  for (let m = 0; m * k <= Math.max(9, prediction.range * k + 0.5); m += step) ticks.push(+m.toFixed(6))
  const R = prediction.range * k
  const H = prediction.maxHeight * k
  const apex = prediction.path.reduce((a, b) => (b.y > a.y ? b : a), prediction.path[0])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 9, 6]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />

      {/* Ground */}
      <mesh rotation-x={-Math.PI / 2} position={[4, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 4]} />
        <meshStandardMaterial color="#8792ab" roughness={0.95} transparent opacity={0.16} />
      </mesh>
      <mesh position={[4, 0.004, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[12, 0.02]} />
        <meshBasicMaterial color="#8a93a8" />
      </mesh>
      {ticks.map((m) => (
        <group key={m}>
          <mesh position={[m * k, 0.006, 0.12]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.02, 0.24]} />
            <meshBasicMaterial color="#8a93a8" />
          </mesh>
          <Label3D lines={[`${+m.toPrecision(4)} m`]} position={[m * k, 0.14, 0.62]} height={0.3} color="#8a93a8" background={null} font="500 44px ui-monospace, monospace" />
        </group>
      ))}

      {/* Launch platform */}
      {h0 > 0.001 && (
        <mesh position={[-0.35, h0 / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, h0, 1.2]} />
          <meshStandardMaterial color="#3a4256" roughness={0.6} />
        </mesh>
      )}
      <group ref={barrel} position={[0, h0 + BALL_R, 0]}>
        <mesh position={[0, -BARREL_LEN / 2, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, BARREL_LEN, 24]} />
          <meshStandardMaterial color="#9aa3b8" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, h0 + BALL_R, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 0.34, 16]} />
        <meshStandardMaterial color="#2b3245" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Prediction, landing point and apex */}
      {showPrediction && (
        <>
          <primitive object={predLine} />
          <mesh position={[R, 0.008, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.14, 0.2, 32]} />
            <meshBasicMaterial color="#f0a85c" />
          </mesh>
          <Label3D lines={[labels.range]} position={[R, 0.55, -0.1]} height={0.26} />
          {H - h0 > 0.05 && (
            <>
              <mesh position={[apex.x * k, (apex.y * k) / 2, -0.02]}>
                <boxGeometry args={[0.006, apex.y * k, 0.006]} />
                <meshBasicMaterial color="#d38cf0" transparent opacity={0.7} />
              </mesh>
              <Label3D lines={[labels.height]} position={[apex.x * k, H + 0.45, 0]} height={0.26} color="#f0d6ff" background="#1d1426" />
            </>
          )}
        </>
      )}

      {/* Projectile and its shadow */}
      <primitive object={trailLine} />
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[BALL_R, 32, 32]} />
        <meshStandardMaterial color={accent} metalness={0.2} roughness={0.35} />
      </mesh>
      <mesh ref={shadow} position={[0, 0.007, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[BALL_R, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
    </>
  )
}
