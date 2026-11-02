import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { METAL_IDS } from '../../engines/flameTest'
import { Label3D } from '../../components/lab/Label3D'
import { ChemSubstance } from '../../components/chemistry/ChemSubstance'
import { ReactionEffect } from '../../components/chemistry/ReactionEffect'
import { Bench, LabLights } from '../shared/three'
import type { FlameTestController } from './useFlameTest'

const BURNER_X = 0
const FLAME_Y = 1.25
const REST = new THREE.Vector3(-1.2, 1.2, 0.9)
const IN_FLAME = new THREE.Vector3(BURNER_X, FLAME_Y + 0.35, 0)
const SALT_COLOR: Record<string, string> = { Cu: '#3fa9a1' }
/** Reagent block from the substance catalog for each salt. */
const SALT_BLOCK: Record<string, string> = { Na: 'nacl', K: 'kcl', Ca: 'cacl2', Ba: 'bacl2', Cu: 'cucl2', Sr: 'srcl2' }

/** Bunsen burner with a nichrome wire loop that moves between the salt dishes and the flame. */
export function FlameTestScene({ ctl, labels }: { ctl: FlameTestController; labels: { hcl: string; unknown: string; sample: string } }) {
  const outer = useRef<THREE.Mesh>(null)
  const outerMat = useRef<THREE.MeshBasicMaterial>(null)
  const inner = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const wire = useRef<THREE.Group>(null)
  const loop = useRef<THREE.MeshStandardMaterial>(null)
  const target = useMemo(() => new THREE.Color(), [])
  const pos = useMemo(() => REST.clone(), [])
  const flame = useRef<THREE.Group>(null)
  const lastDip = useRef({ dips: ctl.dips, at: -Infinity })
  const sparks = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const c = ctl.color.rgb
    target.setRGB(c.r / 255, c.g / 255, c.b / 255, THREE.SRGBColorSpace)
    if (outerMat.current) {
      outerMat.current.color.lerp(target, 0.15)
      outerMat.current.opacity = 0.45 + 0.45 * ctl.color.strength
    }
    if (outer.current) {
      const f = 1 + Math.sin(t * 17) * 0.04 + Math.sin(t * 29) * 0.03
      outer.current.scale.set(1 + ctl.color.strength * 0.25, f * (1 + ctl.color.strength * 0.3), 1 + ctl.color.strength * 0.25)
    }
    if (inner.current) inner.current.scale.y = 1 + Math.sin(t * 23) * 0.05
    if (light.current) {
      light.current.color.copy(outerMat.current?.color ?? target)
      light.current.intensity = 2 + 6 * ctl.color.strength
    }
    if (wire.current) {
      pos.lerp(ctl.inFlame ? IN_FLAME : REST, 0.08)
      wire.current.position.copy(pos)
    }
    if (loop.current) loop.current.emissiveIntensity = ctl.inFlame && ctl.lit ? 0.9 : 0
    // The flame grows when the burner is lit and shrinks away when it is not.
    if (flame.current) {
      const target = ctl.lit ? 1 : 0.0001
      flame.current.scale.y += (target - flame.current.scale.y) * 0.15
      flame.current.visible = flame.current.scale.y > 0.01
    }
    if (light.current && !ctl.lit) light.current.intensity = 0
    // Sparks for a moment after each dip, where the salt meets the flame.
    if (lastDip.current.dips !== ctl.dips) lastDip.current = { dips: ctl.dips, at: t }
    if (sparks.current) {
      sparks.current.visible = ctl.lit && t - lastDip.current.at < 1.2
      sparks.current.position.copy(pos)
    }
  })

  const dishes = [...METAL_IDS, 'unknown'] as const
  return (
    <>
      <LabLights />
      <Bench width={5} depth={3} />
      {/* Bunsen burner */}
      <mesh position={[BURNER_X, 0.04, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.08, 32]} />
        <meshStandardMaterial color="#3c4252" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[BURNER_X, 0.5, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.9, 24]} />
        <meshStandardMaterial color="#b9c0cc" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[BURNER_X, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.12, 24]} />
        <meshStandardMaterial color="#8f97a6" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[BURNER_X + 0.4, 0.12, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
        <meshStandardMaterial color="#d14b3a" />
      </mesh>
      {/* Flame: a bright inner cone inside the coloured outer flame */}
      <group ref={flame} position={[BURNER_X, 0.95, 0]}>
        <mesh ref={outer} position={[0, 0.45, 0]}>
          <coneGeometry args={[0.16, 0.9, 32, 1, true]} />
          <meshBasicMaterial ref={outerMat} color="#5a82ff" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh ref={inner} position={[0, 0.17, 0]}>
          <coneGeometry args={[0.08, 0.32, 24, 1, true]} />
          <meshBasicMaterial color="#6f8fff" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[BURNER_X, 1.4, 0.3]} distance={4} decay={2} />
      <group ref={sparks} visible={false}>
        <ReactionEffect effect="spark" height={0.45} restartKey={ctl.dips} />
      </group>
      {/* Cobalt-blue glass in front of the flame */}
      {ctl.cobaltGlass && (
        <mesh position={[BURNER_X, 1.35, 0.7]}>
          <boxGeometry args={[0.9, 0.9, 0.03]} />
          <meshStandardMaterial color="#1f3fbf" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      {/* Wire holder with nichrome loop */}
      <group ref={wire}>
        <mesh position={[-0.55, 0.12, 0.25]} rotation={[0, 0.4, Math.PI / 2 - 0.25]}>
          <cylinderGeometry args={[0.035, 0.035, 0.6, 12]} />
          <meshStandardMaterial color="#6b4b2a" />
        </mesh>
        <mesh position={[-0.12, 0.02, 0.06]} rotation={[0, 0.4, Math.PI / 2 - 0.2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.45, 8]} />
          <meshStandardMaterial color="#bfc4cc" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.05, 0.009, 8, 24]} />
          <meshStandardMaterial ref={loop} color="#c9ced6" emissive="#ff7a2a" emissiveIntensity={0} metalness={0.8} />
        </mesh>
      </group>
      {/* Watch glasses with salts and the HCl beaker */}
      {dishes.map((id, i) => {
        const x = -2.1 + i * 0.42
        const active = (ctl.sample === id) as boolean
        return (
          <group key={id} position={[x, 0.02, 1.0]}>
            <mesh>
              <cylinderGeometry args={[0.17, 0.12, 0.04, 24]} />
              <meshStandardMaterial color="#d9e2ee" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0.04, 0]} scale={[1, 0.45, 1]}>
              <sphereGeometry args={[0.1, 16, 10]} />
              <meshStandardMaterial color={id === 'unknown' ? '#e6e1d3' : (SALT_COLOR[id] ?? '#f3f4f6')} roughness={0.9} />
            </mesh>
            {id === 'unknown' ? (
              <Label3D lines={['?']} position={[0, 0.3, 0.05]} height={0.12} color={active ? '#2ccfb5' : '#e8ecf5'} background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
            ) : (
              <ChemSubstance substance={SALT_BLOCK[id]} size={active ? 0.3 : 0.24} position={[0, 0.32, 0.05]} />
            )}
          </group>
        )
      })}
      <group position={[1.4, 0, 0.6]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.25, 0.23, 0.6, 32, 1, true]} />
          <meshStandardMaterial color="#a9bad6" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.23, 0.22, 0.38, 32]} />
          <meshStandardMaterial color="#e8f0ff" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <Label3D lines={[labels.hcl]} position={[0, 0.85, 0]} height={0.16} color="#e8ecf5" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      </group>
      <Label3D lines={[labels.sample]} position={[BURNER_X + 0.9, 2.15, 0]} height={0.26} />
    </>
  )
}
