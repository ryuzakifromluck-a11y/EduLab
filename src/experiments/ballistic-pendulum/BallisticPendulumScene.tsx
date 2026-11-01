import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { BallisticRig } from '../../engines/ballisticPendulum'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** World units per metre. */
const K = 4
const PIVOT_Y = 2.5
const BLOCK = 0.36

/** Spring gun, ball, pendulum catcher with a ratchet pointer and a degree scale. */
export function BallisticPendulumScene({ rig, labels }: { rig: BallisticRig; labels: { scale: string; reading: string | null } }) {
  const arm = useRef<THREE.Group>(null)
  const pointer = useRef<THREE.Group>(null)
  const ball = useRef<THREE.Mesh>(null)
  const L = rig.p.L * K
  const muzzleX = -BLOCK / 2 - rig.gap * K
  const lineY = PIVOT_Y - L

  useFrame(() => {
    if (arm.current) arm.current.rotation.z = rig.theta
    if (pointer.current) pointer.current.rotation.z = rig.caught
    if (ball.current) {
      ball.current.visible = rig.phase !== 'swinging' && rig.phase !== 'done'
      const f = rig.flight ?? 0
      ball.current.position.set(muzzleX + f * rig.gap * K - 0.05, lineY, 0)
    }
  })

  const ticks = useMemo(() => Array.from({ length: 10 }, (_, i) => i * 10), [])
  const R = L + 0.35

  return (
    <>
      <LabLights />
      <Bench width={5} depth={2.2} />
      {/* Frame */}
      <mesh position={[0, 0.03, -0.35]}>
        <boxGeometry args={[3.6, 0.06, 0.5]} />
        <meshStandardMaterial color="#3a4256" />
      </mesh>
      <mesh position={[-0.05, PIVOT_Y / 2, -0.5]}>
        <boxGeometry args={[0.08, PIVOT_Y + 0.1, 0.08]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.05, PIVOT_Y, -0.25]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.04, 0.04, 0.55, 16]} />
        <meshStandardMaterial color="#8a93a8" metalness={0.8} />
      </mesh>
      {/* Degree scale (quarter circle) behind the pendulum */}
      <group position={[0, PIVOT_Y, -0.12]}>
        <mesh rotation-z={-Math.PI / 2}>
          <ringGeometry args={[R - 0.06, R, 64, 1, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f3e7c4" side={THREE.DoubleSide} />
        </mesh>
        {ticks.map((d) => {
          const a = (d * Math.PI) / 180
          return (
            <group key={d}>
              <mesh position={[(R - 0.03) * Math.sin(a), -(R - 0.03) * Math.cos(a), 0.01]} rotation-z={a}>
                <boxGeometry args={[0.012, 0.09, 0.005]} />
                <meshBasicMaterial color="#222" />
              </mesh>
              {d % 20 === 0 && (
                <Label3D lines={[`${d}°`]} position={[(R + 0.14) * Math.sin(a), -(R + 0.14) * Math.cos(a), 0.02]} height={0.17} color="#e8ecf3" background="rgba(0,0,0,0.45)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
              )}
            </group>
          )
        })}
        <Label3D lines={[labels.scale]} position={[R * 0.75, -R * 0.2, 0.02]} height={0.17} color="#e8ecf3" background="rgba(0,0,0,0.45)" border="rgba(0,0,0,0)" font="600 30px Inter Variable, sans-serif" />
      </group>
      {/* Ratchet pointer: pushed up by the arm and left at the highest angle */}
      <group ref={pointer} position={[0, PIVOT_Y, -0.08]}>
        <mesh position={[0, -(R - 0.15) / 2, 0]}>
          <boxGeometry args={[0.02, R - 0.15, 0.01]} />
          <meshStandardMaterial color="#e5484d" />
        </mesh>
      </group>
      {/* Pendulum arm and catcher block */}
      <group ref={arm} position={[0, PIVOT_Y, 0]}>
        <mesh position={[0, -L / 2, 0]}>
          <boxGeometry args={[0.05, L, 0.05]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, -L, 0]}>
          <boxGeometry args={[BLOCK, 0.3, 0.3]} />
          <meshStandardMaterial color="#2f5fb3" roughness={0.5} />
        </mesh>
        <mesh position={[-BLOCK / 2 - 0.001, -L, 0]} rotation-y={-Math.PI / 2}>
          <circleGeometry args={[0.07, 24]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
      {/* Spring gun */}
      <group position={[muzzleX, lineY, 0]}>
        <mesh position={[-0.45, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.09, 0.09, 0.9, 24]} />
          <meshStandardMaterial color="#444b5c" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[-0.6, -(lineY - 0.05) / 2, 0]}>
          <boxGeometry args={[0.12, lineY - 0.05, 0.3]} />
          <meshStandardMaterial color="#3a4256" />
        </mesh>
        <mesh position={[-0.95, 0, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.22]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
      </group>
      <mesh ref={ball}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial color="#d9dde5" metalness={0.9} roughness={0.15} />
      </mesh>
      {labels.reading && (
        <Label3D lines={[labels.reading]} position={[1.1, PIVOT_Y + 0.35, 0]} height={0.2} color="#e8ecf3" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      )}
    </>
  )
}
