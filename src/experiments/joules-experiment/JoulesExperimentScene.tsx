import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { JouleCalorimeter, Method } from '../../engines/joulesExperiment'
import { Label3D } from '../../components/lab/Label3D'
import { heatColor } from '../shared/lab'
import { Bench, LabLights } from '../shared/three'

const CAN_X = 0
const CAN_R = 0.42
const CAN_H = 0.8
const PULLEY_Y = 2.8
const PULLEY_X = 1.25
const PULLEY_R = 0.16
/** World units per metre of fall. */
const FALL = 1.15

/**
 * Insulated calorimeter with a paddle wheel driven by a string over a pulley
 * from a falling weight; a thermometer shows the water temperature. In the
 * electrical method a heating coil replaces the paddle.
 */
export function JoulesExperimentScene({
  cal,
  method,
  height,
  mass,
  insulated,
  labels,
}: {
  cal: JouleCalorimeter
  method: Method
  height: number
  mass: number
  insulated: boolean
  labels: { thermo: string; weight: string; meter: string | null }
}) {
  const paddle = useRef<THREE.Group>(null)
  const weight = useRef<THREE.Group>(null)
  const stringV = useRef<THREE.Mesh>(null)
  const pulley = useRef<THREE.Group>(null)
  const water = useRef<THREE.MeshStandardMaterial>(null)
  const mercury = useRef<THREE.Mesh>(null)
  const coil = useRef<THREE.MeshStandardMaterial>(null)
  const angle = useRef(0)
  const lastFall = useRef(0)
  const topY = PULLEY_Y - 0.35
  const travel = height * FALL

  const coilGeom = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 240; i++) {
      const u = i / 240
      const a = u * 10 * Math.PI * 2
      pts.push(new THREE.Vector3(0.13 * Math.cos(a), 0.15 + u * 0.4, 0.13 * Math.sin(a)))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.012, 6, false)
  }, [])

  useFrame(() => {
    const fallen = cal.falling ? height - cal.fallLeft : 0
    const d = fallen - lastFall.current
    lastFall.current = fallen
    if (d > 0) angle.current += d * 9
    if (paddle.current) paddle.current.rotation.y = angle.current
    if (pulley.current) pulley.current.rotation.z = -angle.current * 0.6
    const y = topY - (cal.falling ? fallen * FALL : 0) - 0.15
    weight.current?.position.set(PULLEY_X + PULLEY_R, y, 0)
    if (stringV.current) {
      const len = PULLEY_Y - y - 0.1
      stringV.current.scale.y = Math.max(0.01, len)
      stringV.current.position.set(PULLEY_X + PULLEY_R, PULLEY_Y - len / 2, 0)
    }
    water.current?.color.set(heatColor(cal.T, 15, 35))
    if (mercury.current) {
      const f = Math.min(1, Math.max(0.02, (cal.T - 10) / 40))
      mercury.current.scale.y = f
      mercury.current.position.y = CAN_H + 0.05 + (0.9 * f) / 2
    }
    if (coil.current) coil.current.emissiveIntensity = cal.power > 0 ? 0.4 + Math.min(1, cal.power / 50) : 0
  })

  return (
    <>
      <LabLights />
      <Bench width={4.4} depth={2.4} />
      {/* Calorimeter: insulating jacket (or bare can) */}
      <mesh position={[CAN_X, CAN_H / 2, 0]}>
        <cylinderGeometry args={[CAN_R + (insulated ? 0.09 : 0.005), CAN_R + (insulated ? 0.09 : 0.005), CAN_H, 40, 1, true]} />
        <meshStandardMaterial color={insulated ? '#d9cfb8' : '#c0c6d2'} metalness={insulated ? 0 : 0.7} roughness={insulated ? 0.95 : 0.3} side={THREE.DoubleSide} transparent opacity={0.55} />
      </mesh>
      <mesh position={[CAN_X, 0.33, 0]}>
        <cylinderGeometry args={[CAN_R - 0.01, CAN_R - 0.01, 0.66, 40]} />
        <meshStandardMaterial ref={water} color="#2f6fd6" transparent opacity={0.55} />
      </mesh>
      <mesh position={[CAN_X, CAN_H + 0.01, 0]}>
        <cylinderGeometry args={[CAN_R + (insulated ? 0.09 : 0.01), CAN_R + (insulated ? 0.09 : 0.01), 0.03, 40]} />
        <meshStandardMaterial color="#5a6275" transparent opacity={0.6} />
      </mesh>
      {method === 'mechanical' ? (
        <>
          {/* Paddle wheel on a vertical axle with a drum at the top */}
          <group ref={paddle} position={[CAN_X, 0, 0]}>
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1.4, 12]} />
              <meshStandardMaterial color="#c0c6d2" metalness={0.8} />
            </mesh>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} position={[0.18 * Math.cos((i * Math.PI) / 4), 0.22 + (i % 2) * 0.22, 0.18 * Math.sin((i * Math.PI) / 4)]} rotation-y={(-i * Math.PI) / 4}>
                <boxGeometry args={[0.32, 0.16, 0.012]} />
                <meshStandardMaterial color="#b08d3a" metalness={0.6} roughness={0.35} />
              </mesh>
            ))}
            <mesh position={[0, 1.35, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.14, 24]} />
              <meshStandardMaterial color="#7a5a2c" />
            </mesh>
          </group>
          {/* String: drum → pulley → weight */}
          <mesh position={[(CAN_X + PULLEY_X) / 2, 1.35, 0.1]} rotation-z={Math.atan2(PULLEY_Y - 1.35, PULLEY_X - CAN_X) - Math.PI / 2}>
            <cylinderGeometry args={[0.006, 0.006, Math.hypot(PULLEY_X - CAN_X, PULLEY_Y - 1.35), 6]} />
            <meshStandardMaterial color="#eee" />
          </mesh>
          <mesh ref={stringV}>
            <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
            <meshStandardMaterial color="#eee" />
          </mesh>
          {/* Pulley on a post */}
          <mesh position={[PULLEY_X + 0.55, PULLEY_Y / 2, -0.2]}>
            <boxGeometry args={[0.07, PULLEY_Y, 0.07]} />
            <meshStandardMaterial color="#3a4256" />
          </mesh>
          <mesh position={[PULLEY_X + 0.27, PULLEY_Y, -0.2]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.025, 0.025, 0.6, 12]} />
            <meshStandardMaterial color="#3a4256" />
          </mesh>
          <group ref={pulley} position={[PULLEY_X, PULLEY_Y, 0]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[PULLEY_R, PULLEY_R, 0.06, 32]} />
              <meshStandardMaterial color="#8a93a8" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[PULLEY_R * 0.6, 0, 0.035]}>
              <boxGeometry args={[0.03, 0.03, 0.01]} />
              <meshStandardMaterial color="#e5484d" />
            </mesh>
          </group>
          {/* Falling weight and a height scale */}
          <group ref={weight}>
            <mesh>
              <cylinderGeometry args={[0.12 + Math.min(0.08, mass / 250), 0.12 + Math.min(0.08, mass / 250), 0.3, 24]} />
              <meshStandardMaterial color="#5a6275" metalness={0.6} roughness={0.35} />
            </mesh>
            <Label3D lines={[labels.weight]} position={[0.42, 0, 0]} height={0.14} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
          </group>
          <mesh position={[PULLEY_X + 0.55, topY - 0.15 - travel / 2, 0.05]}>
            <boxGeometry args={[0.05, travel, 0.01]} />
            <meshStandardMaterial color="#f3e7c4" />
          </mesh>
        </>
      ) : (
        <>
          <mesh geometry={coilGeom} position={[CAN_X, 0, 0]}>
            <meshStandardMaterial ref={coil} color="#9a5b2d" emissive="#ff6a1a" emissiveIntensity={0} metalness={0.6} />
          </mesh>
          {[-0.13, 0.13].map((x) => (
            <mesh key={x} position={[CAN_X + x, 0.75, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.9, 8]} />
              <meshStandardMaterial color={x < 0 ? '#d6453d' : '#222'} />
            </mesh>
          ))}
          <mesh position={[1.35, 0.25, 0.2]}>
            <boxGeometry args={[0.8, 0.5, 0.5]} />
            <meshStandardMaterial color="#3a4256" />
          </mesh>
          {labels.meter && <Label3D lines={[labels.meter]} position={[1.35, 0.85, 0.2]} height={0.3} />}
        </>
      )}
      {/* Thermometer */}
      <group position={[CAN_X - 0.25, 0, 0.15]}>
        <mesh position={[0, CAN_H + 0.1, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.5, 12]} />
          <meshStandardMaterial color="#e8f0ff" transparent opacity={0.45} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#d33" />
        </mesh>
        <mesh ref={mercury}>
          <cylinderGeometry args={[0.012, 0.012, 0.9, 8]} />
          <meshStandardMaterial color="#d33" />
        </mesh>
        <Label3D lines={[labels.thermo]} position={[-0.45, CAN_H + 0.75, 0]} height={0.3} />
      </group>
    </>
  )
}
