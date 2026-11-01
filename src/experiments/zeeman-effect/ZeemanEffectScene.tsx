import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { Observation, SpectralLine } from '../../engines/zeemanEffect'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

/** Detector screen: world units per picometre of wavelength shift (hugely magnified, as by a Fabry–Pérot etalon). */
const PM = 0.025
const DET_X = 2.25

/**
 * Cadmium lamp between the poles of an electromagnet, a lens and a
 * spectrometer whose detector screen shows the split red line. Viewing
 * along the field, the lamp is seen through a hole bored in a pole piece.
 */
export function ZeemanEffectScene({ B, mode, lines, labels }: { B: number; mode: Observation; lines: SpectralLine[]; labels: { magnet: string; lamp: string; detector: string; field: string } }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null)
  const longit = mode === 'longitudinal'

  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = 1.6 + 0.15 * Math.sin(clock.elapsedTime * 50)
  })

  // Light path: transverse — lamp at origin, poles at ±z, light leaves along +x.
  // Longitudinal — the magnet is turned 90° so its axis is along x and the light exits through the bored pole.
  const coilColor = '#b5651d'
  const maxI = Math.max(...lines.map((l) => l.intensity), 0.001)

  return (
    <>
      <LabLights />
      <Bench width={6} depth={2.6} />
      {/* Electromagnet */}
      <group rotation-y={longit ? Math.PI / 2 : 0}>
        {[-1, 1].map((s) => (
          <group key={s} position={[0, 0.75, s * 0.55]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.32, 0.32, 0.55, 32]} />
              <meshStandardMaterial color={coilColor} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh rotation-x={Math.PI / 2} position={[0, 0, -s * 0.33]}>
              <cylinderGeometry args={[0.17, 0.12, 0.14, 32]} />
              <meshStandardMaterial color="#8a93a8" metalness={0.85} roughness={0.25} />
            </mesh>
            {longit && s === 1 && (
              <mesh rotation-x={Math.PI / 2} position={[0, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.9, 16]} />
                <meshBasicMaterial color="#111" />
              </mesh>
            )}
            <Label3D lines={[s === 1 ? 'N' : 'S']} position={[0, 0.45, 0]} height={0.16} color={s === 1 ? '#ff8a80' : '#82b1ff'} background={null} font="700 48px Inter Variable, sans-serif" />
          </group>
        ))}
        {/* Yoke */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.5, 0.18, 1.9]} />
          <meshStandardMaterial color="#3a4256" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.5, s * 0.95]}>
            <boxGeometry args={[0.5, 0.75, 0.16]} />
            <meshStandardMaterial color="#3a4256" />
          </mesh>
        ))}
      </group>
      {/* Field arrows between the poles */}
      {B > 0.02 &&
        [-0.08, 0.08].map((y) => (
          <mesh key={y} position={[longit ? 0 : -0.12, 0.75 + y, 0]} rotation-x={longit ? 0 : Math.PI / 2} rotation-z={longit ? -Math.PI / 2 : 0}>
            <cylinderGeometry args={[0.008, 0.008, 0.38, 6]} />
            <meshBasicMaterial color="#7aa2ff" transparent opacity={Math.min(1, B)} />
          </mesh>
        ))}
      {/* Cadmium lamp */}
      <mesh position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.06, 0.22, 8, 16]} />
        <meshStandardMaterial ref={glow} color="#ff5a4a" emissive="#ff2a1a" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
        <meshStandardMaterial color="#444b5c" />
      </mesh>
      <Label3D lines={[labels.lamp]} position={[0, 1.42, 0]} height={0.18} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      {/* Light beam to the lens and spectrometer */}
      <mesh position={[0.95, 0.75, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
        <meshBasicMaterial color="#ff4a3a" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0.7, 0.75, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 32]} />
        <meshStandardMaterial color="#cfe3ff" transparent opacity={0.5} />
      </mesh>
      {/* Spectrometer (etalon + camera) */}
      <mesh position={[1.35, 0.75, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.13, 0.13, 0.55, 24]} />
        <meshStandardMaterial color="#2b2f3a" metalness={0.5} />
      </mesh>
      {/* Detector screen, facing the viewer: wavelength runs left → right */}
      <mesh position={[DET_X, 0.55, -0.35]}>
        <boxGeometry args={[0.08, 1.1, 0.08]} />
        <meshStandardMaterial color="#3a4256" />
      </mesh>
      <group position={[DET_X, 1.4, -0.3]}>
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[1.8, 1.0, 0.05]} />
          <meshStandardMaterial color="#2b2f3a" />
        </mesh>
        <mesh>
          <planeGeometry args={[1.66, 0.86]} />
          <meshBasicMaterial color="#05070c" />
        </mesh>
        {lines.map((l) => (
          <mesh key={l.kind} position={[l.shift * 1e12 * PM, 0, 0.002]}>
            <planeGeometry args={[0.04, 0.7]} />
            <meshBasicMaterial color={l.kind === 'pi' ? '#ff3b2f' : '#ff7a4a'} transparent opacity={0.25 + 0.75 * (l.intensity / maxI)} />
          </mesh>
        ))}
        <Label3D lines={[labels.detector]} position={[0, 0.66, 0.02]} height={0.17} color="#e8ecf3" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      </group>
      <mesh position={[(1.62 + DET_X) / 2, 0.75, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, DET_X - 1.62, 8]} />
        <meshStandardMaterial color="#444b5c" />
      </mesh>
      <Label3D lines={[labels.magnet, labels.field]} position={[-1.15, 1.35, 0]} height={0.3} />
    </>
  )
}
