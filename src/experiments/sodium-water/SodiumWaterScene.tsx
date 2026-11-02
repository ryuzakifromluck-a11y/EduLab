import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ReactionEffect } from '../../components/chemistry/ReactionEffect'
import { Label3D } from '../../components/lab/Label3D'
import { ALKALI } from '../../engines/sodiumWater'
import { Bench, LabLights } from '../shared/three'
import { BEAKER_RADIUS, type SodiumWaterController } from './useSodiumWater'

/** Scene units per cm. */
const S = 0.25
const R = BEAKER_RADIUS * S
const BEAKER_H = 9.5 * S
/** The metal is drawn larger than life so a 3 mm piece is visible. */
const METAL_ZOOM = 1.8
const SPATULA = new THREE.Vector3(0.15, BEAKER_H + 0.55, 0)
const FIZZ = 36
const TRAIL = 40

const waterHeight = (mL: number) => (mL / (Math.PI * BEAKER_RADIUS * BEAKER_RADIUS)) * S

/** A beaker of water; the alkali metal falls from a spatula, darts about, fizzes and may burn. */
export function SodiumWaterScene({ ctl, labels }: { ctl: SodiumWaterController; labels: { temp: string; metal: string } }) {
  const metal = useRef<THREE.Mesh>(null)
  const metalMat = useRef<THREE.MeshStandardMaterial>(null)
  const waterMat = useRef<THREE.MeshStandardMaterial>(null)
  const effects = useRef<THREE.Group>(null)
  const fizz = useRef<THREE.InstancedMesh>(null)
  const trail = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const target = useMemo(() => new THREE.Color(), [])
  const particles = useMemo(
    () => ({
      fizz: Array.from({ length: FIZZ }, () => ({ x: 0, z: 0, vx: 0, vz: 0, age: Infinity })),
      trail: Array.from({ length: TRAIL }, () => ({ x: 0, z: 0, age: Infinity })),
      nextFizz: 0,
      nextTrail: 0,
    }),
    [],
  )
  const surface = waterHeight(ctl.waterVolume)
  const pos = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1) * (ctl.running ? ctl.speed : 0)
    const s = ctl.sim.current
    const r = Math.max(0.012, s.radius * S * METAL_ZOOM)
    // Metal position: on the spatula, falling, or floating on the surface.
    if (ctl.phase === 'ready') pos.copy(SPATULA)
    else if (ctl.phase === 'falling') {
      const k = Math.min(1, ctl.fallProgress())
      pos.set(SPATULA.x * (1 - k), SPATULA.y + (surface + r * 0.4 - SPATULA.y) * k * k, 0)
    } else pos.set(s.x * S, surface + r * 0.35, s.y * S)
    if (metal.current) {
      metal.current.position.copy(pos)
      metal.current.scale.setScalar(ctl.phase === 'done' ? 0.0001 : r)
    }
    if (metalMat.current) {
      // A molten sodium or potassium ball is shiny and silvery; solid metal is dull.
      metalMat.current.roughness = ctl.molten ? 0.15 : 0.6
      metalMat.current.metalness = ctl.molten ? 0.45 : 0.25
    }
    if (effects.current) effects.current.position.set(pos.x, surface, pos.z)
    if (waterMat.current) {
      const c = ctl.color
      target.setRGB(c.r / 255, c.g / 255, c.b / 255, THREE.SRGBColorSpace)
      waterMat.current.color.lerp(target, 0.05)
      waterMat.current.opacity += (Math.max(0.4, c.a * 0.8) - waterMat.current.opacity) * 0.05
    }
    // Fizz: tiny hydrogen bubbles bursting around the piece.
    const reacting = ctl.phase === 'reacting'
    if (reacting && dt > 0) {
      particles.nextFizz -= dt * (20 + 4000 * ctl.rate)
      while (particles.nextFizz < 0) {
        particles.nextFizz += 1
        const p = particles.fizz.find((q) => q.age > 0.5)
        if (!p) break
        const a = Math.random() * Math.PI * 2
        const sp = 0.1 + Math.random() * 0.3
        Object.assign(p, { x: pos.x, z: pos.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, age: 0 })
      }
      particles.nextTrail -= dt * 6
      if (particles.nextTrail < 0 && ctl.phenolphthalein) {
        particles.nextTrail = 1
        const p = particles.trail.reduce((a, b) => (b.age > a.age ? b : a))
        Object.assign(p, { x: pos.x, z: pos.z, age: 0 })
      }
    }
    if (fizz.current) {
      particles.fizz.forEach((p, i) => {
        p.age += dt
        p.x += p.vx * dt
        p.z += p.vz * dt
        const alive = p.age < 0.5
        dummy.position.set(p.x, surface + 0.01 + p.age * 0.08, p.z)
        dummy.scale.setScalar(alive ? 0.02 * (1 - p.age * 1.6) + 0.004 : 0.0001)
        dummy.updateMatrix()
        fizz.current!.setMatrixAt(i, dummy.matrix)
      })
      fizz.current.instanceMatrix.needsUpdate = true
    }
    if (trail.current) {
      particles.trail.forEach((p, i) => {
        p.age += dt
        const life = p.age / 4
        dummy.position.set(p.x, surface - 0.05 - life * 0.25, p.z)
        dummy.scale.set(0.05 + life * 0.25, 0.02 + life * 0.08, 0.05 + life * 0.25)
        if (life >= 1 || !ctl.phenolphthalein) dummy.scale.setScalar(0.0001)
        dummy.updateMatrix()
        trail.current!.setMatrixAt(i, dummy.matrix)
      })
      trail.current.instanceMatrix.needsUpdate = true
    }
  })

  const flameColor = ALKALI[ctl.metal].flame
  const flameEffect = flameColor === 'lilac' ? 'potassium-fire' : 'sodium-fire'
  const reacting = ctl.phase === 'reacting'

  return (
    <>
      <LabLights />
      <Bench width={5} depth={3} />
      {/* Beaker */}
      <mesh position={[0, BEAKER_H / 2, 0]}>
        <cylinderGeometry args={[R + 0.02, R + 0.02, BEAKER_H, 48, 1, true]} />
        <meshStandardMaterial color="#cfe0ff" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[R + 0.02, R + 0.02, 0.02, 48]} />
        <meshStandardMaterial color="#cfe0ff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* Water */}
      <mesh position={[0, surface / 2 + 0.02, 0]} renderOrder={1}>
        <cylinderGeometry args={[R - 0.01, R - 0.01, surface, 48]} />
        <meshStandardMaterial ref={waterMat} color="#d6e4f5" transparent opacity={0.45} depthWrite={false} roughness={0.15} />
      </mesh>
      {/* Pink streaks of NaOH (phenolphthalein) left behind the moving piece */}
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} renderOrder={2}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color="#e0368f" transparent opacity={0.35} depthWrite={false} />
      </instancedMesh>
      {/* Thermometer */}
      <group position={[-R * 0.62, 0, -R * 0.45]} rotation-z={0.12}>
        <mesh position={[0, BEAKER_H * 0.62, 0]}>
          <cylinderGeometry args={[0.035, 0.035, BEAKER_H * 1.2, 12]} />
          <meshStandardMaterial color="#e8f0ff" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#d6332a" />
        </mesh>
      </group>
      <Label3D lines={[labels.temp]} position={[-R - 0.55, BEAKER_H * 0.95, 0]} height={0.24} />
      {/* Spatula */}
      {ctl.phase === 'ready' && (
        <mesh position={[SPATULA.x + 0.6, SPATULA.y - 0.04, 0]} rotation-z={-0.05}>
          <boxGeometry args={[1.3, 0.02, 0.12]} />
          <meshStandardMaterial color="#b9c0cc" metalness={0.8} roughness={0.3} />
        </mesh>
      )}
      {/* The metal piece */}
      <mesh ref={metal} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial ref={metalMat} color="#e6e9ee" emissive="#5a5f68" emissiveIntensity={0.35} metalness={0.25} roughness={0.6} />
      </mesh>
      <Label3D lines={[labels.metal]} position={[R + 0.6, BEAKER_H * 0.95, 0]} height={0.24} />
      {/* Hydrogen fizz */}
      <instancedMesh ref={fizz} args={[undefined, undefined, FIZZ]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
      </instancedMesh>
      {/* Steam, smoke and flame follow the piece */}
      <group ref={effects}>
        <ReactionEffect effect="vapor" active={reacting} position={[0, 0.35, 0]} height={0.7} opacity={0.6} playing={ctl.running} />
        <ReactionEffect effect="smoke" active={reacting && ctl.burning} position={[0, 0.75, 0]} height={1} opacity={0.5} color="#e9e9e9" playing={ctl.running} />
        <ReactionEffect effect={flameEffect} active={reacting && ctl.burning} position={[0, 0.32, 0]} height={0.75} playing={ctl.running} />
        {reacting && ctl.burning && <pointLight position={[0, 0.25, 0]} intensity={3} distance={2.5} color={flameColor === 'lilac' ? '#c58cff' : '#ffb347'} />}
      </group>
    </>
  )
}
