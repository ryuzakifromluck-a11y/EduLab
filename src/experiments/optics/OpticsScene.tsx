import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { RayResult } from '../../engines/optics'
import { Label3D } from '../../components/lab/Label3D'
import { LabLights } from '../shared/three'

const LEN = 1.9
const PULSES = 4
const MEDIUM_COLORS: Record<string, string> = { air: '#dfe8f5', water: '#5ab0e8', glass: '#9fd8d0', diamond: '#e8f0ff' }

const rad = (d: number) => (d * Math.PI) / 180

function Beam({ from, to, opacity, color = '#ff3b3b' }: { from: THREE.Vector3; to: THREE.Vector3; opacity: number; color?: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = to.clone().sub(from)
    return {
      position: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    }
  }, [from, to])
  if (opacity < 0.01) return null
  return (
    <mesh position={position} quaternion={quaternion} renderOrder={5}>
      <cylinderGeometry args={[0.026, 0.026, length, 10]} />
      <meshBasicMaterial color={color} transparent opacity={Math.max(0.12, opacity)} depthTest={false} />
    </mesh>
  )
}

export function OpticsScene({
  ray,
  m1,
  m2,
  n1,
  n2,
  phase,
  labels,
}: {
  ray: RayResult
  m1: string
  m2: string
  n1: number
  n2: number
  phase: RefObject<number>
  labels: { top: string; bottom: string; normal: string; i: string; r: string; t: string | null }
}) {
  const t1 = rad(ray.incidence)
  const t2 = ray.refraction === null ? null : rad(ray.refraction)
  const O = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const S = useMemo(() => new THREE.Vector3(-LEN * Math.sin(t1), LEN * Math.cos(t1), 0), [t1])
  const R = useMemo(() => new THREE.Vector3(LEN * Math.sin(t1), LEN * Math.cos(t1), 0), [t1])
  const T = useMemo(() => (t2 === null ? null : new THREE.Vector3(LEN * Math.sin(t2), -LEN * Math.cos(t2), 0)), [t2])
  const pulses = useRef<THREE.Group>(null)

  useFrame(() => {
    const g = pulses.current
    if (!g) return
    const p = phase.current ?? 0
    // Pulses travel at c/n: the same time step covers less distance in a denser medium.
    g.children.forEach((child, i) => {
      const u = (p + i / PULSES) % 1
      const kind = i % 3
      if (kind === 0) child.position.copy(S).lerp(O, u)
      else if (kind === 1) child.position.copy(O).lerp(R, u)
      else if (T) child.position.copy(O).lerp(T, Math.min(1, (u * n1) / n2))
      child.visible = kind !== 2 || (!!T && (u * n1) / n2 <= 1)
      child.scale.setScalar(kind === 1 ? 0.4 + 0.6 * Math.sqrt(ray.reflected) : kind === 2 ? 0.4 + 0.6 * Math.sqrt(ray.transmitted) : 1)
    })
  })

  const laserQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), O.clone().sub(S).normalize()), [S, O])

  return (
    <>
      <LabLights />
      {/* Lower medium */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[5, 2, 1.2]} />
        <meshStandardMaterial color={MEDIUM_COLORS[m2]} transparent opacity={m2 === 'air' ? 0.08 : 0.35} roughness={0.1} metalness={0.1} depthWrite={false} />
      </mesh>
      {m1 !== 'air' && (
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[5, 2, 1.2]} />
          <meshStandardMaterial color={MEDIUM_COLORS[m1]} transparent opacity={0.3} roughness={0.1} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5, 0.006, 1.2]} />
        <meshBasicMaterial color="#8a93a8" />
      </mesh>
      {/* Normal */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[0, -1.8 + i * 0.24, 0]}>
          <boxGeometry args={[0.01, 0.12, 0.01]} />
          <meshBasicMaterial color="#8a93a8" />
        </mesh>
      ))}
      <Label3D lines={[labels.normal]} position={[0.02, 2.05, 0]} height={0.14} color="#8a93a8" background={null} font="600 34px Inter Variable, sans-serif" />
      <Label3D lines={[labels.top]} position={[-2.0, 0.25, 0.62]} height={0.22} color="#e8ecf3" background="rgba(0,0,0,0.45)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      <Label3D lines={[labels.bottom]} position={[-2.0, -0.25, 0.62]} height={0.22} color="#e8ecf3" background="rgba(0,0,0,0.45)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />

      {/* Laser */}
      <mesh position={S.clone().multiplyScalar(1.12)} quaternion={laserQuat}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 20]} />
        <meshStandardMaterial color="#2a3142" metalness={0.6} roughness={0.3} />
      </mesh>

      <Beam from={S} to={O} opacity={1} />
      <Beam from={O} to={R} opacity={ray.reflected} />
      {T && <Beam from={O} to={T} opacity={ray.transmitted} />}

      <Label3D lines={[labels.i]} position={[S.x * 0.45 - 0.15, S.y * 0.45 + 0.1, 0.05]} height={0.24} color="#ff6b6b" background={null} font="700 36px Inter Variable, sans-serif" />
      <Label3D lines={[labels.r]} position={[R.x * 0.45 + 0.15, R.y * 0.45 + 0.1, 0.05]} height={0.24} color="#ff9b9b" background={null} font="700 36px Inter Variable, sans-serif" />
      {T && labels.t && <Label3D lines={[labels.t]} position={[T.x * 0.45 + 0.2, T.y * 0.45, 0.05]} height={0.24} color="#ff6b6b" background={null} font="700 36px Inter Variable, sans-serif" />}

      <group ref={pulses}>
        {Array.from({ length: PULSES * 3 }, (_, i) => (
          <mesh key={i} renderOrder={6}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#fff2a8" depthTest={false} />
          </mesh>
        ))}
      </group>
    </>
  )
}
