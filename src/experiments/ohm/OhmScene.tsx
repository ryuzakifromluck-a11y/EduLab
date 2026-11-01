import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OhmController } from './useOhm'
import { LOOP, markerSpeed, pointOnLoop } from './circuitPath'
import { Label3D } from '../../components/lab/Label3D'

const MARKERS = 36
const Y = 0.12

function Readout({ position, label, value }: { position: [number, number, number]; label: string; value: string }) {
  return <Label3D lines={[label, value]} position={position} height={0.42} />
}

function Wire({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const { position, length, rotation } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const dir = b.clone().sub(a)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { position: mid, length: dir.length(), rotation: new THREE.Euler().setFromQuaternion(q) }
  }, [from, to])
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.025, 0.025, length, 10]} />
      <meshStandardMaterial color="#c4682f" metalness={0.7} roughness={0.35} />
    </mesh>
  )
}

export function OhmScene({ ctl, labels }: { ctl: OhmController; labels: { ammeter: string; voltmeter: string; battery: string; ammeterValue: string; voltmeterValue: string; switchHint: string } }) {
  const markers = useRef<THREE.InstancedMesh>(null)
  const resistorMat = useRef<THREE.MeshStandardMaterial>(null)
  const lever = useRef<THREE.Group>(null)
  const phase = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const [hover, setHover] = useState(false)

  useFrame((_, dt) => {
    const { current, power, closed, running } = ctl.live.current
    if (running) phase.current += markerSpeed(current) * Math.min(dt, 0.1)
    if (markers.current) {
      for (let i = 0; i < MARKERS; i++) {
        const [x, z] = pointOnLoop(phase.current + i / MARKERS)
        dummy.position.set(x, Y + 0.02, z)
        dummy.scale.setScalar(closed ? 1 : 0.0001)
        dummy.updateMatrix()
        markers.current.setMatrixAt(i, dummy.matrix)
      }
      markers.current.instanceMatrix.needsUpdate = true
    }
    // Joule heating: glow scales with dissipated power.
    if (resistorMat.current) {
      const glow = Math.min(1, power / 20)
      resistorMat.current.emissive.setRGB(1, 0.35, 0.1)
      resistorMat.current.emissiveIntensity = glow * 1.2
    }
    if (lever.current) {
      const target = closed ? 0 : -0.7
      lever.current.rotation.z += (target - lever.current.rotation.z) * Math.min(1, dt * 12)
    }
  })

  const wireY = Y
  const { x0, x1, z0, z1 } = LOOP

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 8, 4]} intensity={1.5} castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={0.3} />

      {/* Bench board */}
      <mesh position={[0, -0.05, -0.4]} receiveShadow>
        <boxGeometry args={[6, 0.1, 4.4]} />
        <meshStandardMaterial color="#2e3a4f" roughness={0.9} />
      </mesh>

      {/* Main loop wires */}
      <Wire from={[x0, wireY, z0]} to={[x1, wireY, z0]} />
      <Wire from={[x1, wireY, z0]} to={[x1, wireY, z1]} />
      <Wire from={[x1, wireY, z1]} to={[x0, wireY, z1]} />
      <Wire from={[x0, wireY, z1]} to={[x0, wireY, z0]} />

      {/* Battery on the left side */}
      <group position={[x0, 0.3, 0]}>
        <mesh rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 1.2, 32]} />
          <meshStandardMaterial color="#1f2533" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.35]}>
          <cylinderGeometry args={[0.265, 0.265, 0.5, 32]} />
          <meshStandardMaterial color="#d9a21b" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.65]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          <meshStandardMaterial color="#c0c6d2" metalness={0.9} roughness={0.2} />
        </mesh>
        <Label3D lines={['+']} position={[-0.45, 0.1, -0.45]} height={0.32} color="#e5484d" background={null} font="700 64px Inter Variable, sans-serif" />
        <Label3D lines={['−']} position={[-0.45, 0.1, 0.5]} height={0.32} color="#4c8dff" background={null} font="700 64px Inter Variable, sans-serif" />
      </group>
      <Readout position={[x0 - 0.75, 0.55, 0]} label={labels.battery} value={`${ctl.voltage.toFixed(1)} V`} />

      {/* Resistor on the top side */}
      <group position={[0, wireY, z0]}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 1.0, 32]} />
          <meshStandardMaterial ref={resistorMat} color="#d8c3a0" roughness={0.6} />
        </mesh>
        {[-0.3, -0.15, 0, 0.25].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.165, 0.165, 0.06, 32]} />
            <meshStandardMaterial color={['#8b4513', '#111111', '#cc2222', '#c9a227'][i]} roughness={0.5} />
          </mesh>
        ))}
      </group>
      <Readout position={[0, 0.5, z0 + 0.45]} label="R" value={`${ctl.resistance.toFixed(0)} Ω`} />

      {/* Voltmeter in parallel with the resistor */}
      <Wire from={[-0.5, wireY, z0]} to={[-0.5, wireY, z0 - 0.9]} />
      <Wire from={[0.5, wireY, z0]} to={[0.5, wireY, z0 - 0.9]} />
      <Wire from={[-0.5, wireY, z0 - 0.9]} to={[-0.3, wireY, z0 - 0.9]} />
      <Wire from={[0.5, wireY, z0 - 0.9]} to={[0.3, wireY, z0 - 0.9]} />
      <group position={[0, 0.25, z0 - 0.95]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.4, 0.45]} />
          <meshStandardMaterial color="#e8ecf3" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.05, 0.23]}>
          <boxGeometry args={[0.5, 0.18, 0.01]} />
          <meshStandardMaterial color="#0f1a14" />
        </mesh>
      </group>
      <Readout position={[0, 0.9, z0 - 1.05]} label={labels.voltmeter} value={labels.voltmeterValue} />

      {/* Ammeter in series on the right side */}
      <group position={[x1, 0.25, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.4, 0.7]} />
          <meshStandardMaterial color="#e8ecf3" roughness={0.5} />
        </mesh>
        <mesh position={[-0.23, 0.05, 0]}>
          <boxGeometry args={[0.01, 0.18, 0.5]} />
          <meshStandardMaterial color="#0f1a14" />
        </mesh>
      </group>
      <Readout position={[x1 + 0.1, 0.85, 0]} label={labels.ammeter} value={labels.ammeterValue} />

      {/* Knife switch on the bottom side; click to toggle */}
      <group position={[0, wireY, z1]}>
        <mesh position={[-0.35, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.18, 0.18]} />
          <meshStandardMaterial color="#8a93a8" metalness={0.6} />
        </mesh>
        <mesh position={[0.35, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.18, 0.18]} />
          <meshStandardMaterial color="#8a93a8" metalness={0.6} />
        </mesh>
        <group ref={lever} position={[-0.35, 0.14, 0]}>
          <mesh
            position={[0.36, 0, 0]}
            onClick={(e) => {
              e.stopPropagation()
              ctl.toggleSwitch()
            }}
            onPointerOver={() => {
              setHover(true)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setHover(false)
              document.body.style.cursor = ''
            }}
          >
            <boxGeometry args={[0.78, 0.05, 0.1]} />
            <meshStandardMaterial color={hover ? '#f0a85c' : '#c9ced9'} metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.78, 0, 0]} onClick={(e) => (e.stopPropagation(), ctl.toggleSwitch())}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#1f2533" />
          </mesh>
        </group>
      </group>
      <Label3D lines={[labels.switchHint]} position={[0, 0.6, z1 + 0.15]} height={0.2} color="#ffffff" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="500 36px Inter Variable, sans-serif" />

      {/* Current markers */}
      <instancedMesh ref={markers} args={[undefined, undefined, MARKERS]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffb703" emissiveIntensity={0.9} />
      </instancedMesh>
    </>
  )
}
