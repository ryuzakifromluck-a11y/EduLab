import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/**
 * A breadboard-style RC circuit shared by the charging and discharging labs.
 *
 * charging:     battery ─ switch ─ resistor ─ capacitor ─ ammeter ─ back
 * discharging:  battery ─ (A) switch (B) ─ ammeter ─ resistor, capacitor in the middle branch
 */

export interface RcLive {
  /** Capacitor voltage, V. */
  Vc: number
  /** Current, A (signed; negative = discharge direction). */
  I: number
  /** Largest current magnitude the circuit can carry, for scaling the dots. */
  Imax: number
  /** Battery voltage, V. */
  V0: number
  /** charging: switch closed. discharging: true = switch at B (discharge). */
  switched: boolean
}

type P = [number, number]
const Y = 0.08
const WIRE = 0.022

function Wire({ pts, color = '#c47a32' }: { pts: P[]; color?: string }) {
  const geom = useMemo(() => {
    const v = pts.map(([x, z]) => new THREE.Vector3(x, Y, z))
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]))
    return new THREE.TubeGeometry(path, Math.max(8, v.length * 8), WIRE, 8, false)
  }, [pts])
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
    </mesh>
  )
}

/** Point at arc length s along a polyline (wraps). */
function along(pts: P[], s: number): P {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  const total = segs.reduce((a, b) => a + b, 0)
  let d = ((s % total) + total) % total
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const u = d / segs[i]
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]
    }
    d -= segs[i]
  }
  return pts[pts.length - 1]
}

const loopLength = (pts: P[]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)

/** Moving charge markers along a closed loop; speed follows the current. */
function CurrentDots({ loop, get, active }: { loop: P[]; get: () => number; active: () => boolean }) {
  const n = 22
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const offset = useRef(0)
  const len = useMemo(() => loopLength(loop), [loop])
  useFrame((_, dt) => {
    const speed = get()
    offset.current += speed * Math.min(dt, 0.1)
    const on = active() && Math.abs(speed) > 0.004
    refs.current.forEach((m, i) => {
      if (!m) return
      m.visible = on
      if (!on) return
      const [x, z] = along(loop, offset.current + (i * len) / n)
      m.position.set(x, Y + 0.035, z)
    })
  })
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </>
  )
}

function Battery({ position, volts }: { position: [number, number, number]; volts: string }) {
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.9, 28]} />
        <meshStandardMaterial color="#2b2f3a" roughness={0.5} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.16, -0.3]}>
        <cylinderGeometry args={[0.165, 0.165, 0.3, 28]} />
        <meshStandardMaterial color="#d6453d" roughness={0.5} />
      </mesh>
      <Label3D lines={[volts]} position={[0, 0.48, 0]} height={0.2} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 36px Inter Variable, sans-serif" />
      <Label3D lines={['+']} position={[0.24, 0.2, -0.38]} height={0.14} color="#ff8a80" background={null} font="700 48px Inter Variable, sans-serif" />
    </group>
  )
}

function Resistor({ position, vertical }: { position: [number, number, number]; vertical?: boolean }) {
  const bands = ['#7a4a1c', '#111', '#e0a020', '#c9a24a']
  return (
    <group position={position} rotation-y={vertical ? Math.PI / 2 : 0}>
      <mesh rotation-z={Math.PI / 2} position={[0, Y, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.42, 20]} />
        <meshStandardMaterial color="#d9c49a" roughness={0.6} />
      </mesh>
      {bands.map((c, i) => (
        <mesh key={i} rotation-z={Math.PI / 2} position={[-0.13 + i * 0.075 + (i === 3 ? 0.04 : 0), Y, 0]}>
          <cylinderGeometry args={[0.073, 0.073, 0.03, 20]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}

function Capacitor({ position, glow }: { position: [number, number, number]; glow: React.RefObject<THREE.MeshStandardMaterial | null> }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.6, 32]} />
        <meshStandardMaterial ref={glow} color="#2f5fb3" emissive="#5aa0ff" emissiveIntensity={0} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 32]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.2, 0.3, 0]}>
        <boxGeometry args={[0.012, 0.6, 0.1]} />
        <meshStandardMaterial color="#dfe6f2" />
      </mesh>
    </group>
  )
}

function Meter({ position, title, label }: { position: [number, number, number]; title: string; label: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.62, 0.34, 0.42]} />
        <meshStandardMaterial color="#e9b949" roughness={0.6} />
      </mesh>
      <Label3D lines={[title, label]} position={[0, 0.62, 0]} height={0.3} />
    </group>
  )
}

export function RcBoard({
  variant,
  live,
  labels,
}: {
  variant: 'charging' | 'discharging'
  live: () => RcLive
  labels: { volts: string; voltmeter: string; vReading: string; ammeter: string; aReading: string; switchState: string }
}) {
  const glow = useRef<THREE.MeshStandardMaterial>(null)
  const lever = useRef<THREE.Group>(null)

  useFrame(() => {
    const s = live()
    if (glow.current) glow.current.emissiveIntensity = Math.min(1.2, Math.max(0, s.Vc / 12) * 1.2)
    if (!lever.current) return
    if (variant === 'charging') {
      const target = s.switched ? 0 : 0.55
      lever.current.rotation.z += (target - lever.current.rotation.z) * 0.25
    } else {
      const target = s.switched ? 0 : Math.PI
      lever.current.rotation.y += (target - lever.current.rotation.y) * 0.25
    }
  })

  if (variant === 'charging') {
    const loop: P[] = [
      [-1.6, -0.8],
      [1.6, -0.8],
      [1.6, 0.8],
      [-1.6, 0.8],
      [-1.6, -0.8],
    ]
    return (
      <>
        <LabLights />
        <Bench width={4.6} depth={2.8} color="#2e3a4f" />
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[3.8, 0.02, 2.2]} />
          <meshStandardMaterial color="#e8e2d0" roughness={0.9} />
        </mesh>
        <Wire pts={[[-1.6, 0.8], [-1.6, -0.8], [-0.75, -0.8]]} />
        <Wire pts={[[-0.2, -0.8], [1.6, -0.8], [1.6, 0.8], [-1.6, 0.8]]} />
        <Battery position={[-1.6, 0, 0]} volts={labels.volts} />
        {/* Knife switch: pivot at x = −0.75, closes onto the contact at −0.2 */}
        <mesh position={[-0.75, 0.06, -0.8]}>
          <boxGeometry args={[0.1, 0.1, 0.16]} />
          <meshStandardMaterial color="#444b5c" />
        </mesh>
        <mesh position={[-0.2, 0.06, -0.8]}>
          <boxGeometry args={[0.1, 0.1, 0.16]} />
          <meshStandardMaterial color="#444b5c" />
        </mesh>
        <group ref={lever} position={[-0.75, 0.13, -0.8]} rotation-z={0.55}>
          <mesh position={[0.28, 0, 0]}>
            <boxGeometry args={[0.6, 0.03, 0.06]} />
            <meshStandardMaterial color="#c0c6d2" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.6, 0.06, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#d6453d" />
          </mesh>
        </group>
        <Label3D lines={[labels.switchState]} position={[-0.45, 0.62, -0.8]} height={0.2} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
        <Resistor position={[0.6, 0, -0.8]} />
        <Capacitor position={[1.6, 0, 0.05]} glow={glow} />
        <Meter position={[0, 0, 0.8]} title={labels.ammeter} label={labels.aReading} />
        {/* Voltmeter wired across the capacitor */}
        <Wire pts={[[1.6, -0.35], [2.25, -0.35], [2.25, 0.05]]} color="#d6453d" />
        <Wire pts={[[1.6, 0.45], [2.25, 0.45], [2.25, 0.3]]} color="#333" />
        <Meter position={[2.25, 0, 0.18]} title={labels.voltmeter} label={labels.vReading} />
        <CurrentDots loop={loop} get={() => (live().I / Math.max(1e-12, live().Imax)) * 1.6} active={() => live().switched} />
      </>
    )
  }

  // discharging
  const dischargeLoop: P[] = [
    [0, 0.8],
    [0, -0.8],
    [1.6, -0.8],
    [1.6, 0.8],
    [0, 0.8],
  ]
  return (
    <>
      <LabLights />
      <Bench width={4.6} depth={2.8} color="#2e3a4f" />
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[3.8, 0.02, 2.2]} />
        <meshStandardMaterial color="#e8e2d0" roughness={0.9} />
      </mesh>
      <Wire pts={[[-0.55, -0.8], [-1.6, -0.8], [-1.6, 0.8], [1.6, 0.8], [1.6, -0.8], [0.55, -0.8]]} />
      <Wire pts={[[0, -0.8], [0, 0.8]]} />
      <Battery position={[-1.6, 0, 0]} volts={labels.volts} />
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.06, -0.8]}>
          <boxGeometry args={[0.1, 0.1, 0.16]} />
          <meshStandardMaterial color="#444b5c" />
        </mesh>
      ))}
      <Label3D lines={['A']} position={[-0.6, 0.3, -1.0]} height={0.22} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="700 40px Inter Variable, sans-serif" />
      <Label3D lines={['B']} position={[0.6, 0.3, -1.0]} height={0.22} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="700 40px Inter Variable, sans-serif" />
      {/* Two-way switch: pivot on the capacitor branch, swings to A (charge) or B (discharge). */}
      <mesh position={[0, 0.06, -0.8]}>
        <boxGeometry args={[0.12, 0.1, 0.16]} />
        <meshStandardMaterial color="#444b5c" />
      </mesh>
      <group ref={lever} position={[0, 0.14, -0.8]} rotation-y={Math.PI}>
        <mesh position={[0.28, 0, 0]}>
          <boxGeometry args={[0.56, 0.03, 0.06]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0.5, 0.06, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#d6453d" />
        </mesh>
      </group>
      <Label3D lines={[labels.switchState]} position={[0, 0.62, -0.8]} height={0.2} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      <Capacitor position={[0, 0, 0.1]} glow={glow} />
      <Resistor position={[1.6, 0, 0.05]} vertical />
      <Meter position={[0.85, 0, 0.8]} title={labels.ammeter} label={labels.aReading} />
      <Wire pts={[[0, -0.3], [-0.65, -0.3], [-0.65, 0.05]]} color="#d6453d" />
      <Wire pts={[[0, 0.45], [-0.65, 0.45], [-0.65, 0.3]]} color="#333" />
      <Meter position={[-0.75, 0, 0.18]} title={labels.voltmeter} label={labels.vReading} />
      <CurrentDots loop={dischargeLoop} get={() => (-live().I / Math.max(1e-12, live().Imax)) * 1.6} active={() => live().switched} />
    </>
  )
}
