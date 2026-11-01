import { useMemo } from 'react'
import * as THREE from 'three'
import { HYDROMETER, floats, submergedFraction } from '../../engines/densityMeasurement'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { START_VOLUME, type DensityController, type Place } from './useDensityMeasurement'

const BAL: [number, number, number] = [-1.25, 0, 0.1]
const BAL_TOP = 0.36
const CYL_X = 0.55
const CYL_R = 0.24
/** World units per mL in the graduated cylinder (0–100 mL). */
const ML = 0.0135
const CYL_BASE = 0.08
const CAN_X = 0.35
const CATCH_X = 1.25

const glass = <meshStandardMaterial color="#d8e6f5" transparent opacity={0.22} side={THREE.DoubleSide} roughness={0.1} />

function Cylinder({ x, level, color, label }: { x: number; level: number; color: string; label: string }) {
  const ticks = useMemo(() => Array.from({ length: 11 }, (_, i) => i * 10), [])
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[CYL_R + 0.1, CYL_R + 0.12, 0.06, 32]} />
        <meshStandardMaterial color="#d8e6f5" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, CYL_BASE + 0.75, 0]}>
        <cylinderGeometry args={[CYL_R, CYL_R, 1.5, 40, 1, true]} />
        {glass}
      </mesh>
      {level > 0.2 && (
        <mesh position={[0, CYL_BASE + (level * ML) / 2, 0]}>
          <cylinderGeometry args={[CYL_R - 0.01, CYL_R - 0.01, level * ML, 40]} />
          <meshStandardMaterial color={color} transparent opacity={0.45} />
        </mesh>
      )}
      {ticks.map((ml) => (
        <mesh key={ml} position={[0, CYL_BASE + ml * ML, CYL_R + 0.002]}>
          <boxGeometry args={[ml % 50 === 0 ? 0.12 : 0.07, 0.006, 0.004]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
      {[50, 100].map((ml) => (
        <Label3D key={ml} lines={[`${ml}`]} position={[CYL_R + 0.12, CYL_BASE + ml * ML, CYL_R]} height={0.1} color="#e8ecf3" background="rgba(0,0,0,0.45)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      ))}
      <Label3D lines={[label]} position={[0, CYL_BASE + 1.72, 0]} height={0.26} />
    </group>
  )
}

function Balance({ reading, title }: { reading: string; title: string }) {
  return (
    <group position={BAL}>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.9, 0.28, 0.75]} />
        <meshStandardMaterial color="#e9edf3" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, -0.05]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 40]} />
        <meshStandardMaterial color="#c0c6d2" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.16, 0.38]}>
        <boxGeometry args={[0.5, 0.14, 0.01]} />
        <meshStandardMaterial color="#0f1a14" />
      </mesh>
      <Label3D lines={[title, reading]} position={[0, 0.72, 0.3]} height={0.3} />
    </group>
  )
}

function SampleMesh({ c }: { c: DensityController }) {
  const s = c.solid
  const size = Math.cbrt(s.volume) * 0.075
  if (s.dims) {
    const [l, w, h] = s.dims
    const k = size / Math.cbrt(l * w * h)
    return (
      <mesh position={[0, (h * k) / 2, 0]} castShadow>
        <boxGeometry args={[l * k, h * k, w * k]} />
        <meshStandardMaterial color={s.color} metalness={s.id === 'wood' ? 0 : 0.6} roughness={0.4} />
      </mesh>
    )
  }
  return (
    <mesh position={[0, size * 0.55, 0]} scale={[1, 0.8, 0.9]} castShadow>
      {s.id === 'stone' ? <dodecahedronGeometry args={[size * 0.62, 0]} /> : <icosahedronGeometry args={[size * 0.6, 0]} />}
      <meshStandardMaterial color={s.color} roughness={s.id === 'glass' ? 0.05 : 0.9} transparent={s.id === 'glass'} opacity={s.id === 'glass' ? 0.7 : 1} flatShading />
    </mesh>
  )
}

function placePos(c: DensityController, p: Place): [number, number, number] {
  if (p === 'balance') return [BAL[0], BAL_TOP, BAL[2] - 0.05]
  if (p === 'water') {
    const x = c.volumeMethod === 'overflow' ? CAN_X : CYL_X
    const surface = c.volumeMethod === 'overflow' ? 0.9 : CYL_BASE + START_VOLUME * ML
    const size = Math.cbrt(c.solid.volume) * 0.075
    const sinks = !floats(c.solid.density, c.rhoWater) || c.pushUnder
    const frac = sinks ? 1 : submergedFraction(c.solid.density, c.rhoWater)
    return [x, sinks ? CYL_BASE + 0.05 + (c.volumeMethod === 'overflow' ? 0.1 : 0) : surface - frac * size, 0]
  }
  return [-0.35, 0, 0.55]
}

export function DensityMeasurementScene({ c, labels }: { c: DensityController; labels: { balance: string; reading: string; cylinder: string; caught: string; hydrometer: string } }) {
  if (c.mode === 'liquid') return <LiquidScene c={c} labels={labels} />
  const a = placePos(c, c.from)
  const b = placePos(c, c.place)
  const u = c.anim
  const arc = Math.sin(u * Math.PI) * 0.9
  const pos: [number, number, number] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + arc, a[2] + (b[2] - a[2]) * u]

  return (
    <>
      <LabLights />
      <Bench width={4.4} depth={2.4} />
      <Balance reading={labels.balance} title={labels.reading} />
      {c.volumeMethod === 'overflow' ? (
        <>
          {/* Overflow (Eureka) can full to the spout, catch cylinder beside it */}
          <mesh position={[CAN_X, 0.5, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 1.0, 40, 1, true]} />
            {glass}
          </mesh>
          <mesh position={[CAN_X, 0.45, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.9, 40]} />
            <meshStandardMaterial color="#5aa9e6" transparent opacity={0.4} />
          </mesh>
          <mesh position={[CAN_X + 0.42, 0.86, 0]} rotation-z={-Math.PI / 2.6}>
            <cylinderGeometry args={[0.035, 0.035, 0.32, 12, 1, true]} />
            {glass}
          </mesh>
          <Cylinder x={CATCH_X} level={c.cylinderLevel} color="#5aa9e6" label={labels.caught} />
        </>
      ) : c.volumeMethod === 'cylinder' ? (
        <Cylinder x={CYL_X} level={c.cylinderLevel} color="#5aa9e6" label={labels.cylinder} />
      ) : (
        // Ruler beside the sample on the bench
        <group position={[-0.35, 0.005, 0.95]}>
          <mesh>
            <boxGeometry args={[1.2, 0.01, 0.14]} />
            <meshStandardMaterial color="#f3e7c4" />
          </mesh>
          {Array.from({ length: 13 }, (_, i) => (
            <mesh key={i} position={[-0.6 + i * 0.1, 0.008, -0.04]}>
              <boxGeometry args={[0.006, 0.004, 0.06]} />
              <meshBasicMaterial color="#222" />
            </mesh>
          ))}
          <Label3D lines={[labels.cylinder]} position={[0, 0.25, 0]} height={0.2} />
        </group>
      )}
      <group position={pos}>
        <SampleMesh c={c} />
      </group>
      {c.pushUnder && c.place === 'water' && floats(c.solid.density, c.rhoWater) && (
        <mesh position={[pos[0], pos[1] + 0.7, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 1.2, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      )}
    </>
  )
}

function LiquidScene({ c, labels }: { c: DensityController; labels: { balance: string; reading: string; hydrometer: string } }) {
  const fill = c.bottle === 'empty' ? null : c.bottle === 'water' ? '#5aa9e6' : c.liquid.color
  const depth = c.hydroDepth
  // Hydrometer: 1 cm of stem = 0.05 units. Jar surface at y = 1.3.
  const S = 0.05
  const surface = 1.3
  const bulbTop = depth === null ? (c.rhoLiquid > 1000 ? surface + 0.15 : 0.35) : surface - depth * S
  return (
    <>
      <LabLights />
      <Bench width={4.4} depth={2.4} />
      {c.liquidMethod === 'pycnometer' ? (
        <>
          <Balance reading={labels.balance} title={labels.reading} />
          {/* Density bottle on the pan */}
          <group position={[BAL[0], BAL_TOP, BAL[2] - 0.05]}>
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.2, 32, 24]} />
              {glass}
            </mesh>
            {fill && (
              <mesh position={[0, 0.19, 0]}>
                <sphereGeometry args={[0.185, 32, 24]} />
                <meshStandardMaterial color={fill} transparent opacity={0.6} />
              </mesh>
            )}
            <mesh position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 0.22, 16]} />
              <meshStandardMaterial color="#d8e6f5" transparent opacity={0.5} />
            </mesh>
          </group>
          {/* Beakers of water and the sample liquid */}
          {[
            { x: 0.3, color: '#5aa9e6' },
            { x: 1.1, color: c.liquid.color },
          ].map((bk) => (
            <group key={bk.x} position={[bk.x, 0, 0]}>
              <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.8, 40, 1, true]} />
                {glass}
              </mesh>
              <mesh position={[0, 0.27, 0]}>
                <cylinderGeometry args={[0.29, 0.29, 0.54, 40]} />
                <meshStandardMaterial color={bk.color} transparent opacity={0.55} />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <>
          {/* Tall jar with the liquid and a floating hydrometer */}
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 1.7, 40, 1, true]} />
            {glass}
          </mesh>
          <mesh position={[0, surface / 2, 0]}>
            <cylinderGeometry args={[0.31, 0.31, surface, 40]} />
            <meshStandardMaterial color={c.liquid.color} transparent opacity={0.45} />
          </mesh>
          <group position={[0, bulbTop, 0]}>
            <mesh position={[0, -0.3, 0]}>
              <capsuleGeometry args={[0.08, 0.4, 8, 16]} />
              <meshStandardMaterial color="#eef3f8" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, -0.6, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#555" metalness={0.6} />
            </mesh>
            <mesh position={[0, (HYDROMETER.stemLength * S) / 2, 0]}>
              <cylinderGeometry args={[0.025, 0.025, HYDROMETER.stemLength * S, 12]} />
              <meshStandardMaterial color="#f7f3e3" />
            </mesh>
          </group>
          <Label3D lines={[labels.hydrometer]} position={[0.85, 1.6, 0]} height={0.3} />
        </>
      )}
    </>
  )
}
